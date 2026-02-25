import { writeFile, mkdir, readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { put, get } from '@vercel/blob';
import { getFileById } from '@/lib/db';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function saveUploadLocally(formData: FormData): Promise<{
  file_id: string;
  file_info: {
    file_id: string;
    original_filename: string;
    stored_filename: string;
    file_path: string;
    file_size: number;
    file_type: string;
    uploaded_at: string;
    blob_url?: string;
    /** Pathname for Blob get() — pass to createFile when using Blob. */
    blob_pathname?: string;
    /** Set when stored in Postgres (free, no Blob). Upload route must pass to createFile. */
    file_data_base64?: string;
  };
}> {
  const file = formData.get('file') as File | null;
  if (!file || !(file instanceof Blob)) {
    throw new Error('No file provided');
  }

  const filename = (file as File).name || 'dataset.csv';
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File too large. Max ${MAX_FILE_SIZE} bytes`);
  }

  const fileId = randomUUID();
  const safeFilename = `${fileId}_${path.basename(filename)}`;

  const isServerless = !!(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME
  );

  // Free option: store in Postgres (no Blob needed). Max 5MB per file.
  const MAX_POSTGRES_FILE_BYTES = 5 * 1024 * 1024;
  if (
    isServerless &&
    !process.env.BLOB_READ_WRITE_TOKEN &&
    process.env.POSTGRES_URL &&
    buffer.length <= MAX_POSTGRES_FILE_BYTES
  ) {
    return {
      file_id: fileId,
      file_info: {
        file_id: fileId,
        original_filename: filename,
        stored_filename: safeFilename,
        file_path: '',
        file_size: buffer.length,
        file_type: ext,
        uploaded_at: new Date().toISOString(),
        file_data_base64: buffer.toString('base64'),
      },
    };
  }

  if (isServerless && !process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      'Uploads on Vercel need either: (1) Add Blob (Storage → Blob), or (2) set POSTGRES_URL and keep files under 5MB to store in DB for free.'
    );
  }
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(safeFilename, buffer, {
      access: 'private',
      addRandomSuffix: false,
    });
    return {
      file_id: fileId,
      file_info: {
        file_id: fileId,
        original_filename: filename,
        stored_filename: safeFilename,
        file_path: blob.url,
        file_size: buffer.length,
        file_type: ext,
        uploaded_at: new Date().toISOString(),
        blob_url: blob.url,
        blob_pathname: safeFilename,
      },
    };
  }

  // Local development: write to disk
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
  const filePath = path.join(UPLOAD_DIR, safeFilename);
  await writeFile(filePath, buffer);

  return {
    file_id: fileId,
    file_info: {
      file_id: fileId,
      original_filename: filename,
      stored_filename: safeFilename,
      file_path: filePath,
      file_size: buffer.length,
      file_type: ext,
      uploaded_at: new Date().toISOString(),
    },
  };
}

/** Get file buffer and filename for a fileId (local path or Vercel Blob URL from DB). */
export async function getFileBuffer(
  fileId: string
): Promise<{ buffer: Buffer; filename: string } | null> {
  const localPath = await findFilePath(fileId);
  if (localPath) {
    const buffer = await readFile(localPath);
    const basename = path.basename(localPath);
    const prefix = `${fileId}_`;
    const filename = basename.startsWith(prefix) ? basename.slice(prefix.length) : basename || 'dataset.csv';
    return { buffer, filename };
  }
  const row = await getFileById(fileId);
  if (row?.fileDataBase64) {
    const buffer = Buffer.from(row.fileDataBase64, 'base64');
    const filename = row.filename?.endsWith(row.fileType) ? row.filename : `${row.filename || 'dataset'}${row.fileType}`;
    return { buffer, filename };
  }
  if (row?.blobUrl) {
    try {
      const pathname = row.blobPathname ?? new URL(row.blobUrl).pathname.replace(/^\//, '');
      const result = await get(pathname, { access: 'private' });
      const stream = (result as { stream: ReadableStream }).stream;
      const ab = await new Response(stream).arrayBuffer();
      const filename = row.filename?.endsWith(row.fileType) ? row.filename : `${row.filename || 'dataset'}${row.fileType}`;
      return { buffer: Buffer.from(ab), filename };
    } catch {
      return null;
    }
  }
  return null;
}

/** Get file buffer from Vercel Blob by pathname (no DB required). Use when client sends blob_pathname from upload. */
export async function getFileBufferFromBlobPathname(
  pathname: string,
  filename: string
): Promise<{ buffer: Buffer; filename: string } | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const result = await get(pathname, { access: 'private' });
    const stream = (result as { stream: ReadableStream }).stream;
    const ab = await new Response(stream).arrayBuffer();
    return { buffer: Buffer.from(ab), filename: filename || 'dataset.csv' };
  } catch {
    return null;
  }
}

const BACKEND_UPLOAD_DIR = path.join(process.cwd(), 'backend', 'uploads');

export async function findFilePath(fileId: string): Promise<string | null> {
  for (const dir of [UPLOAD_DIR, BACKEND_UPLOAD_DIR]) {
    if (!existsSync(dir)) continue;
    const files = await readdir(dir);
    const match = files.find((f) => f.startsWith(`${fileId}_`));
    if (match) return path.join(dir, match);
  }
  return null;
}
