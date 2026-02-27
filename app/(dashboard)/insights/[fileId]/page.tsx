'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/loading-spinner'
import { ChatInterface } from '@/components/chat-interface'
import { 
  Brain, 
  Download, 
  ArrowLeft, 
  DollarSign, 
  Users, 
  Wifi, 
  GraduationCap, 
  Database, 
  Target, 
  BarChart3, 
  Lightbulb, 
  Activity, 
  Shield, 
  Clock, 
  Rocket, 
  Eye, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle,
  Share2,
  MessageSquare
} from 'lucide-react'

interface AnalysisResponse {
  file_id: string
  statistics: any
  missing_values: any
  data_types: any
  insights: any[]
  analyzed_at: string
}

export default function InsightsPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileId = params.fileId as string
  const blobPathname = searchParams.get('blob_pathname')
  const filename = searchParams.get('filename')
  
  const [analysisResponse, setAnalysisResponse] = useState<AnalysisResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [showAllInsights, setShowAllInsights] = useState(false)
  const TOP_INSIGHTS_COUNT = 8

  useEffect(() => {
    if (fileId) {
      loadAnalysis()
    }
  }, [fileId, blobPathname, filename])

  const loadAnalysis = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // DB-free path: when blob info is available, call /api/analyze which
      // reads directly from Vercel Blob using blob_pathname + filename.
      if (blobPathname && filename) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file_id: fileId,
            blob_pathname: blobPathname,
            filename,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.details || errorData.detail || errorData.error || 'Analysis failed')
        }

        const raw: any = await response.json()
        const insightsObj = raw.insights ?? {}
        const insightsArray = Array.isArray(insightsObj.insights)
          ? insightsObj.insights
          : Array.isArray(raw.insights)
          ? raw.insights
          : []
        const dataSummary = (raw.data_summary as Record<string, unknown>) ?? {}

        const mapped: AnalysisResponse = {
          file_id: fileId,
          statistics: (dataSummary as any).statistics ?? {},
          missing_values: (dataSummary as any).missing_values ?? {},
          data_types: (dataSummary as any).data_types ?? {},
          insights: Array.isArray(insightsArray) ? insightsArray : [],
          analyzed_at: (raw.generated_at as string) ?? new Date().toISOString(),
        }

        setAnalysisResponse(mapped)
        return
      }

      // Fallback: legacy behavior using /api/analysis (requires Postgres or backend)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/analysis/${fileId}`)

      if (!response.ok) {
        throw new Error('Analysis not found')
      }

      const data: AnalysisResponse = await response.json()

      // Validate the data structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid analysis data')
      }

      // Ensure insights is an array (API normalizes JSON-in-description already)
      if (!Array.isArray(data.insights)) {
        console.warn('Insights is not an array:', data.insights)
        data.insights = []
      }

      setAnalysisResponse(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analysis')
    } finally {
      setIsLoading(false)
    }
  }

  const getInsightIcon = (title: string) => {
    const lowerTitle = title.toLowerCase()
    if (lowerTitle.includes('retention') || lowerTitle.includes('attrition') || lowerTitle.includes('turnover') || lowerTitle.includes('employee')) {
      return <Users className="h-4 w-4 text-rose-600" />
    }
    if (lowerTitle.includes('funding') || lowerTitle.includes('money') || lowerTitle.includes('cost') || lowerTitle.includes('sales') || lowerTitle.includes('revenue') || lowerTitle.includes('gross') || lowerTitle.includes('returns') || lowerTitle.includes('discount')) {
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
    if (lowerTitle.includes('research') || lowerTitle.includes('development') || lowerTitle.includes('workforce') || lowerTitle.includes('department')) {
      return <BarChart3 className="h-4 w-4 text-indigo-600" />
    }
    return <Lightbulb className="h-4 w-4 text-amber-600" />
  }

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold tracking-wide border border-emerald-200 shadow-sm">
            <CheckCircle className="h-3.5 w-3.5" />
            High Confidence
          </span>
        )
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 text-xs font-semibold tracking-wide border border-amber-200 shadow-sm">
            <Shield className="h-3.5 w-3.5" />
            Medium Confidence
          </span>
        )
      case 'low':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold tracking-wide border border-red-200 shadow-sm">
            <AlertCircle className="h-3.5 w-3.5" />
            Low Confidence
          </span>
        )
      default:
        return <Badge variant="secondary" className="text-xs font-medium">Unknown</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Highlight numbers and percentages in text for premium scannability
  const highlightNumbers = (text: string) => {
    const parts = text.split(/(\d+(?:,\d{3})*(?:\.\d+)?%?|\$\d+(?:,\d{3})*(?:\.\d{2})?)/g)
    return parts.map((part, i) => {
      if (/^\d+(?:,\d{3})*(?:\.\d+)?%?$/.test(part) || /^\$\d+(?:,\d{3})*(?:\.\d{2})?$/.test(part)) {
        return (
          <span key={i} className="font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">
            {part}
          </span>
        )
      }
      return <span key={i}>{part}</span>
    })
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 space-y-8 max-w-6xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">{error}</span>
            </div>
            <Button 
              onClick={() => router.push('/upload')} 
              variant="outline" 
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Upload
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!analysisResponse) {
    return (
      <div className="p-6 space-y-8 max-w-6xl mx-auto">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">No analysis found for this file</span>
            </div>
            <Button 
              onClick={() => router.push('/upload')} 
              variant="outline" 
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Upload
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="p-8 lg:p-12 space-y-12 max-w-5xl mx-auto">
        {/* Header */}
        <header className="pb-8 border-b border-slate-200">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <Button 
                  onClick={() => router.push('/upload')} 
                  variant="outline" 
                  size="sm"
                  className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200 -ml-2"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <span className="text-slate-300 font-light">|</span>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  AI Insights
                </h1>
              </div>
              <p className="text-slate-600 text-[15px] leading-relaxed max-w-xl">
                {Array.isArray(analysisResponse.insights) && analysisResponse.insights.length > 0
                  ? `Your dataset has been analyzed. ${analysisResponse.insights.length} key finding${analysisResponse.insights.length === 1 ? ' was' : 's were'} identified.`
                  : 'Your analysis is ready for review.'}
              </p>
            </div>
            
            <div className="flex gap-3 shrink-0">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 shadow-sm"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button 
                size="sm"
                onClick={() => router.push(`/view/${fileId}`)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Full Analysis
              </Button>
            </div>
          </div>
        </header>

        {/* Analysis Summary */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50">
                <Database className="h-5 w-5 text-slate-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Analysis Reference</p>
                <p className="text-sm font-mono font-medium text-slate-800 truncate mt-1" title={analysisResponse.file_id}>
                  {analysisResponse.file_id.slice(0, 8)}...
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-sm">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-widest">Key Findings</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {Array.isArray(analysisResponse.insights) ? analysisResponse.insights.length : 0} insight{analysisResponse.insights?.length !== 1 ? 's' : ''} identified
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50">
                <Clock className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Completed</p>
                <p className="text-sm font-medium text-slate-700 mt-1">{formatDate(analysisResponse.analyzed_at)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Insights */}
        <section className="space-y-8">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-md">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Executive Summary</h2>
              <p className="text-slate-600 text-sm mt-2 leading-relaxed max-w-2xl">
                Insights generated from your dataset. Each finding includes a description, recommended actions, and confidence assessment.
              </p>
            </div>
          </div>

          <div className="space-y-8">
            {Array.isArray(analysisResponse.insights) && analysisResponse.insights.length > 0 ? (
              <>
                {(showAllInsights ? analysisResponse.insights : analysisResponse.insights.slice(0, TOP_INSIGHTS_COUNT)).map((insight, index) => {
                const title = insight.title?.replace(/^[^\w\s]+/, '').trim() || `Insight ${index + 1}`
                const description = typeof insight.description === 'string' ? insight.description : ''
                const businessImpact = insight.business_impact || ''
                const funFact = (insight as { fun_fact?: string }).fun_fact
                
                return (
                  <article 
                    key={index} 
                    className="group rounded-2xl bg-white border border-slate-200 shadow-md overflow-hidden hover:shadow-xl hover:border-slate-300 transition-all duration-300"
                  >
                    <div className="border-l-4 border-indigo-500">
                      <div className="p-6 lg:p-8">
                        <div className="flex items-start gap-5">
                          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-100/50 shrink-0 group-hover:from-indigo-100/50 group-hover:to-slate-100/50 transition-colors">
                            {getInsightIcon(title)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-xl font-bold text-slate-900 leading-snug tracking-tight">
                              {title}
                            </h3>
                            <div className="mt-3">
                              {getConfidenceBadge(insight.confidence)}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="px-6 lg:px-8 pb-6 lg:pb-8 space-y-6">
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Summary</p>
                          <div className="text-slate-700 leading-relaxed text-[15px]">
                            {highlightNumbers(description)}
                          </div>
                        </div>
                        
                        <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/60 p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <Rocket className="h-4 w-4 text-amber-600" />
                            <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-widest">Recommended Actions</p>
                          </div>
                          <div className="text-slate-700 leading-relaxed text-[15px]">
                            {highlightNumbers(businessImpact)}
                          </div>
                        </div>

                        {funFact && (
                          <div className="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200 p-5">
                            <div className="flex items-center gap-2 mb-3">
                              <Lightbulb className="h-4 w-4 text-amber-500" />
                              <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest">Notable Detail</p>
                            </div>
                            <div className="text-slate-700 leading-relaxed text-[15px]">
                              {highlightNumbers(funFact)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
                {analysisResponse.insights.length > TOP_INSIGHTS_COUNT && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowAllInsights(!showAllInsights)}
                      className="border-slate-200"
                    >
                      {showAllInsights ? 'Show top insights only' : `View all ${analysisResponse.insights.length} insights`}
                    </Button>
                  </div>
                )}
              </>
          ) : (
            <article className="rounded-2xl bg-white border border-slate-200 shadow-md p-16">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-5">
                  <Brain className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Insights Available</h3>
                <p className="text-slate-600 text-sm max-w-sm mx-auto leading-relaxed">
                  No insights were generated for this analysis. Try re-analyzing or uploading a different file.
                </p>
              </div>
            </article>
          )}
          </div>
        </section>

      {/* Chat FAB - fixed bottom right */}
      <button
        onClick={() => setShowChat(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-900/30 transition-all hover:bg-indigo-700 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-300 focus:ring-offset-2"
        aria-label="Chat with your data"
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      {/* Chat Modal */}
      {showChat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl">
            <ChatInterface fileId={fileId} onClose={() => setShowChat(false)} />
          </div>
        </div>
      )}
      </div>
    </div>
  )
} 