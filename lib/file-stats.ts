import { readFile } from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

/** Parse file from buffer (e.g. FormData upload) - returns columns and preview rows */
export async function parseBufferForPreview(
  buffer: Buffer,
  filename: string
): Promise<{ columns: string[]; preview: Record<string, unknown>[] }> {
  const ext = path.extname(filename).toLowerCase();
  let rows: Record<string, unknown>[] = [];
  let columns: string[] = [];

  const csvOpts = {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
    bom: true,
    trim: true,
  };

  if (ext === '.csv') {
    let content: string;
    try {
      content = buffer.toString('utf-8');
    } catch {
      content = buffer.toString('latin1');
    }
    try {
      const parsed = parse(content, csvOpts) as unknown as Record<string, unknown>[];
      rows = parsed;
      columns = parsed.length > 0 ? Object.keys(parsed[0]) : [];
    } catch {
      /* parse failed */
    }
  } else if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
    rows = data;
    columns = data.length > 0 ? Object.keys(data[0]) : [];
  } else {
    return { columns: [], preview: [] };
  }

  return {
    columns,
    preview: rows.slice(0, 10),
  };
}

export interface ColumnStats {
  sum?: number;
  min?: number;
  max?: number;
  avg?: number;
  count: number;
  pct_of_total?: number;
  value_counts?: Record<string, number>;
}

export function computeStatistics(
  rows: Record<string, unknown>[],
  columns: string[],
  dataTypes: Record<string, string>
): Record<string, ColumnStats> {
  const stats: Record<string, ColumnStats> = {};
  for (const col of columns) {
    const values = rows.map((r) => r[col]).filter((v) => v != null && v !== '');
    const count = values.length;
    if (dataTypes[col] === 'number') {
      const nums = values
        .map((v) => {
          if (typeof v === 'number') return v;
          const s = String(v).replace(/,/g, '');
          return parseFloat(s);
        })
        .filter((n) => !Number.isNaN(n));
      if (nums.length > 0) {
        const sum = nums.reduce((a, b) => a + b, 0);
        const min = Math.min(...nums);
        const max = Math.max(...nums);
        const avg = sum / nums.length;
        stats[col] = { sum, min, max, avg, count };
      } else {
        stats[col] = { count };
      }
    } else {
      const counts: Record<string, number> = {};
      for (const v of values) {
        const key = String(v);
        counts[key] = (counts[key] ?? 0) + 1;
      }
      stats[col] = { count, value_counts: counts };
    }
  }
  const numericCols = columns.filter((c) => stats[c]?.sum != null);
  const grandTotal = numericCols.reduce((acc, c) => acc + (stats[c]?.sum ?? 0), 0);
  if (grandTotal > 0) {
    for (const col of numericCols) {
      const s = stats[col];
      if (s?.sum != null) {
        s.pct_of_total = (s.sum / grandTotal) * 100;
      }
    }
  }
  return stats;
}

export async function parseFileWithStats(filePath: string): Promise<{
  rows: Record<string, unknown>[];
  columns: string[];
  dataTypes: Record<string, string>;
  stats: Record<string, ColumnStats>;
}> {
  const ext = path.extname(filePath).toLowerCase();
  let rows: Record<string, unknown>[] = [];
  let columns: string[] = [];

  if (ext === '.csv') {
    const content = await readFile(filePath, 'utf-8');
    const parsed = parse(content, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      relax_quotes: true,
    }) as Record<string, unknown>[];
    rows = parsed;
    columns = parsed.length > 0 ? Object.keys(parsed[0]) : [];
  } else if (ext === '.xlsx' || ext === '.xls') {
    const buffer = await readFile(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
    rows = data;
    columns = data.length > 0 ? Object.keys(data[0]) : [];
  } else {
    throw new Error(`Unsupported format: ${ext}`);
  }

  const dataTypes: Record<string, string> = {};
  for (const col of columns) {
    const values = rows.map((r) => r[col]).filter((v) => v != null && v !== '');
    const sample = values[0];
    const isNum = typeof sample === 'number' || (typeof sample === 'string' && !Number.isNaN(parseFloat(sample)));
    dataTypes[col] = isNum ? 'number' : 'string';
  }

  const stats = computeStatistics(rows, columns, dataTypes);
  return { rows, columns, dataTypes, stats };
}
