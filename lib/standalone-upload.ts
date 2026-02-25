import { writeFile, mkdir, readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { put } from '@vercel/blob';
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

  // Vercel (and other serverless) have read-only filesystem — use Blob when token is set
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(safeFilename, buffer, {
      access: 'public',
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
  if (row?.blobUrl) {
    const res = await fetch(row.blobUrl);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    const filename = row.filename?.endsWith(row.fileType) ? row.filename : `${row.filename || 'dataset'}${row.fileType}`;
    return { buffer: Buffer.from(ab), filename };
  }
  return null;
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
