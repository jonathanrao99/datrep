import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createFile } from '@/lib/db';
import { saveUploadLocally, findFilePath } from '@/lib/standalone-upload';
import { parseFileWithStats, parseBufferForPreview } from '@/lib/file-stats';
import { parseWithAI } from '@/lib/ai-file-parser';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const fileBlob = file instanceof Blob ? file : null;

    if (!fileBlob || fileBlob.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Use client-provided columns/preview if available (from browser parsing)
    let columns: string[] = [];
    let preview: Record<string, unknown>[] = [];
    const clientColumns = formData.get('columns');
    const clientPreview = formData.get('preview');
    if (typeof clientColumns === 'string') {
      try {
        columns = JSON.parse(clientColumns) as string[];
      } catch {
        /* ignore */
      }
    }
    if (typeof clientPreview === 'string') {
      try {
        preview = JSON.parse(clientPreview) as Record<string, unknown>[];
      } catch {
        /* ignore */
      }
    }

    // Always save locally - ensures we have the file for analysis
    const result = await saveUploadLocally(formData);
    const fileId = result.file_id;
    const fileInfo = result.file_info as Record<string, unknown>;

    // If client didn't provide columns, try server-side parsing
    if (columns.length === 0) {
      try {
        const buffer = Buffer.from(await fileBlob.arrayBuffer());
        const filename = fileBlob instanceof File ? fileBlob.name : 'dataset.csv';
        const parsed = await parseBufferForPreview(buffer, filename);
        columns = parsed.columns;
        preview = parsed.preview;
      } catch {
        /* buffer parse failed */
      }
    }

    if (columns.length === 0) {
      try {
        const filePath = await findFilePath(fileId);
        if (filePath) {
          const parsed = await parseFileWithStats(filePath);
          columns = parsed.columns;
          preview = parsed.rows.slice(0, 10);
        }
      } catch {
        /* ignore */
      }
    }

    // AI fallback when all else fails
    if (columns.length === 0 && process.env.OPENROUTER_API_KEY) {
      try {
        const buffer = Buffer.from(await fileBlob.arrayBuffer());
        const filename = fileBlob instanceof File ? fileBlob.name : 'dataset.csv';
        const aiResult = await parseWithAI(buffer, filename);
        if (aiResult.columns.length > 0) {
          columns = aiResult.columns;
          preview = aiResult.preview;
        }
      } catch (aiErr) {
        console.error('AI parse fallback failed:', aiErr);
      }
    }

    if (fileId && process.env.POSTGRES_URL) {
      try {
        const session = await auth();
        const userId = session?.user?.id ?? session?.user?.email ?? undefined;
        const blobUrl = fileInfo.blob_url as string | undefined;
        await createFile({
          id: fileId,
          userId,
          filename: String(fileInfo.original_filename ?? 'dataset'),
          fileSize: Number(fileInfo.file_size ?? 0),
          fileType: String(fileInfo.file_type ?? '.csv'),
          ...(blobUrl && { blobUrl }),
        });
      } catch (dbError) {
        console.error('DB save error (file still uploaded):', dbError);
      }
    }

    return NextResponse.json({
      file_id: fileId,
      filename: fileInfo.original_filename ?? 'dataset',
      size: fileInfo.file_size ?? 0,
      columns,
      preview,
      uploaded_at: fileInfo.uploaded_at,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 