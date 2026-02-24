import { NextRequest, NextResponse } from 'next/server';
import { getAnalysisByFileId, saveAnalysis, updateFileStatus } from '@/lib/db';
import { normalizeInsightsForDisplay } from '@/lib/normalize-insights';
import { analyzeFileStandalone } from '@/lib/standalone-analyze';
import { generateChartsForFile } from '@/lib/standalone-charts';
import { findFilePath } from '@/lib/standalone-upload';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

    // Try to get cached analysis from DB first (if DB is configured)
    const cached = process.env.POSTGRES_URL ? await getAnalysisByFileId(fileId) : null;
    if (cached?.insights && cached?.dataSummary) {
      const insightsData = cached.insights as { insights?: any[]; patterns?: string[]; data_quality?: { issues: string[]; recommendations: string[] } };
      let insightsArray = Array.isArray(insightsData?.insights) ? insightsData.insights : [];
      insightsArray = normalizeInsightsForDisplay(insightsArray) as any[];
      const dataSummary = cached.dataSummary as Record<string, unknown>;
      const missingValues = (cached.missingValues ?? dataSummary?.missing_values) as Record<string, number> | undefined;
      const rows = (dataSummary?.rows ?? 0) as number;
      const columnNames = (dataSummary?.column_names ?? []) as string[];

      const dataQualityIssues: string[] = [];
      const dataQualityRecommendations: string[] = [];
      if (missingValues && rows > 0) {
        for (const [col, count] of Object.entries(missingValues)) {
          if (count > 0) {
            const pct = ((count / rows) * 100).toFixed(1);
            dataQualityIssues.push(`Column "${col}" has ${count} missing values (${pct}% of ${rows} rows)`);
            dataQualityRecommendations.push(`Consider filling or imputing missing values in "${col}" for more accurate analysis`);
          }
        }
      }
      if (dataQualityIssues.length === 0) {
        dataQualityIssues.push('No missing values detected in the dataset');
        dataQualityRecommendations.push('Data quality looks good. Continue monitoring for new uploads.');
      }
      const cachedRecs = insightsData?.data_quality?.recommendations ?? [];
      if (cachedRecs.length > 0) dataQualityRecommendations.push(...cachedRecs);

      let patterns = insightsData?.patterns ?? [];
      if (patterns.length === 0 && insightsArray.length > 0) {
        patterns = insightsArray.slice(0, 5).map((i: any) => i?.title).filter(Boolean);
      }
      if (patterns.length === 0 && rows) {
        patterns = [`Dataset contains ${rows} rows`, ...(columnNames?.length ? [`Columns: ${columnNames.slice(0, 5).join(', ')}`] : [])];
      }

      return NextResponse.json({
        file_id: fileId,
        file_info: (cached.fileInfo as any) ?? { original_filename: 'dataset' },
        statistics: cached.statistics ?? {},
        missing_values: cached.missingValues ?? {},
        data_types: cached.dataTypes ?? (dataSummary as any)?.data_types ?? {},
        insights: insightsArray,
        insights_full: {
          insights: insightsArray,
          patterns,
          data_quality: { issues: dataQualityIssues, recommendations: dataQualityRecommendations },
        },
        charts: (cached.charts as any[]) ?? [],
        data_summary: cached.dataSummary,
        analyzed_at: cached.createdAt,
      });
    }

    // Run standalone first when file exists locally (uploads are now saved locally, not to backend)
    const localFilePath = await findFilePath(fileId);
    let data: { insights?: unknown; data_summary?: unknown; file_info?: { original_filename?: string } } | undefined;

    if (localFilePath && process.env.OPENROUTER_API_KEY) {
      const standaloneResult = await analyzeFileStandalone(fileId);
      if (standaloneResult.success && standaloneResult.data_summary) {
        const insights = standaloneResult.insights as { insights?: unknown[]; key_findings?: string[]; recommendations?: string[] };
        data = {
          insights: { ...insights, generated_at: standaloneResult.generated_at },
          data_summary: standaloneResult.data_summary,
          file_info: { original_filename: 'dataset' },
        };
        if (process.env.POSTGRES_URL) {
          try {
            const insightsArray = Array.isArray(insights?.insights) ? insights.insights : [];
            await saveAnalysis({
              id: standaloneResult.analysis_id ?? `analysis_${fileId}_${Date.now()}`,
              fileId,
              dataSummary: standaloneResult.data_summary,
              insights: standaloneResult.insights,
              fileInfo: { original_filename: 'dataset' },
            });
            await updateFileStatus(fileId, 'completed', insightsArray.length, 0);
          } catch {
            /* ignore */
          }
        }
      }
    }

    // Fallback: fetch from backend if standalone didn't run or failed
    if (!data) {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
      try {
        const response = await fetch(`${backendUrl}/api/insights/${fileId}`, {
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          data = await response.json();
        } else {
          throw new Error('Backend returned ' + response.status);
        }
      } catch {
        const standaloneResult = await analyzeFileStandalone(fileId);
        if (!standaloneResult.success || !standaloneResult.data_summary) {
          return NextResponse.json(
            { error: 'Analysis not found', details: standaloneResult.message },
            { status: 404 }
          );
        }
        const insights = standaloneResult.insights as { insights?: unknown[]; key_findings?: string[]; recommendations?: string[] };
        data = {
          insights: { ...insights, generated_at: standaloneResult.generated_at },
          data_summary: standaloneResult.data_summary,
          file_info: { original_filename: 'dataset' },
        };
        if (process.env.POSTGRES_URL) {
          try {
            const insightsArray = Array.isArray(insights?.insights) ? insights.insights : [];
            await saveAnalysis({
              id: standaloneResult.analysis_id ?? `analysis_${fileId}_${Date.now()}`,
              fileId,
              dataSummary: standaloneResult.data_summary,
              insights: standaloneResult.insights,
              fileInfo: { original_filename: 'dataset' },
            });
            await updateFileStatus(fileId, 'completed', insightsArray.length, 0);
          } catch {
            /* ignore */
          }
        }
      }
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Analysis not found', details: 'Could not load analysis from standalone or backend' },
        { status: 404 }
      );
    }

    const responseData = data as { insights?: { insights?: unknown[]; key_findings?: string[]; recommendations?: string[]; generated_at?: string }; data_summary?: Record<string, unknown>; file_info?: { original_filename?: string }; charts?: unknown[] };
    const insightsObj = responseData.insights ?? {};
    let insightsArray = Array.isArray(insightsObj.insights) ? insightsObj.insights : [];
    insightsArray = normalizeInsightsForDisplay(insightsArray) as unknown[];
    const dataSummary = responseData.data_summary ?? {};
    let chartsArray = Array.isArray(responseData.charts) ? responseData.charts : [];
    if (chartsArray.length === 0) {
      chartsArray = await generateChartsForFile(fileId);
    }

    const missingValues = (dataSummary as Record<string, unknown>).missing_values as Record<string, number> | undefined;
    const rows = (dataSummary as Record<string, unknown>).rows as number | undefined;
    const columns = (dataSummary as Record<string, unknown>).columns as number | undefined;
    const columnNames = (dataSummary as Record<string, unknown>).column_names as string[] | undefined;

    const dataQualityIssues: string[] = [];
    const dataQualityRecommendations: string[] = [];
    if (missingValues && typeof rows === 'number' && rows > 0) {
      for (const [col, count] of Object.entries(missingValues)) {
        if (count > 0) {
          const pct = ((count / rows) * 100).toFixed(1);
          dataQualityIssues.push(`Column "${col}" has ${count} missing values (${pct}% of ${rows} rows)`);
          dataQualityRecommendations.push(`Consider filling or imputing missing values in "${col}" for more accurate analysis`);
        }
      }
    }
    if (dataQualityIssues.length === 0) {
      dataQualityIssues.push('No missing values detected in the dataset');
      dataQualityRecommendations.push('Data quality looks good. Continue monitoring for new uploads.');
    }
    const aiRecommendations = insightsObj.recommendations ?? [];
    if (Array.isArray(aiRecommendations) && aiRecommendations.length > 0) {
      dataQualityRecommendations.push(...aiRecommendations);
    }

    const patterns: string[] = insightsObj.key_findings ?? [];
    if (patterns.length === 0 && insightsArray.length > 0) {
      for (const i of insightsArray.slice(0, 5)) {
        const t = (i as Record<string, unknown>)?.title;
        if (typeof t === 'string') patterns.push(t);
      }
    }
    if (patterns.length === 0 && typeof rows === 'number' && typeof columns === 'number') {
      patterns.push(`Dataset contains ${rows} rows and ${columns} columns`);
      if (columnNames?.length) {
        patterns.push(`Columns: ${columnNames.slice(0, 5).join(', ')}${columnNames.length > 5 ? '...' : ''}`);
      }
    }

    return NextResponse.json({
      file_id: fileId,
      file_info: { original_filename: responseData.file_info?.original_filename ?? 'dataset' },
      statistics: (dataSummary as Record<string, unknown>).statistics ?? {},
      missing_values: (dataSummary as Record<string, unknown>).missing_values ?? {},
      data_types: (dataSummary as Record<string, unknown>).data_types ?? {},
      insights: insightsArray,
      insights_full: {
        insights: insightsArray,
        patterns,
        data_quality: {
          issues: dataQualityIssues,
          recommendations: dataQualityRecommendations,
        },
      },
      charts: chartsArray,
      data_summary: dataSummary,
      analyzed_at: insightsObj.generated_at ?? new Date().toISOString(),
    });
  } catch (error) {
    console.error('Analysis fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
