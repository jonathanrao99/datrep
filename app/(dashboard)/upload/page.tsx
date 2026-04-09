'use client'

import { useState } from 'react'
import { upload as blobClientUpload } from '@vercel/blob/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileUploader } from '@/components/file-uploader'
import { DataTable } from '@/components/data-table'
import { LoadingSpinner } from '@/components/loading-spinner'
import { parseFileInBrowser } from '@/lib/client-file-parser'
import { Upload, FileText, Brain, Database, AlertCircle, BarChart3, Sparkles, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface UploadResponse {
  file_id: string
  filename: string
  size: number
  columns: string[]
  preview: any[]
  uploaded_at: string
  blob_pathname?: string
  blob_url?: string
}

/** Vercel serverless request bodies are ~4.5MB max; larger files go browser → Blob. */
const LARGE_UPLOAD_BYTES = 4 * 1024 * 1024

function safeBasename(name: string): string {
  const base = name.replace(/^.*[/\\]/, '')
  return base || 'dataset.csv'
}

function extFromFilename(name: string): string {
  const lower = name.toLowerCase()
  if (lower.endsWith('.xlsx')) return '.xlsx'
  if (lower.endsWith('.xls')) return '.xls'
  return '.csv'
}

interface AnalysisResponse {
  file_id: string
  statistics: any
  missing_values: any
  data_types: any
  insights: any[]
  analyzed_at: string
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiSuggestedQuestions, setAiSuggestedQuestions] = useState<string[]>([])
  const [aiQualityRisks, setAiQualityRisks] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleFileDrop = (file: File) => {
    setFile(file)
    setError(null)
    setUploadResponse(null)
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setError(null)
    setAiSummary(null)
    setAiSuggestedQuestions([])
    setAiQualityRisks([])

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? ''
      // Parse file in browser first - guarantees we have columns/preview regardless of server
      const clientParsed = await parseFileInBrowser(file)

      if (file.size > LARGE_UPLOAD_BYTES) {
        const capRes = await fetch(`${apiBase}/api/blob/capabilities`)
        const cap = (await capRes.json().catch(() => ({}))) as { clientUpload?: boolean }

        if (!cap.clientUpload) {
          throw new Error(
            'Files over 4 MB cannot be sent through the server on Vercel. Add a Blob store to this project in the Vercel dashboard (sets BLOB_READ_WRITE_TOKEN), redeploy, then try again. For local dev without Blob, use a smaller file or run `vercel env pull`.'
          )
        }

        const fileId = crypto.randomUUID()
        const safeName = safeBasename(file.name)
        const pathname = `${fileId}_${safeName}`

        const blobResult = await blobClientUpload(pathname, file, {
          access: 'private',
          handleUploadUrl: `${apiBase}/api/blob/client-upload`,
          multipart: true,
        })

        const uploadedAt = new Date().toISOString()
        const registerRes = await fetch(`${apiBase}/api/upload/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_id: fileId,
            blob_url: blobResult.url,
            blob_pathname: blobResult.pathname,
            filename: file.name,
            size: file.size,
            file_type: extFromFilename(safeName),
            columns: clientParsed.columns,
            preview: clientParsed.preview,
            uploaded_at: uploadedAt,
          }),
        })

        if (!registerRes.ok) {
          const errJson = await registerRes.json().catch(() => ({}))
          throw new Error(errJson.error || errJson.detail || 'Failed to register upload')
        }

        const data: UploadResponse = await registerRes.json()
        const finalData: UploadResponse = {
          ...data,
          columns: (data.columns?.length ?? 0) > 0 ? data.columns : clientParsed.columns,
          preview: (data.preview?.length ?? 0) > 0 ? data.preview : clientParsed.preview,
        }
        setUploadResponse(finalData)
      } else {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('columns', JSON.stringify(clientParsed.columns))
        formData.append('preview', JSON.stringify(clientParsed.preview))

        const response = await fetch(`${apiBase}/api/upload`, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.detail || errorData.error || 'Upload failed')
        }

        const data: UploadResponse = await response.json()
        const finalData: UploadResponse = {
          ...data,
          columns: (data.columns?.length ?? 0) > 0 ? data.columns : clientParsed.columns,
          preview: (data.preview?.length ?? 0) > 0 ? data.preview : clientParsed.preview,
        }
        setUploadResponse(finalData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!uploadResponse?.file_id) {
      setError('Please upload a file first')
      return
    }
    setIsAnalyzing(true)
    setError(null)
    try {
      // Use the file_id from the upload response
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_id: uploadResponse.file_id,
          ...(uploadResponse.blob_pathname && uploadResponse.filename && {
            blob_pathname: uploadResponse.blob_pathname,
            filename: uploadResponse.filename,
          }),
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || errorData.detail || errorData.error || 'Analysis failed')
      }
      
      const data: AnalysisResponse = await response.json()
      console.log('Analysis completed successfully:', data)
      
      // Redirect to insights page, including Blob info when available (DB-free mode)
      const query =
        uploadResponse.blob_pathname && uploadResponse.filename
          ? `?blob_pathname=${encodeURIComponent(uploadResponse.blob_pathname)}&filename=${encodeURIComponent(
              uploadResponse.filename
            )}`
          : ''

      const targetUrl = `/insights/${uploadResponse.file_id}${query}`
      console.log('Redirecting to insights page:', targetUrl)

      // Try multiple redirect methods
      try {
        router.push(targetUrl)
      } catch (redirectError) {
        console.error('Router push failed, trying window.location:', redirectError)
        window.location.href = targetUrl
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleQuickAiSummary = async () => {
    if (!uploadResponse) return
    setIsSummarizing(true)
    setError(null)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/upload/describe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          columns: uploadResponse.columns,
          preview: uploadResponse.preview,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.details || errorData.detail || errorData.error || 'Failed to generate AI summary'
        )
      }

      const data = (await response.json()) as {
        summary: string
        suggested_questions: string[]
        data_quality_risks: string[]
      }

      setAiSummary(data.summary)
      setAiSuggestedQuestions(Array.isArray(data.suggested_questions) ? data.suggested_questions : [])
      setAiQualityRisks(Array.isArray(data.data_quality_risks) ? data.data_quality_risks : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI summary')
    } finally {
      setIsSummarizing(false)
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[min(100%,92rem)] space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Upload Dataset</h1>
        <p className="text-slate-600">
          Upload your CSV or Excel file to get AI-powered insights and visualizations
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-slate-900">Upload File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUploader 
            onDrop={handleFileDrop}
            onError={setError}
          />
          
          {file && (
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <FileText className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{file.name}</p>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                {file.type || 'Unknown type'}
              </Badge>
            </div>
          )}

          <Button 
            onClick={handleUpload} 
            disabled={!file || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <LoadingSpinner size="sm" text="Uploading..." />
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Upload Response */}
      {uploadResponse && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-900">File Uploaded Successfully</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-slate-600" />
                  <p className="text-sm font-medium text-slate-700">File Name</p>
                </div>
                <p className="font-medium text-slate-900">{uploadResponse.filename}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-slate-600" />
                  <p className="text-sm font-medium text-slate-700">File Size</p>
                </div>
                <p className="font-medium text-slate-900">{formatFileSize(uploadResponse.size)}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-slate-600" />
                  <p className="text-sm font-medium text-slate-700">Columns</p>
                </div>
                <p className="font-medium text-slate-900">{uploadResponse.columns.length} columns</p>
              </div>
            </div>

            {/* Data Preview */}
            {uploadResponse.preview && uploadResponse.preview.length > 0 && (
              <div className="space-y-4">
                <DataTable data={uploadResponse.preview} embedded showRowNumbers title="Data Preview" />

                {/* AI quick summary — single card, vertical flow */}
                <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white via-slate-50/40 to-slate-50/80 shadow-sm ring-1 ring-slate-900/[0.04]">
                  <div className="flex flex-col gap-5 border-b border-slate-200/80 bg-white/90 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 md:px-6">
                    <div className="flex min-w-0 gap-4">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25"
                        aria-hidden
                      >
                        <Brain className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <h3 className="text-base font-semibold tracking-tight text-slate-900">
                          AI dataset overview
                        </h3>
                        <p className="text-sm leading-relaxed text-slate-600">
                          Get a short read of what you uploaded, angles to analyze, and quick quality notes—before
                          running full insights.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleQuickAiSummary}
                      disabled={isSummarizing}
                      className="h-11 shrink-0 rounded-xl bg-indigo-600 px-5 text-sm font-medium shadow-sm hover:bg-indigo-700 sm:w-auto w-full"
                    >
                      {isSummarizing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                          Generating…
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4 opacity-90" aria-hidden />
                          {aiSummary ? 'Regenerate overview' : 'Generate overview'}
                        </>
                      )}
                    </Button>
                  </div>

                  {(isSummarizing || aiSummary) && (
                    <div className="px-5 py-5 md:px-6 md:py-6">
                      {isSummarizing && !aiSummary ? (
                        <div className="flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white/60 py-10">
                          <LoadingSpinner size="md" text="Reading your columns and sample rows…" />
                        </div>
                      ) : (
                        aiSummary && (
                          <div className="space-y-6">
                            <div className="rounded-xl border border-indigo-100/90 bg-indigo-50/35 px-4 py-4 md:px-5 md:py-5">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700/90">
                                Summary
                              </p>
                              <p className="mt-2 text-[15px] leading-relaxed text-slate-800">{aiSummary}</p>
                            </div>

                            {(aiSuggestedQuestions.length > 0 || aiQualityRisks.length > 0) && (
                              <div className="grid gap-4 md:grid-cols-2">
                                {aiSuggestedQuestions.length > 0 && (
                                  <div className="rounded-xl border border-indigo-200/60 bg-white p-4 shadow-sm md:p-5">
                                    <p className="text-sm font-semibold text-slate-900">Questions to explore</p>
                                    <p className="mt-0.5 text-xs text-slate-500">Good starting points for deeper analysis</p>
                                    <ul className="mt-4 space-y-3">
                                      {aiSuggestedQuestions.slice(0, 6).map((q, idx) => (
                                        <li key={idx} className="flex gap-3 text-sm leading-snug text-slate-700">
                                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500 ring-4 ring-indigo-500/15" />
                                          <span>{q}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {aiQualityRisks.length > 0 && (
                                  <div className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-4 shadow-sm md:p-5">
                                    <p className="text-sm font-semibold text-amber-950">Data quality watchouts</p>
                                    <p className="mt-0.5 text-xs text-amber-900/70">Worth a second look before you trust every number</p>
                                    <ul className="mt-4 space-y-3">
                                      {aiQualityRisks.slice(0, 6).map((q, idx) => (
                                        <li key={idx} className="flex gap-3 text-sm leading-snug text-amber-950/90">
                                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500 ring-4 ring-amber-500/20" />
                                          <span>{q}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full"
            >
              {isAnalyzing ? (
                <LoadingSpinner size="sm" text="Analyzing data..." />
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate AI Insights
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}


    </div>
  )
} 