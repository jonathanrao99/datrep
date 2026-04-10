import { NextRequest, NextResponse } from 'next/server';
import { getFileById, saveAnalysis, updateFileStatus } from '@/lib/db';
import { sanitizeForJson } from '@/lib/json-safe';
import { analyzeFileStandalone } from '@/lib/standalone-analyze';

export const runtime = 'nodejs';
/** Pro + Fluid: up to 800s. Hobby is capped by Vercel at 300s regardless. */
export const maxDuration = 800;

const BACKEND_FETCH_MS = 10_000;

type AnalyzePayload = {
  success: boolean;
  insights?: unknown;
  data_summary?: unknown;
  analysis_id?: string;
  message?: string;
};

async function fetchFromFastAPI(
  backendUrl: string,
  fileId: string
): Promise<{ ok: true; data: AnalyzePayload } | { ok: false; status: number; body: string }> {
  const response = await fetch(`${backendUrl}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId }),
    signal: AbortSignal.timeout(BACKEND_FETCH_MS),
  });
  const rawText = await response.text();
  if (response.ok) {
    try {
      const data = JSON.parse(rawText) as AnalyzePayload;
      return { ok: true, data };
    } catch {
      return {
        ok: false,
        status: 502,
        body: 'Analytics backend returned a non-JSON body (check BACKEND_URL)',
      };
    }
  }
  return { ok: false, status: response.status, body: rawText };
}

function isBackendUnreachable(err: unknown): boolean {
  if (err instanceof Error) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') return true;
    if (err.message?.includes('fetch failed')) return true;
    const cause = (err as { cause?: { code?: string } }).cause;
    if (cause?.code === 'ECONNREFUSED' || cause?.code === 'ECONNRESET') return true;
  }
  return false;
}

/** Safe subset when full payload fails JSON serialization (omit statistics blob). */
function slimDataSummaryForResponse(ds: unknown): Record<string, unknown> | undefined {
  if (!ds || typeof ds !== 'object') return undefined;
  const o = ds as Record<string, unknown>;
  const columnNames = Array.isArray(o.column_names) ? o.column_names.map((x) => String(x)) : [];
  const dataTypes =
    o.data_types && typeof o.data_types === 'object' && !Array.isArray(o.data_types)
      ? Object.fromEntries(
          Object.entries(o.data_types as Record<string, unknown>).map(([k, v]) => [k, String(v)])
        )
      : {};
  const missingValues =
    o.missing_values && typeof o.missing_values === 'object' && !Array.isArray(o.missing_values)
      ? Object.fromEntries(
          Object.entries(o.missing_values as Record<string, unknown>).map(([k, v]) => [
            k,
            Number(v) || 0,
          ])
        )
      : {};
  const out: Record<string, unknown> = {
    rows: Number(o.rows) || 0,
    columns: Number(o.columns) || 0,
    column_names: columnNames,
    data_types: dataTypes,
    missing_values: missingValues,
  };
  if (o.row_sample_capped === true) out.row_sample_capped = true;
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const body = await request.json();
    const fileId = body?.file_id;
    const blobPathname = body?.blob_pathname as string | undefined;
    const filename = body?.filename as string | undefined;
    const blobInfo =
      blobPathname && filename
        ? { blobPathname, filename }
        : undefined;

    if (!fileId) {
      return NextResponse.json({ error: 'file_id is required' }, { status: 400 });
    }

    let data: AnalyzePayload;

    const openRouterConfigured = Boolean(process.env.OPENROUTER_API_KEY);

    // Blob-backed uploads: avoid waiting on BACKEND_URL (often unset or slow on Vercel).
    if (openRouterConfigured && blobInfo) {
      const standalone = await analyzeFileStandalone(fileId, blobInfo);
      if (standalone.success) {
        data = standalone;
      } else {
        try {
          const backend = await fetchFromFastAPI(backendUrl, fileId);
          if (backend.ok) {
            data = backend.data;
          } else if (backend.status >= 500) {
            return NextResponse.json(
              { error: 'Analysis failed', details: standalone.message },
              { status: 500 }
            );
          } else {
            return NextResponse.json(
              { error: 'Analysis failed', details: backend.body },
              { status: backend.status }
            );
          }
        } catch (e) {
          if (!isBackendUnreachable(e)) throw e;
          return NextResponse.json(
            { error: 'Analysis failed', details: standalone.message },
            { status: 500 }
          );
        }
      }
    } else {
      try {
        const backend = await fetchFromFastAPI(backendUrl, fileId);
        if (backend.ok) {
          data = backend.data;
        } else if (backend.status >= 500 && openRouterConfigured) {
          const standaloneResult = await analyzeFileStandalone(fileId, blobInfo);
          if (standaloneResult.success) {
            data = standaloneResult;
          } else {
            console.error('Standalone fallback failed:', standaloneResult.message);
            return NextResponse.json(
              { error: 'Analysis failed', details: standaloneResult.message },
              { status: 500 }
            );
          }
        } else {
          return NextResponse.json(
            { error: 'Analysis failed', details: backend.body },
            { status: backend.status }
          );
        }
      } catch (fetchErr: unknown) {
        if (!isBackendUnreachable(fetchErr)) {
          throw fetchErr;
        }
        if (!openRouterConfigured) {
          return NextResponse.json(
            { error: 'Analysis failed', details: 'Backend unreachable and OPENROUTER_API_KEY is not set' },
            { status: 503 }
          );
        }
        const standaloneResult = await analyzeFileStandalone(fileId, blobInfo);
        if (!standaloneResult.success) {
          console.error('Standalone analysis failed:', standaloneResult.message);
          return NextResponse.json(
            { error: 'Analysis failed', details: standaloneResult.message },
            { status: 500 }
          );
        }
        data = standaloneResult;
      }
    }

    if (data.success && fileId && process.env.POSTGRES_URL) {
      try {
        const fileRow = await getFileById(fileId);
        if (!fileRow) {
          // Upload can succeed without a DB row (e.g. createFile failed); skip persist to avoid FK errors.
        } else {
          const insights = (data as { insights?: { insights?: unknown[] } }).insights ?? {};
          const insightsArray = Array.isArray(insights.insights) ? insights.insights : [];
          const dataSummary = (data as { data_summary?: Record<string, unknown> }).data_summary ?? {};

          await saveAnalysis({
            id: data.analysis_id ?? `analysis_${fileId}_${Date.now()}`,
            fileId,
            dataSummary,
            insights,
            statistics: dataSummary.statistics,
            missingValues: dataSummary.missing_values,
            dataTypes: dataSummary.data_types,
            charts: [],
            fileInfo: { original_filename: 'dataset' },
          });

          await updateFileStatus(fileId, 'completed', insightsArray.length, 0);
        }
      } catch (dbError) {
        console.error('DB save error (analysis still completed):', dbError);
      }
    }

    try {
      return NextResponse.json(sanitizeForJson(data));
    } catch (serializeErr) {
      console.error('Analyze response serialization failed:', serializeErr);
      const payload = {
        success: data.success,
        analysis_id: data.analysis_id,
        message: data.message ?? 'Analysis completed',
        generated_at: (data as { generated_at?: string }).generated_at,
        data_summary: slimDataSummaryForResponse((data as { data_summary?: unknown }).data_summary),
        insights: {
          insights: [
            {
              title: 'Analysis completed',
              description:
                'The full AI response could not be serialized for the API. Check Vercel function logs.',
              business_impact: 'n/a',
              confidence: 'low',
            },
          ],
        },
      };
      return NextResponse.json(payload, { status: 200 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}
