'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSpinner } from '@/components/custom/loading-spinner'
import { DataTable } from '@/components/custom/data-table'
import { ChartRenderer } from '@/components/custom/chart-renderer'
import { ChatInterface } from '@/components/custom/chat-interface'
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
  file_info: {
    original_filename: string
    file_size: number
    uploaded_at: string
  }
  data_summary: {
    rows: number
    columns: number
    column_names: string[]
    statistics: any
  }
  insights: {
    insights: Array<{
      title: string
      description: string
      business_impact: string
      confidence: string
    }>
    patterns: string[]
    data_quality: {
      issues: string[]
      recommendations: string[]
    }
  }
  charts: Array<{
    id: string
    type: string
    title: string
    config: any
  }>
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fileId = params.id as string
        
        // Fetch real data from the API
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analysis/${fileId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch analysis data')
        }
        
        const analysisData = await response.json()
        
        // Transform the API response to match our interface
        const transformedData: AnalysisData = {
          file_info: {
            original_filename: analysisData.file_info.original_filename,
            file_size: analysisData.file_info.file_size,
            uploaded_at: analysisData.file_info.uploaded_at
          },
          data_summary: {
            rows: analysisData.data_summary.rows,
            columns: analysisData.data_summary.columns,
            column_names: analysisData.data_summary.column_names,
            statistics: analysisData.data_summary.statistics
          },
          insights: {
            insights: analysisData.insights.insights,
            patterns: analysisData.insights.patterns,
            data_quality: analysisData.insights.data_quality
          },
          charts: analysisData.charts
        }
        
        setData(transformedData)
        setLoading(false)
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

  const getChartDescription = (type: string, config: any) => {
    switch (type) {
      case 'scatter':
        return `This scatter plot shows the relationship between ${config.x_axis.replace(/_/g, ' ')} and ${config.y_axis.replace(/_/g, ' ')}. Each point represents a data point, and the pattern reveals correlations and trends in your dataset.`
      case 'bar':
        return `This bar chart displays ${config.y_axis.replace(/_/g, ' ')} across different categories. The height of each bar represents the value, making it easy to compare and identify patterns.`
      case 'histogram':
        return `This histogram shows the distribution of ${config.x_axis.replace(/_/g, ' ')}. The bars represent frequency ranges, helping you understand the spread and central tendency of your data.`
      case 'correlation_matrix':
        return `This correlation matrix visualizes relationships between all variables. Colors indicate correlation strength, with darker colors showing stronger relationships.`
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
      const reportData = {
        filename: data.file_info.original_filename,
        analysisDate: new Date().toISOString(),
        summary: {
          totalRecords: data.data_summary.rows,
          totalColumns: data.data_summary.columns,
          insights: data.insights.insights.length,
          charts: data.charts.length
        },
        insights: data.insights.insights,
        patterns: data.insights.patterns,
        dataQuality: data.insights.data_quality
      }

      // Create downloadable JSON report
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${data.file_info.original_filename.replace(/\.[^/.]+$/, '')}_analysis_report.json`
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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{data.file_info.original_filename}</h1>
          <p className="text-sm text-slate-600 flex items-center gap-3 font-medium">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-slate-500" />
              Analysis completed {formatDate(data.file_info.uploaded_at)}
            </span>
            <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
            <span className="flex items-center gap-1">
              <Database className="h-4 w-4 text-slate-500" />
              {formatFileSize(data.file_info.file_size)}
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
        <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Total Records</p>
                <p className="text-3xl font-bold text-blue-900">{data.data_summary.rows.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Database className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-emerald-50 to-green-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Variables</p>
                <p className="text-3xl font-bold text-emerald-900">{data.data_summary.columns}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <BarChart3 className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-purple-50 to-violet-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide">Key Insights</p>
                <p className="text-3xl font-bold text-purple-900">{data.insights.insights.length}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Brain className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-orange-50 to-amber-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-orange-700 uppercase tracking-wide">Visualizations</p>
                <p className="text-3xl font-bold text-orange-900">{data.charts.length}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-xl">
                <BarChart className="h-8 w-8 text-orange-600" />
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
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-900">Key Insights Summary</CardTitle>
              <p className="text-sm text-slate-600">The most important discoveries from your data analysis</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {data.insights.insights.slice(0, 3).map((insight, index) => {
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
                      <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                        <p className="font-bold text-slate-900 text-sm mb-2 uppercase tracking-wide">Business Impact</p>
                        <p className="text-slate-700 text-sm leading-relaxed">{insight.business_impact}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Patterns */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900">Key Patterns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.insights.patterns.slice(0, 4).map((pattern, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                    <p className="text-slate-700 text-sm">{pattern}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Key Visualizations */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900">Key Visualizations</CardTitle>
              <p className="text-sm text-slate-600">Interactive charts that reveal important patterns in your data</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {data.charts.slice(0, 2).map((chart) => (
                  <div key={chart.id} className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="text-lg font-semibold text-slate-900">{chart.title}</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {getChartDescription(chart.type, chart.config)}
                      </p>
                    </div>
                    <div className="h-80 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <ChartRenderer
                        type={chart.type}
                        title={chart.title}
                        config={chart.config}
                        data={[]}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="space-y-6">
            {data.insights.insights.map((insight, index) => {
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
                    <p className="text-slate-600 leading-relaxed">{insight.description}</p>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="font-medium text-slate-900 mb-1">Business Impact</p>
                      <p className="text-slate-600">{insight.business_impact}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
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
                data={[]} 
                title="Dataset Overview" 
                maxRows={15}
                showPagination={true}
              />
            </CardContent>
          </Card>

          {/* All Visualizations Section */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-900">Complete Visualizations</CardTitle>
              <p className="text-sm text-slate-600">Comprehensive charts and graphs that tell the story of your data</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {data.charts.map((chart) => (
                  <div key={chart.id} className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="text-lg font-semibold text-slate-900">{chart.title}</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {getChartDescription(chart.type, chart.config)}
                      </p>
                    </div>
                    <div className="h-80 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <ChartRenderer
                        type={chart.type}
                        title={chart.title}
                        config={chart.config}
                        data={[]}
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
                  {data.insights.data_quality.issues.map((issue, index) => (
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
                  {data.insights.data_quality.recommendations.map((rec, index) => (
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

      {/* Interactive Analysis Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Interactive Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Chat with Your Data</h3>
            <p className="text-slate-600 mb-4">
              Ask questions about your dataset and get instant AI-powered answers
            </p>
            <Button variant="outline" onClick={() => setShowChat(true)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Start Chat
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chat Modal */}
              {showChat && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden">
              <ChatInterface 
                fileId={params.id as string} 
                onClose={() => setShowChat(false)} 
              />
            </div>
          </div>
        )}
    </div>
  )
} 