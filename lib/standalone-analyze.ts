import path from 'path';
import { Readable } from 'node:stream';
import { parse as parseCsvStream } from 'csv-parse';
import { parse as parseCsvSync } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { getFileBuffer, getFileBufferFromBlobPathname } from './standalone-upload';

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'arcee-ai/trinity-large-preview:free';

type OpenRouterChatEnvelope = {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string; code?: number | string };
};

function openRouterAppHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  const referer =
    process.env.OPENROUTER_HTTP_REFERER ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  if (referer) {
    headers['HTTP-Referer'] = referer;
  }
  headers['X-Title'] = process.env.OPENROUTER_APP_TITLE || 'DatRep';
  return headers;
}

function parseOpenRouterBody(
  raw: string,
  httpStatus: number
): { ok: true; data: OpenRouterChatEnvelope } | { ok: false; message: string } {
  const cleaned = raw.replace(/^\uFEFF/, '').trim();
  if (!cleaned) {
    return {
      ok: false,
      message: `OpenRouter returned an empty body (HTTP ${httpStatus}). Check OPENROUTER_API_KEY, OPENROUTER_MODEL, and OpenRouter status.`,
    };
  }
  try {
    return { ok: true, data: JSON.parse(cleaned) as OpenRouterChatEnvelope };
  } catch {
    const snippet = cleaned.replace(/\s+/g, ' ').slice(0, 480);
    return {
      ok: false,
      message: `OpenRouter returned non-JSON (HTTP ${httpStatus}): ${snippet}`,
    };
  }
}

interface DataSummary {
  /** When true, statistics were computed on the first N rows only (large file cap). */
  row_sample_capped?: boolean;
  rows: number;
  columns: number;
  column_names: string[];
  data_types: Record<string, string>;
  missing_values: Record<string, number>;
  statistics?: Record<string, unknown>;
}

interface ColumnStats {
  sum?: number;
  min?: number;
  max?: number;
  avg?: number;
  count: number;
  pct_of_total?: number;
  value_counts?: Record<string, number>;
}

function computeStatistics(
  rows: Record<string, unknown>[],
  columns: string[],
  dataTypes: Record<string, string>
): Record<string, ColumnStats> {
  const stats: Record<string, ColumnStats> = {};
  for (const col of columns) {
    const values = rows.map((r) => r[col]).filter((v) => v != null && v !== '');
    const count = values.length;
    if (dataTypes[col] === 'number') {
      const nums = values
        .map((v) => {
          if (typeof v === 'number') return v;
          return parseFloat(String(v).replace(/,/g, ''));
        })
        .filter((n) => !Number.isNaN(n));
      if (nums.length > 0) {
        const sum = nums.reduce((a, b) => a + b, 0);
        const min = Math.min(...nums);
        const max = Math.max(...nums);
        const avg = sum / nums.length;
        stats[col] = { sum, min, max, avg, count };
      } else {
        stats[col] = { count };
      }
    } else {
      const counts: Record<string, number> = {};
      for (const v of values) {
        const key = String(v);
        counts[key] = (counts[key] ?? 0) + 1;
      }
      stats[col] = { count, value_counts: counts };
    }
  }
  // Compute percentages for numeric columns that look like revenue/amounts
  const numericCols = columns.filter((c) => stats[c]?.sum != null);
  const grandTotal = numericCols.reduce((acc, c) => acc + (stats[c]?.sum ?? 0), 0);
  if (grandTotal > 0) {
    for (const col of numericCols) {
      const s = stats[col];
      if (s?.sum != null) {
        s.pct_of_total = (s.sum / grandTotal) * 100;
      }
    }
  }
  return stats;
}

const LARGE_CSV_BYTES = 1_000_000;
const MAX_ROWS_FOR_STATS = 60_000;

const csvParserOptions = {
  columns: true as const,
  skip_empty_lines: true,
  relax_column_count: true,
  relax_quotes: true,
  bom: true,
  trim: true,
};

async function parseCsvBufferWithRowCap(buffer: Buffer): Promise<{
  rows: Record<string, unknown>[];
  capped: boolean;
}> {
  const parser = parseCsvStream(csvParserOptions);
  const source = Readable.from(buffer);
  source.pipe(parser);
  const rows: Record<string, unknown>[] = [];
  try {
    for await (const row of parser) {
      rows.push(row as Record<string, unknown>);
      if (rows.length >= MAX_ROWS_FOR_STATS) {
        parser.destroy();
        source.destroy();
        return { rows, capped: true };
      }
    }
    return { rows, capped: false };
  } catch {
    if (rows.length >= MAX_ROWS_FOR_STATS) {
      return { rows, capped: true };
    }
    throw new Error('Failed to parse CSV stream');
  }
}

async function parseFileFromBuffer(
  buffer: Buffer,
  filename: string
): Promise<{ data_summary: DataSummary; sample_data: string; computed_stats: Record<string, ColumnStats> }> {
  const ext = path.extname(filename).toLowerCase();
  let rows: Record<string, unknown>[] = [];
  let columns: string[] = [];
  let rowSampleCapped = false;

  if (ext === '.csv') {
    if (buffer.byteLength >= LARGE_CSV_BYTES) {
      const { rows: streamed, capped } = await parseCsvBufferWithRowCap(buffer);
      rows = streamed;
      rowSampleCapped = capped;
    } else {
      const content = buffer.toString('utf-8');
      const parsed = parseCsvSync(content, csvParserOptions) as Record<string, unknown>[];
      rows = parsed;
    }
    columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  } else if (ext === '.xlsx' || ext === '.xls') {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    } catch (e) {
      throw new Error(
        `Could not read Excel file: ${e instanceof Error ? e.message : 'unknown error'}`
      );
    }
    if (!workbook.SheetNames?.length) {
      throw new Error('Excel file has no worksheets');
    }
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) {
      throw new Error('Could not read the first worksheet');
    }
    // raw:false runs number/date formatters and can throw on odd Excel exports; raw:true is safer.
    let data: Record<string, unknown>[];
    try {
      data = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true }) as Record<string, unknown>[];
    } catch (e) {
      throw new Error(
        `Could not convert Excel sheet to rows: ${e instanceof Error ? e.message : 'unknown error'}`
      );
    }
    if (data.length > MAX_ROWS_FOR_STATS) {
      rows = data.slice(0, MAX_ROWS_FOR_STATS);
      rowSampleCapped = true;
    } else {
      rows = data;
    }
    columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  } else {
    throw new Error(`Unsupported format: ${ext}`);
  }

  const dataTypes: Record<string, string> = {};
  const missingValues: Record<string, number> = {};
  for (const col of columns) {
    const values = rows.map((r) => r[col]);
    const sample = values.find((v) => v != null && v !== '');
    dataTypes[col] = typeof sample === 'number' ? 'number' : 'string';
    missingValues[col] = values.filter((v) => v == null || v === '').length;
  }

  const computed_stats = computeStatistics(rows, columns, dataTypes);

  const sampleRows = rows.slice(0, 15);
  const sample_data = sampleRows
    .map((r) => columns.map((c) => String(r[c] ?? '')).join(', '))
    .join('\n');

  const data_summary: DataSummary = {
    ...(rowSampleCapped ? { row_sample_capped: true } : {}),
    rows: rows.length,
    columns: columns.length,
    column_names: columns,
    data_types: dataTypes,
    missing_values: missingValues,
    statistics: computed_stats,
  };

  return { data_summary, sample_data, computed_stats };
}

function formatStatsForPrompt(stats: Record<string, ColumnStats>): string {
  const lines: string[] = [];
  for (const [col, s] of Object.entries(stats)) {
    if (s.sum != null && s.min != null && s.max != null) {
      const pct = s.pct_of_total != null ? ` (${s.pct_of_total.toFixed(1)}% of total)` : '';
      lines.push(`- ${col}: sum=${s.sum.toLocaleString()}, min=${s.min}, max=${s.max}, avg=${s.avg?.toFixed(2)}${pct}`);
    } else if (s.value_counts) {
      const top = Object.entries(s.value_counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      lines.push(`- ${col}: top values: ${top}`);
    }
  }
  return lines.join('\n');
}

function buildInsightsPrompt(
  data_summary: DataSummary,
  sample_data: string,
  computed_stats: Record<string, ColumnStats>
): string {
  const statsBlock = formatStatsForPrompt(computed_stats);
  const capNote = data_summary.row_sample_capped
    ? `\nNOTE: This file is large. Statistics and sample reflect the first ${data_summary.rows.toLocaleString()} rows only; the file may contain more rows.\n`
    : '';
  return `
You are a brilliant and enthusiastic data analyst who loves discovering hidden patterns in data! 🎯

Your mission: Analyze this dataset and provide EXCITING, SPECIFIC insights that will blow the user's mind!

CRITICAL: You MUST use ONLY the actual numbers provided below. NEVER use placeholders like $X, XX, Y%, $A, $B, XXXX, etc. Every number in your insights MUST come from the Pre-Computed Statistics or Sample Data sections.
${capNote}
Dataset Summary:
- Rows: ${data_summary.rows}
- Columns: ${data_summary.columns}
- Column names: ${JSON.stringify(data_summary.column_names)}
- Data types: ${JSON.stringify(data_summary.data_types)}

Pre-Computed Statistics (USE THESE EXACT NUMBERS IN YOUR INSIGHTS):
${statsBlock}

Sample Data (first 15 rows):
${sample_data}

Now, let's dive deep! Provide 6-9 focused insights about THIS specific dataset. Rank them by importance (most impactful first). Be:
✨ SPECIFIC - Use ONLY the actual numbers from the Pre-Computed Statistics above (e.g. $50,000 not $X, 83.3% not Y%)
🎉 EXCITING - Make it fun and engaging with emojis and personality
💡 DETAILED - Show the exact patterns with real numbers

Format as JSON:
{
    "insights": [
        {
            "title": "🎯 Specific insight with emoji",
            "description": "Detailed description with EXACT numbers from the statistics above - e.g. 'Gross Sales is $50,000 (83.3% of total)'",
            "business_impact": "What this means for business decisions",
            "confidence": "high/medium/low",
            "fun_fact": "One surprising detail with specific numbers from the data"
        }
    ],
    "key_findings": ["Finding 1 with specific numbers", "Finding 2 with specific numbers"],
    "recommendations": ["Actionable recommendation 1", "Actionable recommendation 2"],
    "data_story": "A brief story with specific examples and numbers"
}

REMEMBER: Every number in description, business_impact, fun_fact, and key_findings MUST be a real value from the Pre-Computed Statistics. No placeholders allowed.
`;
}

function extractJsonFromResponse(text: string): string | null {
  const trimmed = text.trim();
  // Try markdown code blocks first (```json ... ``` or ``` ... ```)
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  // Try raw JSON object
  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    return objectMatch[0];
  }
  // Try raw JSON array
  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return arrayMatch[0];
  }
  return null;
}

const CONFIDENCE_ORDER = { high: 0, medium: 1, low: 2 };

function rankInsightsByImportance(insights: unknown[]): unknown[] {
  const arr = (insights as unknown[]).filter(
    (x): x is { confidence?: string } =>
      x != null && typeof x === 'object' && !Array.isArray(x)
  );
  return [...arr].sort((a, b) => {
    const aScore = CONFIDENCE_ORDER[a.confidence as keyof typeof CONFIDENCE_ORDER] ?? 1;
    const bScore = CONFIDENCE_ORDER[b.confidence as keyof typeof CONFIDENCE_ORDER] ?? 1;
    return aScore - bScore;
  });
}

function parseInsightsResponse(response: string): { insights: unknown[]; key_findings?: string[]; recommendations?: string[] } {
  const jsonStr = extractJsonFromResponse(response);
  if (jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      // Handle { insights: [...] }
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.insights)) {
        const ranked = rankInsightsByImportance(parsed.insights);
        return {
          insights: ranked,
          key_findings: parsed.key_findings,
          recommendations: parsed.recommendations,
        };
      }
      // Handle top-level array of insights
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0];
        if (first && typeof first === 'object' && ('title' in first || 'description' in first)) {
          return { insights: parsed };
        }
      }
    } catch {
      // fallthrough
    }
  }
  return {
    insights: [
      {
        title: 'Data Analysis Complete',
        description: response,
        business_impact: 'Analysis completed successfully',
        confidence: 'medium',
      },
    ],
  };
}

export type StandaloneBlobInfo = { blobPathname: string; filename: string };

export async function analyzeFileStandalone(
  fileId: string,
  blobInfo?: StandaloneBlobInfo
): Promise<{
  success: boolean;
  analysis_id?: string;
  data_summary?: DataSummary;
  insights?: unknown;
  message: string;
  generated_at?: string;
}> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { success: false, message: 'OPENROUTER_API_KEY is required for standalone analysis' };
  }

  const fileSource =
    blobInfo?.blobPathname && blobInfo?.filename
      ? await getFileBufferFromBlobPathname(blobInfo.blobPathname, blobInfo.filename)
      : await getFileBuffer(fileId);
  if (!fileSource) {
    return { success: false, message: 'File not found' };
  }

  try {
    const { data_summary, sample_data, computed_stats } = await parseFileFromBuffer(
      fileSource.buffer,
      fileSource.filename
    );
    const prompt = buildInsightsPrompt(data_summary, sample_data, computed_stats);

    const response = await fetch(OPENROUTER_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...openRouterAppHeaders(),
      },
      signal: AbortSignal.timeout(240_000),
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a brilliant, enthusiastic data analyst. You MUST use only actual numbers from the provided statistics—never placeholders like $X, XX, Y%, or XXXX. Every number in your response must be real data. Always respond with valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1600,
        temperature: 0.2,
      }),
    });

    const rawBody = await response.text();
    const parsedBody = parseOpenRouterBody(rawBody, response.status);
    if (!parsedBody.ok) {
      return { success: false, message: parsedBody.message };
    }
    const data = parsedBody.data;

    if (data.error?.message) {
      return { success: false, message: `OpenRouter: ${data.error.message}` };
    }

    if (!response.ok) {
      const fallback = rawBody.replace(/^\uFEFF/, '').trim().slice(0, 800);
      return {
        success: false,
        message: `OpenRouter API error (HTTP ${response.status}): ${fallback || response.statusText}`,
      };
    }

    const content = data.choices?.[0]?.message?.content ?? '';
    const parsed = parseInsightsResponse(content);

    return {
      success: true,
      analysis_id: `analysis_${fileId}_${Date.now()}`,
      data_summary,
      insights: {
        ...parsed,
        generated_at: new Date().toISOString(),
      },
      message: 'Analysis completed successfully',
      generated_at: new Date().toISOString(),
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Analysis failed',
    };
  }
}
