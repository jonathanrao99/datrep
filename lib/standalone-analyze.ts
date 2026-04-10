import path from 'path';
import { Readable } from 'node:stream';
import { parse as parseCsvStream } from 'csv-parse';
import { parse as parseCsvSync } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { getFileBuffer, getFileBufferFromBlobPathname } from './standalone-upload';

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'arcee-ai/trinity-large-preview:free';

/** Keep prompt small so the model finishes before Vercel/serverless limits. */
const SAMPLE_ROWS_IN_PROMPT = 6;
const STATS_TOP_CATEGORICAL = 3;
const MAX_COLUMN_NAME_PROMPT_LEN = 72;
const DEFAULT_LLM_MAX_TOKENS = 768;
/** Default leaves room for Blob fetch + XLSX.parse on large files before the LLM call. */
const DEFAULT_LLM_TIMEOUT_MS = 165_000;

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
/** Workbooks this large spend too long in XLSX.read + stats; sample fewer rows for speed. */
const LARGE_XLSX_BYTES = 8 * 1024 * 1024;
const LARGE_XLSX_ROW_CAP = 20_000;

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
      // Skip rich text / number-format strings where possible — faster on large workbooks.
      workbook = XLSX.read(buffer, {
        type: 'buffer',
        cellDates: true,
        cellNF: false,
        cellHTML: false,
      });
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
    const xlsxRowCap =
      buffer.byteLength > LARGE_XLSX_BYTES
        ? Math.min(MAX_ROWS_FOR_STATS, LARGE_XLSX_ROW_CAP)
        : MAX_ROWS_FOR_STATS;
    // Limit the worksheet range before sheet_to_json so we never allocate 500k+ row objects.
    const sheetOpts: XLSX.Sheet2JSONOpts = { defval: '', raw: true };
    const ref = sheet['!ref'];
    if (ref) {
      const fullRange = XLSX.utils.decode_range(ref);
      const lastAllowedR = fullRange.s.r + xlsxRowCap;
      if (fullRange.e.r > lastAllowedR) {
        rowSampleCapped = true;
        sheetOpts.range = {
          s: fullRange.s,
          e: { r: lastAllowedR, c: fullRange.e.c },
        };
      }
    }
    let data: Record<string, unknown>[];
    try {
      data = XLSX.utils.sheet_to_json(sheet, sheetOpts) as Record<string, unknown>[];
    } catch (e) {
      throw new Error(
        `Could not convert Excel sheet to rows: ${e instanceof Error ? e.message : 'unknown error'}`
      );
    }
    if (data.length > xlsxRowCap) {
      rows = data.slice(0, xlsxRowCap);
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

  const sampleRows = rows.slice(0, SAMPLE_ROWS_IN_PROMPT);
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

function shortColLabel(col: string): string {
  return col.length > MAX_COLUMN_NAME_PROMPT_LEN
    ? `${col.slice(0, MAX_COLUMN_NAME_PROMPT_LEN)}…`
    : col;
}

function formatStatsForPrompt(stats: Record<string, ColumnStats>): string {
  const lines: string[] = [];
  for (const [col, s] of Object.entries(stats)) {
    const label = shortColLabel(col);
    if (s.sum != null && s.min != null && s.max != null) {
      const pct = s.pct_of_total != null ? ` (${s.pct_of_total.toFixed(1)}% of total)` : '';
      lines.push(`- ${label}: sum=${s.sum.toLocaleString()}, min=${s.min}, max=${s.max}, avg=${s.avg?.toFixed(2)}${pct}`);
    } else if (s.value_counts) {
      const top = Object.entries(s.value_counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, STATS_TOP_CATEGORICAL)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      lines.push(`- ${label}: top: ${top}`);
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
    ? `\nNOTE: Large file — stats/sample are the first ${data_summary.rows.toLocaleString()} rows only.\n`
    : '';
  const namesForPrompt = data_summary.column_names.map(shortColLabel);
  return `You are a data analyst. Use ONLY numbers from the statistics and sample below — no placeholders ($X, Y%, etc.).
${capNote}
Summary: ${data_summary.rows} rows, ${data_summary.columns} columns.
Columns: ${JSON.stringify(namesForPrompt)}
Types: ${JSON.stringify(data_summary.data_types)}

Statistics:
${statsBlock}

Sample (${SAMPLE_ROWS_IN_PROMPT} rows):
${sample_data}

Return compact JSON only (no markdown). Exactly 4–5 insights, ranked by importance. Keep each description under 2 sentences.
Schema:
{"insights":[{"title":"string","description":"string","business_impact":"string","confidence":"high|medium|low","fun_fact":"string"}],"key_findings":["string"],"recommendations":["string"],"data_story":"string"}`;
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

    const llmTimeoutMs = Math.max(
      30_000,
      Number(process.env.OPENROUTER_FETCH_TIMEOUT_MS) || DEFAULT_LLM_TIMEOUT_MS
    );
    const llmMaxTokens = Math.min(
      4096,
      Math.max(256, Number(process.env.OPENROUTER_MAX_TOKENS) || DEFAULT_LLM_MAX_TOKENS)
    );

    const response = await fetch(OPENROUTER_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...openRouterAppHeaders(),
      },
      signal: AbortSignal.timeout(llmTimeoutMs),
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'Reply with a single valid JSON object only. Use only real numbers from the user message; never placeholders.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: llmMaxTokens,
        temperature: 0.15,
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
    const e = err instanceof Error ? err : null;
    const looksLikeTimeout =
      e &&
      (e.name === 'TimeoutError' ||
        e.name === 'AbortError' ||
        /timed out|timeout|aborted due to timeout/i.test(e.message));
    if (looksLikeTimeout) {
      return {
        success: false,
        message:
          'The AI request timed out. Try a faster paid model (OPENROUTER_MODEL), raise OPENROUTER_FETCH_TIMEOUT_MS, or use Pro + Fluid (this app uses maxDuration 800 on analyze). Hobby is limited to ~300s total.',
      };
    }
    return {
      success: false,
      message: e?.message ?? 'Analysis failed',
    };
  }
}
