'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileUploader } from '@/components/custom/file-uploader'
import { DataTable } from '@/components/custom/data-table'
import { LoadingSpinner } from '@/components/custom/loading-spinner'
import { Upload, FileText, BarChart3, Brain, Download, Database, Target, Zap, Users, DollarSign, Wifi, GraduationCap, Lightbulb, Activity, Shield, Clock, Rocket, Eye, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface UploadResponse {
  id: string
  filename: string
  size: number
  columns: string[]
  preview: any[]
  uploaded_at: string
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
  const [analysisResponse, setAnalysisResponse] = useState<AnalysisResponse | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleFileDrop = (file: File) => {
    setFile(file)
    setError(null)
    setUploadResponse(null)
    setAnalysisResponse(null)
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Upload failed')
      }

      const data: UploadResponse = await response.json()
      setUploadResponse(data)
      console.log('Upload successful:', data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!uploadResponse?.id) {
      setError('Please upload a file first')
      return
    }
    setIsAnalyzing(true)
    setError(null)
    try {
      // For now, we'll use the same file that was uploaded
      if (!file) {
        throw new Error('No file available for analysis')
      }
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analyze`, {
        method: 'POST',
        body: formData, // Changed to send FormData directly
      })
      const data: AnalysisResponse = await response.json()
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Analysis failed')
      }
      setAnalysisResponse(data)
      console.log('Analysis completed successfully:', data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleViewResults = () => {
    const fileId = analysisResponse?.file_id || uploadResponse?.id
    if (fileId) {
              router.push(`/view/${fileId}`)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getInsightIcon = (title: string) => {
    const lowerTitle = title.toLowerCase()
    if (lowerTitle.includes('funding') || lowerTitle.includes('money') || lowerTitle.includes('cost')) {
      return <DollarSign className="h-4 w-4 text-emerald-600" />
    }
    if (lowerTitle.includes('teacher') || lowerTitle.includes('class') || lowerTitle.includes('ratio')) {
      return <Users className="h-4 w-4 text-blue-600" />
    }
    if (lowerTitle.includes('internet') || lowerTitle.includes('digital') || lowerTitle.includes('access')) {
      return <Wifi className="h-4 w-4 text-purple-600" />
    }
    if (lowerTitle.includes('socioeconomic') || lowerTitle.includes('income') || lowerTitle.includes('economic')) {
      return <GraduationCap className="h-4 w-4 text-orange-600" />
    }
    if (lowerTitle.includes('data') || lowerTitle.includes('dataset') || lowerTitle.includes('quality')) {
      return <Database className="h-4 w-4 text-slate-600" />
    }
    if (lowerTitle.includes('variable') || lowerTitle.includes('metric') || lowerTitle.includes('analysis')) {
      return <Target className="h-4 w-4 text-indigo-600" />
    }
    if (lowerTitle.includes('size') || lowerTitle.includes('volume') || lowerTitle.includes('records')) {
      return <BarChart3 className="h-4 w-4 text-cyan-600" />
    }
    return <Lightbulb className="h-4 w-4 text-amber-600" />
  }

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
          High Confidence
        </Badge>
      case 'medium':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">
          Medium Confidence
        </Badge>
      case 'low':
        return <Badge className="bg-red-50 text-red-700 border-red-200">
          Low Confidence
        </Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const extractQuantities = (description: string) => {
    const numbers = description.match(/\d+(?:\.\d+)?%?/g) || []
    return numbers.slice(0, 3) // Return first 3 numbers found
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

      {/* Analysis Response */}
      {analysisResponse && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-900">Analysis Complete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-slate-600" />
                  <p className="text-sm font-medium text-slate-700">File ID</p>
                </div>
                <p className="font-medium text-sm text-slate-900">{analysisResponse.file_id}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-4 w-4 text-slate-600" />
                  <p className="text-sm font-medium text-slate-700">Insights</p>
                </div>
                <p className="text-2xl font-semibold text-slate-900">{analysisResponse.insights.length}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-slate-600" />
                  <p className="text-sm font-medium text-slate-700">Analyzed At</p>
                </div>
                <p className="font-medium text-sm text-slate-900">{new Date(analysisResponse.analyzed_at).toLocaleDateString()}</p>
              </div>
            </div>

            {/* AI Insights */}
            {analysisResponse.insights && analysisResponse.insights.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-slate-600" />
                  <h4 className="text-lg font-semibold text-slate-900">AI Insights</h4>
                  <Badge variant="outline" className="bg-slate-50 text-slate-700">
                    {analysisResponse.insights.length} Discovered
                  </Badge>
                </div>
                <div className="grid gap-4">
                  {analysisResponse.insights.map((insight, index) => {
                    const quantities = extractQuantities(insight.description)
                    return (
                      <div key={index} className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 rounded-lg">
                              {getInsightIcon(insight.title)}
                            </div>
                            <h5 className="font-medium text-slate-900">{insight.title}</h5>
                          </div>
                          {getConfidenceBadge(insight.confidence)}
                        </div>
                        
                        {quantities.length > 0 && (
                          <div className="flex gap-2 mb-3">
                            {quantities.map((qty, qtyIndex) => (
                              <Badge key={qtyIndex} variant="outline" className="bg-slate-50 text-slate-700">
                                {qty}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        <p className="text-sm text-slate-600 mb-3 leading-relaxed">{insight.description}</p>
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-sm font-medium text-slate-900 mb-1">Business Impact</p>
                          <p className="text-sm text-slate-600">{insight.business_impact}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <Button 
                onClick={handleViewResults}
                className="flex-1"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Full Analysis
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 