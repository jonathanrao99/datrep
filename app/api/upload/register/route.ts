import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createFile } from '@/lib/db';

export const runtime = 'nodejs';

const MAX_BYTES = 100 * 1024 * 1024;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isHttpsUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Register metadata after a client-side Blob upload (no file bytes in this request). */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      file_id?: string;
      blob_url?: string;
      blob_pathname?: string;
      filename?: string;
      size?: number;
      file_type?: string;
      columns?: string[];
      preview?: Record<string, unknown>[];
      uploaded_at?: string;
    };

    const fileId = body.file_id?.trim();
    const blobUrl = body.blob_url?.trim();
    const blobPathname = body.blob_pathname?.trim();
    const filename = body.filename?.trim() || 'dataset';
    const size = typeof body.size === 'number' ? body.size : 0;
    let fileType = (body.file_type || '').toLowerCase();
    if (!fileType.startsWith('.')) {
      fileType = fileType ? `.${fileType}` : '.csv';
    }

    if (!fileId || !UUID.test(fileId)) {
      return NextResponse.json({ error: 'Invalid file_id' }, { status: 400 });
    }
    if (!blobUrl || !isHttpsUrl(blobUrl)) {
      return NextResponse.json({ error: 'Invalid blob_url' }, { status: 400 });
    }
    if (!blobPathname || !blobPathname.startsWith(`${fileId}_`)) {
      return NextResponse.json({ error: 'blob_pathname must start with file_id_' }, { status: 400 });
    }
    if (size <= 0 || size > MAX_BYTES) {
      return NextResponse.json({ error: 'Invalid file size' }, { status: 400 });
    }

    const columns = Array.isArray(body.columns) ? body.columns : [];
    const preview = Array.isArray(body.preview) ? body.preview : [];
    const uploadedAt = body.uploaded_at || new Date().toISOString();

    if (process.env.POSTGRES_URL) {
      try {
        const session = await auth();
        const userId = session?.user?.id ?? session?.user?.email ?? undefined;
        await createFile({
          id: fileId,
          userId,
          filename,
          fileSize: size,
          fileType,
          blobUrl,
          blobPathname,
        });
      } catch (dbError) {
        console.error('DB save error (register):', dbError);
      }
    }

    return NextResponse.json({
      file_id: fileId,
      filename,
      size,
      columns,
      preview,
      uploaded_at: uploadedAt,
      blob_pathname: blobPathname,
      blob_url: blobUrl,
    });
  } catch (error) {
    console.error('Upload register error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
