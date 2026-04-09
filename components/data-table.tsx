'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DataTableProps {
  data: any[]
  title?: string
  maxRows?: number
  showPagination?: boolean
  onExport?: () => void
  /** Lighter layout for nested use (e.g. upload page): no outer card, denser table */
  embedded?: boolean
  /** Leading # column for scanning rows */
  showRowNumbers?: boolean
}

const URL_LIKE = /^https?:\/\//i

function isLikelyUrl(s: string): boolean {
  return URL_LIKE.test(s) && s.length > 24
}

export function DataTable({
  data,
  title = 'Data Preview',
  maxRows = 10,
  showPagination = true,
  onExport,
  embedded = false,
  showRowNumbers = false
}: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1)

  if (!data.length) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 text-center text-slate-500">No data to display</CardContent>
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
      return <span className="text-slate-400">—</span>
    }
    if (typeof value === 'number') {
      return <span className="tabular-nums">{value.toLocaleString()}</span>
    }
    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
          {value ? 'Yes' : 'No'}
        </Badge>
      )
    }
    const str = String(value)
    if (isLikelyUrl(str)) {
      return (
        <a
          href={str}
          target="_blank"
          rel="noopener noreferrer"
          className="block max-w-[min(12rem,28vw)] truncate font-mono text-[11px] text-indigo-600 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-800"
          title={str}
        >
          {str}
        </a>
      )
    }
    if (str.length > 80) {
      return (
        <span className="block max-w-[min(14rem,32vw)] truncate text-slate-700" title={str}>
          {str}
        </span>
      )
    }
    return <span className="text-slate-800">{str}</span>
  }

  const getColumnType = (columnName: string) => {
    const sampleValues = data.slice(0, 100).map((row) => row[columnName]).filter((v) => v !== null && v !== undefined)
    if (sampleValues.length === 0) return 'unknown'

    const firstValue = sampleValues[0]
    if (typeof firstValue === 'number') return 'numeric'
    if (typeof firstValue === 'boolean') return 'boolean'
    if (firstValue instanceof Date || !isNaN(Date.parse(String(firstValue)))) return 'date'
    return 'text'
  }

  const headClass = 'h-auto py-2 px-2 text-left align-bottom bg-slate-100/90 border-b border-slate-200'
  const cellClass = 'py-1.5 px-2 align-top text-xs leading-snug border-b border-slate-100'

  const tableBlock = (
    <div
      className={cn(
        'rounded-lg border border-slate-200 bg-white shadow-sm',
        embedded && 'shadow-none'
      )}
    >
      {/* Table wraps in one overflow-auto div — avoid nesting a second scroller */}
      <Table className="w-max min-w-full">
          <TableHeader>
            <TableRow className="border-0 hover:bg-transparent">
              {showRowNumbers && (
                <TableHead
                  className={cn(headClass, 'w-10 min-w-[2.5rem] max-w-[2.5rem] sticky left-0 z-20 bg-slate-100 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)]')}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">#</span>
                </TableHead>
              )}
              {columns.map((col) => {
                const columnType = getColumnType(col)
                return (
                  <TableHead
                    key={col}
                    className={cn(headClass, 'min-w-[7rem] max-w-[14rem] whitespace-normal')}
                  >
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="font-semibold text-slate-900 text-xs leading-tight break-words">{col}</span>
                      <Badge
                        variant="outline"
                        className="shrink-0 border-slate-300 bg-white px-1 py-0 text-[10px] font-medium text-slate-600"
                      >
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
              <TableRow
                key={rowIndex}
                className="border-0 hover:bg-slate-50/80"
              >
                {showRowNumbers && (
                  <TableCell
                    className={cn(
                      cellClass,
                      'w-10 min-w-[2.5rem] max-w-[2.5rem] sticky left-0 z-10 bg-white font-mono text-[11px] text-slate-500 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)]'
                    )}
                  >
                    {startIndex + rowIndex + 1}
                  </TableCell>
                )}
                {columns.map((col) => (
                  <TableCell key={col} className={cn(cellClass, 'min-w-[7rem] max-w-[14rem]')}>
                    {formatCellValue(row[col])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>

      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2">
          <div className="text-xs text-slate-600">
            Showing {startIndex + 1}–{Math.min(endIndex, data.length)} of {data.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-slate-600">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )

  if (embedded) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
            <p className="text-xs text-slate-500">Scroll horizontally to see all columns. Links open in a new tab.</p>
          </div>
          <Badge variant="secondary" className="w-fit border border-slate-200 bg-slate-50 text-slate-700">
            {data.length} rows × {columns.length} columns
          </Badge>
        </div>
        {tableBlock}
      </div>
    )
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg font-semibold text-slate-900">{title}</CardTitle>
          <p className="mt-1 text-xs text-slate-500">
            Scroll horizontally for wide tables. Long text and URLs are truncated; hover for full value.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport} className="bg-white hover:bg-slate-50">
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
          )}
          <Badge variant="secondary" className="border border-slate-200 bg-slate-50 font-medium text-slate-700">
            {data.length} rows × {columns.length} columns
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">{tableBlock}</CardContent>
    </Card>
  )
}
