'use client'

import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export interface ParseResult {
  columns: string[]
  preview: Record<string, unknown>[]
}

/** Parse CSV or Excel file in the browser - returns columns and preview rows */
export async function parseFileInBrowser(file: File): Promise<ParseResult> {
  const ext = file.name.toLowerCase().split('.').pop() ?? ''
  const previewRows = 10

  if (ext === 'csv') {
    return new Promise((resolve) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        preview: previewRows + 1, // +1 for header
        complete: (results) => {
          const rows = results.data as Record<string, unknown>[]
          const columns = rows.length > 0 ? Object.keys(rows[0]) : []
          resolve({
            columns,
            preview: rows.slice(0, previewRows),
          })
        },
        error: () => {
          resolve({ columns: [], preview: [] })
        },
      })
    })
  }

  if (ext === 'xlsx' || ext === 'xls') {
    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[]
      const columns = data.length > 0 ? Object.keys(data[0]) : []
      return {
        columns,
        preview: data.slice(0, previewRows),
      }
    } catch {
      return { columns: [], preview: [] }
    }
  }

  return { columns: [], preview: [] }
}
