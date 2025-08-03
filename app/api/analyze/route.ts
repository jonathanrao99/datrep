import { NextRequest, NextResponse } from 'next/server'

// Configure for large file uploads
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes timeout

export async function POST(request: NextRequest) {
  try {
    // Forward the request to the backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'
    
    // Clone the request to preserve the body
    const clonedRequest = request.clone()
    
    const response = await fetch(`${backendUrl}/api/analyze`, {
      method: 'POST',
      body: clonedRequest.body,
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        'Content-Type': request.headers.get('content-type') || 'multipart/form-data',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: 'Analysis failed', details: error },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 