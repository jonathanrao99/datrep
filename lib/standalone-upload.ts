import { writeFile, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

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

  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }

  const fileId = randomUUID();
  const safeFilename = `${fileId}_${path.basename(filename)}`;
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
