'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DataTableProps {
  data: any[]
  title?: string
  maxRows?: number
  showPagination?: boolean
  onExport?: () => void
}

export function DataTable({
  data,
  title = "Data Preview",
  maxRows = 10,
  showPagination = true,
  onExport
}: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1)

  if (!data.length) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 text-center text-slate-500">
          No data to display
        </CardContent>
      </Card>
    )
  }

  const columns = Object.keys(data[0])
  const totalPages = Math.ceil(data.length / maxRows)
  const startIndex = (currentPage - 1) * maxRows
  const endIndex = startIndex + maxRows
  const currentData = data.slice(startIndex, endIndex)

  const formatCellValue = (value: any) => {
    if (value === null || value === undefined) {
      return <span className="text-slate-400">-</span>
    }
    if (typeof value === 'number') {
      return value.toLocaleString()
    }
    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? 'default' : 'secondary'} className="text-xs">
          {value ? 'Yes' : 'No'}
        </Badge>
      )
    }
    return String(value)
  }

  const getColumnType = (columnName: string) => {
    const sampleValues = data.slice(0, 100).map(row => row[columnName]).filter(v => v !== null && v !== undefined)
    if (sampleValues.length === 0) return 'unknown'

    const firstValue = sampleValues[0]
    if (typeof firstValue === 'number') return 'numeric'
    if (typeof firstValue === 'boolean') return 'boolean'
    if (firstValue instanceof Date || !isNaN(Date.parse(String(firstValue)))) return 'date'
    return 'text'
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div>
          <CardTitle className="text-xl font-bold text-slate-900">{title}</CardTitle>
          <p className="text-sm text-slate-600 mt-1">Interactive data exploration with sorting and filtering</p>
        </div>
        <div className="flex items-center space-x-3">
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport} className="bg-white hover:bg-slate-50">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          )}
          <Badge variant="secondary" className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200 font-semibold">
            {data.length} rows × {columns.length} columns
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                {columns.map((col) => {
                  const columnType = getColumnType(col)
                  return (
                    <TableHead key={col} className="whitespace-nowrap bg-transparent">
                      <div className="flex flex-col space-y-2">
                        <span className="font-bold text-slate-900 text-sm">{col}</span>
                        <Badge variant="outline" className="text-xs w-fit bg-white text-slate-600 border-slate-300 font-medium">
                          {columnType}
                        </Badge>
                      </div>
                    </TableHead>
                  )
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentData.map((row, rowIndex) => (
                <TableRow key={rowIndex} className="border-slate-100 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200">
                  {columns.map((col) => (
                    <TableCell key={col} className="text-sm text-slate-700 font-medium">
                      {formatCellValue(row[col])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {showPagination && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
            <div className="text-sm text-slate-600">
              Showing {startIndex + 1} to {Math.min(endIndex, data.length)} of {data.length} entries
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-slate-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
