'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSpinner } from '@/components/loading-spinner'
import { DataTable } from '@/components/data-table'
import { ChartRenderer } from '@/components/chart-renderer'
import { ChatInterface } from '@/components/chat-interface'
import { 
  FileText, 
  BarChart3, 
  Brain, 
  Download, 
  Share2, 
  MessageSquare,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Database,
  Target,
  Zap,
  TrendingDown,
  Users,
  DollarSign,
  Globe,
  Wifi,
  GraduationCap,
  Lightbulb,
  BarChart,
  PieChart,
  Activity,
  Shield,
  Clock,
  Star,
  Award,
  Rocket,
  Eye,
  Search,
  Filter,
  Info,
  ChevronRight,
  ExternalLink,
  ArrowLeft,
  Home,
  Copy,
  Check
} from 'lucide-react'

interface AnalysisData {
  file_id: string
  file_info?: { original_filename?: string }
  statistics?: any
  missing_values?: any
  data_types?: any
  insights: Array<{
    title: string
    description: string
    business_impact: string
    confidence: string
  }>
  insights_full?: {
    insights?: any[]
    patterns?: string[]
    data_quality?: { issues: string[]; recommendations: string[] }
  }
  charts?: any[]
  data_summary?: any
  analyzed_at: string
}

export default function ViewPage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showAllInsights, setShowAllInsights] = useState(false)
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([])
  const TOP_INSIGHTS_COUNT = 8

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fileId = params.id as string
        
        // Fetch real data from the API
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/analysis/${fileId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch analysis data')
        }
        
        const analysisData = await response.json()
        
        // Use the API response directly since it matches our interface
        setData(analysisData)
        setLoading(false)
        // Fetch raw data for DataTable
        try {
          const dataRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/data/${fileId}`)
          if (dataRes.ok) {
            const { data: rows } = await dataRes.json()
            setRawData(Array.isArray(rows) ? rows : [])
          }
        } catch {
          /* ignore */
        }
      } catch (err) {
        console.error('Error fetching analysis data:', err)
        setError('Failed to load analysis data')
        setLoading(false)
      }
    }

    fetchData()
  }, [params.id])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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

  const getInsightIcon = (title: string) => {
    const lowerTitle = title.toLowerCase()
    
    if (lowerTitle.includes('funding') || lowerTitle.includes('money') || lowerTitle.includes('cost')) {
      return <DollarSign className="h-5 w-5 text-emerald-600" />
    }
    if (lowerTitle.includes('test') || lowerTitle.includes('score') || lowerTitle.includes('performance')) {
      return <GraduationCap className="h-5 w-5 text-blue-600" />
    }
    if (lowerTitle.includes('teacher') || lowerTitle.includes('class') || lowerTitle.includes('ratio')) {
      return <Users className="h-5 w-5 text-purple-600" />
    }
    if (lowerTitle.includes('internet') || lowerTitle.includes('digital') || lowerTitle.includes('access')) {
      return <Wifi className="h-5 w-5 text-cyan-600" />
    }
    if (lowerTitle.includes('trend') || lowerTitle.includes('pattern') || lowerTitle.includes('correlation')) {
      return <TrendingUp className="h-5 w-5 text-orange-600" />
    }
    if (lowerTitle.includes('quality') || lowerTitle.includes('issue') || lowerTitle.includes('problem')) {
      return <AlertCircle className="h-5 w-5 text-red-600" />
    }
    if (lowerTitle.includes('recommendation') || lowerTitle.includes('suggestion') || lowerTitle.includes('improvement')) {
      return <Lightbulb className="h-5 w-5 text-yellow-600" />
    }
    if (lowerTitle.includes('anomaly') || lowerTitle.includes('outlier') || lowerTitle.includes('unusual')) {
      return <Activity className="h-5 w-5 text-pink-600" />
    }
    
    return <Brain className="h-5 w-5 text-slate-600" />
  }

  const extractQuantities = (description: string) => {
    const numberRegex = /(\d+(?:\.\d+)?%?|\$\d+(?:,\d{3})*(?:\.\d{2})?)/g
    const numbers = description.match(numberRegex)
    return numbers ? numbers.slice(0, 3) : []
  }

  const getChartDescription = (type: string, config: any, title?: string) => {
    if (title?.includes('Missing Values')) {
      return 'Shows which columns have the most empty or null cells. Use this to prioritize data cleaning and identify quality issues.'
    }
    const x = config?.x_axis?.replace?.(/_/g, ' ') ?? 'categories'
    const y = config?.y_axis?.replace?.(/_/g, ' ') ?? 'values'
    switch (type) {
      case 'scatter':
        return `This scatter plot reveals the relationship between ${x} and ${y}. Each point represents a row in your dataset—look for clusters and trends to uncover correlations.`
      case 'bar':
        return `This bar chart compares ${y} across categories. Use it to quickly identify top performers and spot outliers.`
      case 'pie':
        return `This pie chart shows how ${y} is distributed across ${x}. Each slice represents a category's share of the total.`
      case 'donut':
        return `This donut chart displays the proportional breakdown of ${y} by ${x}. The center space makes it easier to compare slice sizes.`
      case 'histogram':
        return `This histogram shows the frequency distribution of ${x}. Use it to understand spread, central tendency, and skew in your data.`
      case 'area':
        return `This area chart shows the cumulative trend of ${y} over ${x}. The filled area highlights growth or decline over the sequence.`
      case 'line':
        return `This line chart tracks ${y} across ${x}. Ideal for spotting trends and comparing category counts.`
      case 'correlation_matrix':
        return `This correlation matrix visualizes relationships between variables. Colors indicate strength—darker means stronger correlation.`
      default:
        return `This visualization helps you understand patterns and relationships in your data.`
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy URL:', err)
    }
  }

  const handleExport = async () => {
    if (!data) return
    setExporting(true)
    try {
      // Create a comprehensive report
      const insightsArr = Array.isArray(data.insights) ? data.insights : (data.insights_full?.insights ?? []);
      const patterns = data.insights_full?.patterns ?? [];
      const dataQuality = data.insights_full?.data_quality ?? { issues: [], recommendations: [] };

      const reportData = {
        filename: data.file_info?.original_filename ?? 'dataset',
        analysisDate: new Date().toISOString(),
        summary: {
          totalRecords: data.data_summary?.rows ?? 0,
          totalColumns: data.data_summary?.columns ?? 0,
          insights: insightsArr.length,
          charts: (data.charts ?? []).length
        },
        insights: insightsArr,
        patterns,
        dataQuality
      }

      // Create downloadable JSON report
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${(data.file_info?.original_filename ?? 'dataset').replace(/\.[^/.]+$/, '')}_analysis_report.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      // Show success message
      alert('Analysis report downloaded successfully!')
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" text="Loading analysis..." />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Analysis not found</h3>
            <p className="text-slate-600 mb-4">
              {error || 'The requested analysis could not be found'}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => window.history.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button onClick={() => router.push('/upload')}>
                <FileText className="h-4 w-4 mr-2" />
                Upload New File
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-sm text-slate-600">
        <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="h-auto p-0">
          <Home className="h-4 w-4 mr-1" />
          Home
        </Button>
        <ChevronRight className="h-4 w-4" />
        <Button variant="ghost" size="sm" onClick={() => router.push('/upload')} className="h-auto p-0">
          Upload
        </Button>
        <ChevronRight className="h-4 w-4" />
        <span className="text-slate-900 font-medium">Analysis</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Analysis Report</h1>
          <p className="text-sm text-slate-600 flex items-center gap-3 font-medium">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-slate-500" />
              Analysis completed on {formatDate(data.analyzed_at)}
            </span>
            <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
            <span className="flex items-center gap-1 font-mono text-xs">
              <Database className="h-4 w-4 text-slate-500" />
              Ref: {data.file_id.slice(0, 8)}...
            </span>
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm" onClick={handleShare}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Share
              </>
            )}
          </Button>
          <Button size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Analysis Reference</p>
                <p className="text-sm font-mono text-slate-800 mt-1 truncate" title={data.file_id}>
                  {data.file_id.slice(0, 8)}...
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <Database className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Key Findings</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{(Array.isArray(data.insights) ? data.insights : []).length}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl">
                <BarChart3 className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Columns Analyzed</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{Object.keys(data.data_types || {}).length}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl">
                <Brain className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                  Columns with Missing Values
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Columns with empty cells</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {Object.entries(data.missing_values || {}).filter(([, v]) => (v as number) > 0).length}
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl">
                <BarChart className="h-8 w-8 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-50 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Overview
          </TabsTrigger>
          <TabsTrigger value="insights" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            All Insights
          </TabsTrigger>
          <TabsTrigger value="data" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Data & Visualizations
          </TabsTrigger>
          <TabsTrigger value="quality" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Data Quality
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Insights Summary */}
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-900">Executive Summary</CardTitle>
              <p className="text-sm text-slate-600">Key discoveries and recommended actions from your data analysis</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {(Array.isArray(data.insights) ? data.insights : []).length > 0 ? (Array.isArray(data.insights) ? data.insights : []).slice(0, 3).map((insight, index) => {
                const quantities = extractQuantities(insight.description)
                return (
                  <div key={index} className="flex items-start gap-6 p-6 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200 hover:shadow-md transition-all duration-300">
                    <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200">
                      {getInsightIcon(insight.title)}
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start justify-between">
                        <h4 className="text-lg font-bold text-slate-900">{insight.title}</h4>
                        {getConfidenceBadge(insight.confidence)}
                      </div>
                      <p className="text-slate-700 text-base leading-relaxed">{insight.description}</p>
                      {quantities.length > 0 && (
                        <div className="flex gap-3">
                          {quantities.map((qty, qtyIndex) => (
                            <Badge key={qtyIndex} variant="outline" className="bg-white text-slate-700 border-slate-300 font-semibold">
                              {qty}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="p-4 bg-amber-50/50 rounded-lg border border-amber-100">
                        <p className="font-semibold text-amber-800 text-sm mb-2 uppercase tracking-wide">Recommended Actions</p>
                        <p className="text-slate-700 text-sm leading-relaxed">{insight.business_impact}</p>
                      </div>
                    </div>
                  </div>
                )
              }) : (
                <div className="text-center py-8">
                  <p className="text-slate-600">No insights available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Patterns */}
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900">Identified Patterns</CardTitle>
              <p className="text-sm text-slate-600">Recurring themes and trends in your dataset</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.insights && data.insights.length > 0 ? data.insights.slice(0, 4).map((insight, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                    <p className="text-slate-700 text-sm">{insight.title}</p>
                  </div>
                )) : (
                  <div className="text-center py-4">
                    <p className="text-slate-600">No patterns available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Key Visualizations */}
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Key Visualizations
              </CardTitle>
              <p className="text-sm text-slate-600">Interactive charts that reveal important patterns in your data</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {(data.charts ?? []).length > 0 ? (data.charts ?? []).slice(0, 4).map((chart: any) => (
                  <div key={chart.id} className="space-y-4 p-5 rounded-xl border border-slate-200 bg-white hover:shadow-lg transition-shadow">
                    <div className="space-y-2">
                      <h4 className="text-lg font-bold text-slate-900">{chart.title}</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {getChartDescription(chart.type, chart.config, chart.title)}
                      </p>
                    </div>
                    <div className="h-80 rounded-xl border border-slate-200 bg-white overflow-hidden">
                      <ChartRenderer
                        type={chart.type}
                        title={chart.title}
                        config={chart.config}
                        data={chart.data ?? []}
                      />
                    </div>
                  </div>
                )) : data.insights && data.insights.length > 0 ? (
                  data.insights.slice(0, 2).map((insight: any, index: number) => (
                    <div key={index} className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="text-lg font-semibold text-slate-900">{insight.title}</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">{insight.description}</p>
                      </div>
                      <div className="h-80 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 shadow-sm overflow-hidden flex items-center justify-center">
                        <div className="text-center text-slate-500">
                          <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                          <p>Chart visualization coming soon</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-600">No visualizations available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="space-y-6">
            {data.insights && data.insights.length > 0 ? (
              <>
                {(showAllInsights ? data.insights : data.insights.slice(0, TOP_INSIGHTS_COUNT)).map((insight, index) => {
              const quantities = extractQuantities(insight.description)
              return (
                <Card key={index} className="border-0 shadow-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-100 rounded-lg">
                          {getInsightIcon(insight.title)}
                        </div>
                        <div>
                          <CardTitle className="text-lg text-slate-900">{insight.title}</CardTitle>
                          {quantities.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {quantities.map((qty, qtyIndex) => (
                                <Badge key={qtyIndex} variant="outline" className="bg-slate-50 text-slate-700">
                                  {qty}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {getConfidenceBadge(insight.confidence)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-slate-700 leading-relaxed">{insight.description}</p>
                    <div className="p-4 bg-amber-50/50 rounded-lg border border-amber-100">
                      <p className="font-semibold text-amber-800 text-sm mb-1 uppercase tracking-wide">Recommended Actions</p>
                      <p className="text-slate-700 text-sm leading-relaxed">{insight.business_impact}</p>
                    </div>
                    {(insight as { fun_fact?: string }).fun_fact && (
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="font-medium text-slate-600 text-sm mb-1">Notable Detail</p>
                        <p className="text-slate-700 text-sm">{(insight as { fun_fact?: string }).fun_fact}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
                {data.insights.length > TOP_INSIGHTS_COUNT && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowAllInsights(!showAllInsights)}
                      className="border-slate-200"
                    >
                      {showAllInsights ? 'Show top insights only' : `View all ${data.insights.length} insights`}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-600">No insights available</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Data & Visualizations Tab */}
        <TabsContent value="data" className="space-y-8">
          {/* Data Preview Section */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-900">Data Preview</CardTitle>
              <p className="text-sm text-slate-600">Explore your dataset with interactive filtering and sorting</p>
            </CardHeader>
            <CardContent>
              <DataTable 
                data={rawData} 
                title="Dataset Overview" 
                maxRows={15}
                showPagination={true}
              />
            </CardContent>
          </Card>

          {/* Report Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Total Rows</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{(data.data_summary?.rows ?? rawData.length) || '—'}</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Columns</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{(data.data_summary?.columns ?? (rawData[0] ? Object.keys(rawData[0]).length : 0)) || '—'}</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Visualizations</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{(data.charts ?? []).length}</p>
            </div>
          </div>

          {/* All Visualizations Section */}
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                Complete Visualizations
              </CardTitle>
              <p className="text-sm text-slate-600">Charts and graphs that tell the story of your data</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {(data.charts ?? []).map((chart: any, idx: number) => (
                  <div 
                    key={chart.id} 
                    className={`space-y-4 p-5 rounded-xl border bg-white transition-shadow hover:shadow-lg ${
                      idx === 0 ? 'lg:col-span-2 border-blue-200 bg-gradient-to-br from-blue-50/30 to-white' : 'border-slate-200'
                    }`}
                  >
                    <div className="space-y-2">
                      <h4 className="text-lg font-bold text-slate-900">{chart.title}</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {getChartDescription(chart.type, chart.config, chart.title)}
                      </p>
                    </div>
                    <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white ${idx === 0 ? 'h-96' : 'h-80'}`}>
                      <ChartRenderer
                        type={chart.type}
                        title={chart.title}
                        config={chart.config}
                        data={chart.data ?? []}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Quality Tab */}
        <TabsContent value="quality" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Issues */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Data Quality Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(data.insights_full?.data_quality?.issues ?? []).map((issue: string, index: number) => (
                    <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-red-800 text-sm">{issue}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  Recommendations
                </CardTitle>
              </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(data.insights_full?.data_quality?.recommendations ?? []).map((rec: string, index: number) => (
                    <div key={index} className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <p className="text-emerald-800 text-sm">{rec}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Chat FAB - fixed bottom right */}
      <button
        onClick={() => setShowChat(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-all hover:bg-blue-700 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300"
        aria-label="Chat with your data"
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      {/* Chat Modal */}
      {showChat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg">
            <ChatInterface fileId={params.id as string} onClose={() => setShowChat(false)} />
          </div>
        </div>
      )}
    </div>
  )
} 