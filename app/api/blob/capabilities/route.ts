import { NextResponse } from 'next/server';

/** Tells the browser whether large uploads can use direct-to-Blob (bypasses ~4.5MB function body limit). */
export async function GET() {
  return NextResponse.json({
    clientUpload: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  });
}
