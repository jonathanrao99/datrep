'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileUploader } from '@/components/file-uploader'
import { DataTable } from '@/components/data-table'
import { LoadingSpinner } from '@/components/loading-spinner'
import { parseFileInBrowser } from '@/lib/client-file-parser'
import { Upload, FileText, Brain, Database, Clock, AlertCircle, BarChart3, Eye } from 'lucide-react'
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

    try {
      // Parse file in browser first - guarantees we have columns/preview regardless of server
      const clientParsed = await parseFileInBrowser(file)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('columns', JSON.stringify(clientParsed.columns))
      formData.append('preview', JSON.stringify(clientParsed.preview))

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.error || 'Upload failed')
      }

      const data: UploadResponse = await response.json()
      // Use client-parsed data if server returned empty (fallback)
      const finalData: UploadResponse = {
        ...data,
        columns: (data.columns?.length ?? 0) > 0 ? data.columns : clientParsed.columns,
        preview: (data.preview?.length ?? 0) > 0 ? data.preview : clientParsed.preview,
      }
      setUploadResponse(finalData)
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

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
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
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-slate-600" />
                  <h4 className="text-sm font-medium text-slate-700">Data Preview</h4>
                  <Badge variant="outline" className="bg-slate-50 text-slate-700">
                    {uploadResponse.preview.length} rows
                  </Badge>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <DataTable data={uploadResponse.preview} />
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