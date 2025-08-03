'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/custom/loading-spinner'
import { FileText, Calendar, BarChart3, Eye, Download, Trash2, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Project {
  id: string
  filename: string
  uploaded_at: string
  file_size: number
  analysis_status: 'pending' | 'completed' | 'failed'
  insights_count?: number
  charts_count?: number
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()

  // Mock data for now - replace with actual API call
  useEffect(() => {
    const mockProjects: Project[] = [
      {
        id: '1',
        filename: 'sales_data_2024.csv',
        uploaded_at: '2024-01-15T10:30:00Z',
        file_size: 1024000,
        analysis_status: 'completed',
        insights_count: 5,
        charts_count: 3
      },
      {
        id: '2',
        filename: 'customer_feedback.xlsx',
        uploaded_at: '2024-01-14T15:45:00Z',
        file_size: 512000,
        analysis_status: 'completed',
        insights_count: 4,
        charts_count: 2
      },
      {
        id: '3',
        filename: 'inventory_report.csv',
        uploaded_at: '2024-01-13T09:20:00Z',
        file_size: 2048000,
        analysis_status: 'pending',
        insights_count: 0,
        charts_count: 0
      }
    ]

    setTimeout(() => {
      setProjects(mockProjects)
      setLoading(false)
    }, 1000)
  }, [])

  const filteredProjects = projects.filter(project =>
    project.filename.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const handleViewProject = (projectId: string) => {
    router.push(`/view/${projectId}`)
  }

  const handleDeleteProject = (projectId: string) => {
    // TODO: Implement delete functionality
    setProjects(projects.filter(p => p.id !== projectId))
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" text="Loading projects..." />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">My Projects</h1>
        <p className="text-muted-foreground">
          View and manage your analyzed datasets
        </p>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center justify-between">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => router.push('/upload')}>
          <FileText className="h-4 w-4 mr-2" />
          Upload New Dataset
        </Button>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Try adjusting your search terms' : 'Upload your first dataset to get started'}
            </p>
            {!searchTerm && (
              <Button onClick={() => router.push('/upload')}>
                Upload Dataset
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{project.filename}</CardTitle>
                  </div>
                  {getStatusBadge(project.analysis_status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">File Size:</span>
                    <span className="font-medium">{formatFileSize(project.file_size)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Uploaded:</span>
                    <span className="font-medium">{formatDate(project.uploaded_at)}</span>
                  </div>
                  {project.analysis_status === 'completed' && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Insights:</span>
                        <span className="font-medium">{project.insights_count}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Charts:</span>
                        <span className="font-medium">{project.charts_count}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => handleViewProject(project.id)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  {project.analysis_status === 'completed' && (
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteProject(project.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 