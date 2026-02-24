import { NextRequest, NextResponse } from 'next/server';
import { saveAnalysis, updateFileStatus } from '@/lib/db';
import { analyzeFileStandalone } from '@/lib/standalone-analyze';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const body = await request.json();
    const fileId = body?.file_id;

    if (!fileId) {
      return NextResponse.json({ error: 'file_id is required' }, { status: 400 });
    }

    let data: { success: boolean; insights?: unknown; data_summary?: unknown; analysis_id?: string };

    try {
      const response = await fetch(`${backendUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: fileId }),
      });

      if (response.ok) {
        data = await response.json();
      } else {
        const error = await response.text();
        if (response.status >= 500 && process.env.OPENROUTER_API_KEY) {
          const standaloneResult = await analyzeFileStandalone(fileId);
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
            { error: 'Analysis failed', details: error },
            { status: response.status }
          );
        }
      }
    } catch (fetchErr: unknown) {
      const cause = (fetchErr as { cause?: { code?: string } })?.cause;
      const isConnectionError = cause?.code === 'ECONNREFUSED' || cause?.code === 'ECONNRESET';
      const isFetchFailed = fetchErr instanceof Error && fetchErr.message?.includes('fetch failed');
      if (!isConnectionError && !isFetchFailed) {
        throw fetchErr;
      }
      const standaloneResult = await analyzeFileStandalone(fileId);
      if (!standaloneResult.success) {
        console.error('Standalone analysis failed:', standaloneResult.message);
        return NextResponse.json(
          { error: 'Analysis failed', details: standaloneResult.message },
          { status: 500 }
        );
      }
      data = standaloneResult;
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