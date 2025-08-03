'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/custom/loading-spinner'
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
  Share2
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
  const fileId = params.fileId as string
  
  const [analysisResponse, setAnalysisResponse] = useState<AnalysisResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (fileId) {
      loadAnalysis()
    }
  }, [fileId])

  const loadAnalysis = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analysis/${fileId}`)
      
      if (!response.ok) {
        throw new Error('Analysis not found')
      }
      
      const data: AnalysisResponse = await response.json()
      
      // Validate the data structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid analysis data')
      }
      
      // Ensure insights is an array
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => router.push('/upload')} 
              variant="ghost" 
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-slate-900">AI Insights</h1>
          </div>
          <p className="text-slate-600">
            Discovered {Array.isArray(analysisResponse.insights) ? analysisResponse.insights.length : 0} insights from your data analysis
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push(`/view/${fileId}`)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            View Full Analysis
          </Button>
        </div>
      </div>

      {/* Analysis Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-slate-500" />
              <div>
                <p className="text-sm text-slate-600">File ID</p>
                <p className="font-medium text-slate-900">{analysisResponse.file_id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Brain className="h-5 w-5 text-slate-500" />
              <div>
                <p className="text-sm text-slate-600">Insights</p>
                <p className="font-medium text-slate-900">{Array.isArray(analysisResponse.insights) ? analysisResponse.insights.length : 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-slate-500" />
              <div>
                <p className="text-sm text-slate-600">Analyzed At</p>
                <p className="font-medium text-slate-900">{formatDate(analysisResponse.analyzed_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Key Insights</h2>
          <Badge variant="secondary">{Array.isArray(analysisResponse.insights) ? analysisResponse.insights.length : 0} Discovered</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.isArray(analysisResponse.insights) && analysisResponse.insights.length > 0 ? (
            analysisResponse.insights.map((insight, index) => {
              const quantities = extractQuantities(insight.description)
              
              return (
                <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getInsightIcon(insight.title)}
                        <CardTitle className="text-lg">{insight.title}</CardTitle>
                      </div>
                      {getConfidenceBadge(insight.confidence)}
                    </div>
                    
                    {quantities.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {quantities.map((qty, qtyIndex) => (
                          <Badge key={qtyIndex} variant="outline" className="text-xs">
                            {qty}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div 
                      className="text-sm text-slate-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: insight.description }}
                    />
                    
                    <div className="pt-3 border-t border-slate-100">
                      <p className="text-xs font-medium text-slate-600 mb-1">Business Impact</p>
                      <p className="text-sm text-slate-700">{insight.business_impact}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          ) : (
            <Card className="border-0 shadow-sm col-span-full">
              <CardContent className="p-6">
                <div className="text-center">
                  <Brain className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No Insights Available</h3>
                  <p className="text-slate-600">No insights were generated for this analysis.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
} 