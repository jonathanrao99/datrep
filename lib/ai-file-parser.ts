import path from 'path';
import * as XLSX from 'xlsx';

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openai/gpt-4o-mini';
const MAX_CHARS = 8000;

export interface AIParseResult {
  columns: string[];
  preview: Record<string, unknown>[];
}

function getTextContent(buffer: Buffer, filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.csv') {
    return buffer.toString('utf-8').slice(0, MAX_CHARS);
  }
  if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_csv(sheet).slice(0, MAX_CHARS);
  }
  return buffer.toString('utf-8').slice(0, MAX_CHARS);
}

/** Use AI to parse file structure when standard parsing fails */
export async function parseWithAI(
  buffer: Buffer,
  filename: string
): Promise<AIParseResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { columns: [], preview: [] };
  }

  const textContent = getTextContent(buffer, filename);
  if (!textContent.trim()) {
    return { columns: [], preview: [] };
  }

  const prompt = `You are a data parsing assistant. Extract the structure from this file content.

File content (may be truncated):
---
${textContent}
---

Respond with ONLY valid JSON in this exact format, no other text:
{"columns": ["col1", "col2", ...], "preview": [{"col1": "val1", "col2": "val2"}, ...]}

Rules:
- "columns" must be an array of column/header names (from the first row)
- "preview" must be an array of objects, each with the column names as keys
- Include up to 5 preview rows
- If the format is unclear, infer the structure from the data
- Return ONLY the JSON object, no markdown or explanation`;

  try {
    const response = await fetch(OPENROUTER_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return { columns: [], preview: [] };
    }

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      jsonStr = match[1].trim();
    }

    const parsed = JSON.parse(jsonStr) as { columns?: string[]; preview?: Record<string, unknown>[] };
    const columns = Array.isArray(parsed.columns) ? parsed.columns : [];
    const preview = Array.isArray(parsed.preview) ? parsed.preview : [];

    return { columns, preview };
  } catch (err) {
    console.error('AI parse error:', err);
    return { columns: [], preview: [] };
  }
}
