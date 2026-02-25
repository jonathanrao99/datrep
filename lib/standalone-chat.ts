import { getFileBuffer } from './standalone-upload';
import { parseFileWithStatsFromBuffer } from './file-stats';

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'arcee-ai/trinity-large-preview:free';

const MAX_ROWS_FOR_FULL_CONTEXT = 1500;

function formatStatsForChat(stats: Record<string, { sum?: number; min?: number; max?: number; avg?: number; pct_of_total?: number; value_counts?: Record<string, number> }>): string {
  const lines: string[] = [];
  for (const [col, s] of Object.entries(stats)) {
    if (s.sum != null && s.min != null && s.max != null) {
      const pct = s.pct_of_total != null ? ` (${s.pct_of_total.toFixed(1)}% of total)` : '';
      lines.push(`- "${col}": sum=${s.sum.toLocaleString()}, min=${s.min}, max=${s.max}, avg=${s.avg?.toFixed(2)}${pct}`);
    } else if (s.value_counts) {
      const top = Object.entries(s.value_counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      lines.push(`- "${col}": top values: ${top}`);
    }
  }
  return lines.join('\n');
}

async function getDataContext(buffer: Buffer, filename: string): Promise<string> {
  const { rows, columns, stats } = await parseFileWithStatsFromBuffer(buffer, filename);

  const statsBlock = formatStatsForChat(stats);
  const useFullDataset = rows.length <= MAX_ROWS_FOR_FULL_CONTEXT;
  const rowsToInclude = useFullDataset ? rows : rows.slice(0, MAX_ROWS_FOR_FULL_CONTEXT);

  const sampleRows = rowsToInclude.slice(0, 20);
  const sampleData = sampleRows
    .map((r) => columns.map((c) => String(r[c] ?? '')).join(' | '))
    .join('\n');

  const dataSection = useFullDataset
    ? `Complete dataset: ${rows.length} rows`
    : `Dataset: first ${MAX_ROWS_FOR_FULL_CONTEXT} of ${rows.length} rows`;

  return `
You are answering questions about THIS SPECIFIC UPLOADED FILE. All numbers below are computed from the actual data.

PRE-COMPUTED COLUMN STATISTICS (use these for "total", "sum", "how much" questions - e.g. "total sales" = sum of Gross Sales, Net Sales, Total Collected, or similar columns):
${statsBlock}

Column names in this file: ${columns.map((c) => `"${c}"`).join(', ')}

When the user asks about "sales", "revenue", "total", etc., match to the closest column above (e.g. "Gross Sales", "Net Sales", "Total Collected"). Use the EXACT sum/value from the statistics.

${dataSection}

Sample rows (first 20):
${columns.join(' | ')}
${sampleData}
`;
}

export async function chatWithDataStandalone(
  fileId: string,
  question: string
): Promise<{
  success: boolean;
  answer?: string;
  message: string;
  timestamp?: string;
}> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { success: false, message: 'OPENROUTER_API_KEY is required for chat' };
  }

  const fileSource = await getFileBuffer(fileId);
  if (!fileSource) {
    return { success: false, message: 'File not found. Please ensure the analysis has been completed.' };
  }

  try {
    const dataContext = await getDataContext(fileSource.buffer, fileSource.filename);

    const response = await fetch(OPENROUTER_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a data analyst assistant answering questions about a user's UPLOADED FILE. You MUST use ONLY the pre-computed statistics and data provided - never guess or use generic numbers.

CRITICAL RULES:
1. For "total X", "sum of X", "how much X" - use the PRE-COMPUTED COLUMN STATISTICS. Match the user's term to the closest column (e.g. "sales" → Gross Sales, Net Sales, Total Collected).
2. Always cite the EXACT numbers from the statistics (e.g. "Total Gross Sales is $1,200,000").
3. If the file has the data, you MUST provide the answer. Do not say "the dataset doesn't contain" if the column exists and has a sum.
4. Never give generic or placeholder answers. Every number must come from the file.`,
          },
          {
            role: 'user',
            content: `${dataContext}\n\nUser Question: ${question}\n\nAnswer using ONLY the pre-computed statistics and data above. If a column matches the question (e.g. "sales" could mean "Gross Sales"), use its sum.`,
          },
        ],
        max_tokens: 1500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, message: `OpenRouter API error: ${err}` };
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content ?? '';

    return {
      success: true,
      answer,
      message: 'Chat response generated successfully',
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Failed to process your question',
    };
  }
}
