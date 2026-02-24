import { NextRequest, NextResponse } from 'next/server';
import { deleteFileById } from '@/lib/db';

export const runtime = 'nodejs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

    if (process.env.POSTGRES_URL) {
      await deleteFileById(fileId);
    }

    // Optionally call backend to delete the physical file
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    try {
      await fetch(`${backendUrl}/api/files/${fileId}`, { method: 'DELETE' });
    } catch {
      // Backend delete is best-effort; DB record is primary
    }

    return NextResponse.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
