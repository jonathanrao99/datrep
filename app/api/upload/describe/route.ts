import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'arcee-ai/trinity-large-preview:free';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface DescribeRequestBody {
  columns?: string[];
  preview?: unknown[];
}

interface DescribeResponse {
  summary: string;
  suggested_questions: string[];
  data_quality_risks: string[];
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY is required for upload AI summary' },
        { status: 500 }
      );
    }

    const body = (await request.json()) as DescribeRequestBody;
    const columns = Array.isArray(body.columns) ? body.columns : [];
    const preview = Array.isArray(body.preview) ? body.preview : [];

    if (columns.length === 0 || preview.length === 0) {
      return NextResponse.json(
        { error: 'columns and preview are required to generate an AI summary' },
        { status: 400 }
      );
    }

    const exampleRows = preview.slice(0, 5);

    const prompt = `
You are a senior data analyst helping a user quickly understand a tabular dataset they just uploaded.

You are given:
- The column names for the dataset
- Up to 5 example rows of data (already parsed)

Return a short JSON object with three fields:
- "summary": 2-4 sentences, plain English, describing what this dataset appears to represent.
- "suggested_questions": an array of 3-6 concise, practical questions the user could ask of this data.
- "data_quality_risks": an array of 2-5 short bullet-style strings that call out potential issues or caveats (e.g. missing values, outliers, small sample size). If you cannot see any issues, include at least one generic caution.

IMPORTANT:
- Use ONLY real, concrete descriptions based on the columns and sample rows.
- Do NOT invent fake column names.
- Do NOT use placeholders like "$X", "XX%", or "N rows".
- Keep everything concise and business-friendly.

Here is the data:

Columns:
${JSON.stringify(columns, null, 2)}

Sample rows:
${JSON.stringify(exampleRows, null, 2)}

Respond with JSON ONLY, no markdown, no backticks. The JSON must match this TypeScript type exactly:
{
  "summary": string;
  "suggested_questions": string[];
  "data_quality_risks": string[];
}
`.trim();

    const response = await fetch(OPENROUTER_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are a precise, pragmatic data analyst.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 700,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: 'Failed to generate AI upload summary', details: text },
        { status: 502 }
      );
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim() ?? '';

    let parsed: DescribeResponse | null = null;
    try {
      parsed = JSON.parse(content) as DescribeResponse;
    } catch {
      // Sometimes models wrap JSON in text; try to recover the JSON substring.
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]) as DescribeResponse;
        } catch {
          parsed = null;
        }
      }
    }

    if (!parsed || typeof parsed.summary !== 'string') {
      return NextResponse.json(
        {
          error: 'AI response could not be parsed as JSON',
          raw: content,
        },
        { status: 502 }
      );
    }

    const normalized: DescribeResponse = {
      summary: parsed.summary,
      suggested_questions: Array.isArray(parsed.suggested_questions)
        ? parsed.suggested_questions.filter((q): q is string => typeof q === 'string')
        : [],
      data_quality_risks: Array.isArray(parsed.data_quality_risks)
        ? parsed.data_quality_risks.filter((q): q is string => typeof q === 'string')
        : [],
    };

    return NextResponse.json(normalized);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Upload AI describe error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}

