import { NextRequest, NextResponse } from 'next/server';
import { saveAnalysis, updateFileStatus } from '@/lib/db';
import { analyzeFileStandalone } from '@/lib/standalone-analyze';

export const runtime = 'nodejs';
export const maxDuration = 300;

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
  if (response.ok) {
    const data = (await response.json()) as AnalyzePayload;
    return { ok: true, data };
  }
  const body = await response.text();
  return { ok: false, status: response.status, body };
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
      } catch (dbError) {
        console.error('DB save error (analysis still completed):', dbError);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}
