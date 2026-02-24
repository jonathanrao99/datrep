import { NextRequest, NextResponse } from 'next/server';
import { chatWithDataStandalone } from '@/lib/standalone-chat';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, file_id: fileId } = body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    if (!fileId) {
      return NextResponse.json(
        { error: 'file_id is required' },
        { status: 400 }
      );
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';

    try {
      const response = await fetch(`${backendUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), file_id: fileId }),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({
          success: true,
          answer: data.answer,
          question: data.question,
          message: data.message,
          timestamp: data.timestamp,
        });
      }

      const errorText = await response.text();
      if (response.status >= 500 && process.env.OPENROUTER_API_KEY) {
        const standaloneResult = await chatWithDataStandalone(fileId, question.trim());
        if (standaloneResult.success) {
          return NextResponse.json({
            success: true,
            answer: standaloneResult.answer,
            question: question.trim(),
            message: standaloneResult.message,
            timestamp: standaloneResult.timestamp,
          });
        }
      }

      return NextResponse.json(
        { error: 'Chat failed', details: errorText },
        { status: response.status }
      );
    } catch (fetchErr: unknown) {
      const cause = (fetchErr as { cause?: { code?: string } })?.cause;
      const isConnectionError = cause?.code === 'ECONNREFUSED' || cause?.code === 'ECONNRESET';
      const isFetchFailed = fetchErr instanceof Error && fetchErr.message?.includes('fetch failed');

      if ((isConnectionError || isFetchFailed) && process.env.OPENROUTER_API_KEY) {
        const standaloneResult = await chatWithDataStandalone(fileId, question.trim());
        if (standaloneResult.success) {
          return NextResponse.json({
            success: true,
            answer: standaloneResult.answer,
            question: question.trim(),
            message: standaloneResult.message,
            timestamp: standaloneResult.timestamp,
          });
        }
        return NextResponse.json(
          { error: 'Chat failed', details: standaloneResult.message },
          { status: 500 }
        );
      }
      throw fetchErr;
    }
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
