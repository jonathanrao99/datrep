import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getFilesByUserId } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? session?.user?.email ?? undefined;

    const files = await getFilesByUserId(userId);

    const projects = files.map((f) => ({
      id: f.id,
      filename: f.filename,
      uploaded_at: f.createdAt,
      file_size: f.fileSize,
      analysis_status: f.status,
      insights_count: f.insightsCount ?? 0,
      charts_count: f.chartsCount ?? 0,
    }));

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Projects fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
