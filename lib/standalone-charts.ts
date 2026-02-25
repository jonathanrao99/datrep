import path from 'path';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { getFileBuffer } from './standalone-upload';

export interface ChartDefinition {
  id: string;
  type: 'bar' | 'pie' | 'donut' | 'histogram' | 'area' | 'line' | 'scatter';
  title: string;
  config: Record<string, unknown>;
  data: Record<string, unknown>[];
}

export async function generateChartsForFile(fileId: string): Promise<ChartDefinition[]> {
  const fileSource = await getFileBuffer(fileId);
  if (!fileSource) return [];

  const ext = path.extname(fileSource.filename).toLowerCase();
  let rows: Record<string, unknown>[] = [];
  let columns: string[] = [];

  if (ext === '.csv') {
    const content = fileSource.buffer.toString('utf-8');
    const parsed = parse(content, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      relax_quotes: true,
    }) as Record<string, unknown>[];
    rows = parsed;
    columns = parsed.length > 0 ? Object.keys(parsed[0]) : [];
  } else if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.read(fileSource.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
    rows = data;
    columns = data.length > 0 ? Object.keys(data[0]) : [];
  } else {
    return [];
  }

  const charts: ChartDefinition[] = [];

  // Identify numeric columns (for sums/amounts)
  const numericCols: string[] = [];
  for (const col of columns) {
    const sample = rows.map((r) => r[col]).find((v) => v != null && v !== '');
    if (typeof sample === 'number' || (typeof sample === 'string' && !Number.isNaN(parseFloat(sample)))) {
      numericCols.push(col);
    }
  }

  // Chart 1: Donut/Pie - Distribution by numeric column sums (donut is cleaner for many categories)
  if (numericCols.length > 0) {
    const sums: { name: string; value: number }[] = [];
    for (const col of numericCols.slice(0, 8)) {
      const nums = rows
        .map((r) => {
          const v = r[col];
          return typeof v === 'number' ? v : parseFloat(String(v ?? 0));
        })
        .filter((n) => !Number.isNaN(n));
      const sum = nums.reduce((a, b) => a + b, 0);
      if (sum !== 0) {
        sums.push({ name: col.replace(/_/g, ' '), value: Math.round(sum * 100) / 100 });
      }
    }
    if (sums.length > 0) {
      charts.push({
        id: 'chart-revenue-breakdown',
        type: sums.length > 6 ? 'donut' : 'pie',
        title: 'Distribution by Category',
        config: { x_axis: 'name', y_axis: 'value' },
        data: sums,
      });
      charts.push({
        id: 'chart-revenue-bar',
        type: 'bar',
        title: 'Values by Category',
        config: { x_axis: 'state', y_axis: 'value' },
        data: sums.map((s) => ({ state: s.name, value: s.value })),
      });
    }
  }

  // Chart 2: Replace low-value "Distribution of name" with something more actionable
  // Prefer: (a) Data completeness chart when columns have missing values, (b) meaningful categorical
  const ID_LIKE_PATTERNS = /^(id|name|number|code|key|uuid|guid|employee.?number|index)$/i;
  const categoricalCols = columns.filter((c) => !numericCols.includes(c));
  const meaningfulCategorical = categoricalCols.filter(
    (c) => !ID_LIKE_PATTERNS.test(c.replace(/_/g, ''))
  );

  const missingByCol: { col: string; missing: number }[] = [];
  for (const col of columns) {
    const missing = rows.filter((r) => r[col] == null || r[col] === '').length;
    if (missing > 0) {
      missingByCol.push({ col: col.replace(/_/g, ' '), missing });
    }
  }

  if (missingByCol.length > 0) {
    const sorted = missingByCol
      .sort((a, b) => b.missing - a.missing)
      .slice(0, 8)
      .map(({ col, missing }) => ({ state: col, value: missing }));
    charts.push({
      id: 'chart-missing-values',
      type: 'bar',
      title: 'Columns with Most Missing Values',
      config: { x_axis: 'state', y_axis: 'value' },
      data: sorted,
    });
  } else if (meaningfulCategorical.length > 0) {
    const col = meaningfulCategorical[0];
    const counts: Record<string, number> = {};
    for (const row of rows) {
      const v = String(row[col] ?? 'Unknown');
      counts[v] = (counts[v] ?? 0) + 1;
    }
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ state: name, value }));
    if (sorted.length > 0 && sorted.length < rows.length) {
      charts.push({
        id: 'chart-categorical',
        type: 'bar',
        title: `Top ${col.replace(/_/g, ' ')} by Count`,
        config: { x_axis: 'state', y_axis: 'value' },
        data: sorted,
      });
    }
  } else if (categoricalCols.length > 0) {
    const col = categoricalCols[0];
    const counts: Record<string, number> = {};
    for (const row of rows) {
      const v = String(row[col] ?? 'Unknown');
      counts[v] = (counts[v] ?? 0) + 1;
    }
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ state: name, value }));
    if (sorted.length > 1 && sorted.length <= 15) {
      charts.push({
        id: 'chart-categorical',
        type: 'bar',
        title: `Top ${col.replace(/_/g, ' ')} by Count`,
        config: { x_axis: 'state', y_axis: 'value' },
        data: sorted,
      });
    }
  }

  // Chart 3: Histogram for first numeric column
  if (numericCols.length > 0) {
    const col = numericCols[0];
    const nums = rows
      .map((r) => {
        const v = r[col];
        return typeof v === 'number' ? v : parseFloat(String(v ?? 0));
      })
      .filter((n) => !Number.isNaN(n));
    if (nums.length > 0) {
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      const bins = 10;
      const step = (max - min) / bins || 1;
      const hist: { [key: string]: number; count: number }[] = [];
      for (let i = 0; i < bins; i++) {
        const lo = min + i * step;
        const hi = lo + step;
        const count = nums.filter((n) => n >= lo && (i === bins - 1 ? n <= hi : n < hi)).length;
        hist.push({ [col]: Math.round(lo * 100) / 100, count });
      }
      charts.push({
        id: 'chart-histogram',
        type: 'histogram',
        title: `Distribution of ${col.replace(/_/g, ' ')}`,
        config: { x_axis: col, y_axis: 'count', bins: 10 },
        data: hist,
      });
    }
  }

  // Chart 4: Area chart - cumulative/running sum trend (first numeric column over rows)
  if (numericCols.length > 0 && rows.length >= 10) {
    const col = numericCols[0];
    const sampleSize = Math.min(30, Math.floor(rows.length / 2));
    const step = Math.floor(rows.length / sampleSize) || 1;
    const areaData: { index: number; label: string; value: number; cumulative: number }[] = [];
    let cumulative = 0;
    for (let i = 0; i < sampleSize; i++) {
      const idx = Math.min(i * step, rows.length - 1);
      const v = rows[idx][col];
      const num = typeof v === 'number' ? v : parseFloat(String(v ?? 0));
      if (!Number.isNaN(num)) {
        cumulative += num;
        areaData.push({
          index: i + 1,
          label: `Segment ${i + 1}`,
          value: num,
          cumulative: Math.round(cumulative * 100) / 100,
        });
      }
    }
    if (areaData.length >= 5) {
      charts.push({
        id: 'chart-area-trend',
        type: 'area',
        title: `Cumulative Trend: ${col.replace(/_/g, ' ')}`,
        config: { x_axis: 'label', y_axis: 'cumulative' },
        data: areaData,
      });
    }
  }

  // Chart 5: Scatter plot - two numeric columns (if we have 2+)
  if (numericCols.length >= 2 && rows.length >= 20) {
    const colX = numericCols[0];
    const colY = numericCols[1];
    const sampleSize = Math.min(100, rows.length);
    const step = Math.max(1, Math.floor(rows.length / sampleSize));
    const scatterData: Record<string, number>[] = [];
    for (let i = 0; i < rows.length && scatterData.length < sampleSize; i += step) {
      const row = rows[i];
      const vx = row[colX];
      const vy = row[colY];
      const x = typeof vx === 'number' ? vx : parseFloat(String(vx ?? 0));
      const y = typeof vy === 'number' ? vy : parseFloat(String(vy ?? 0));
      if (!Number.isNaN(x) && !Number.isNaN(y)) {
        scatterData.push({ [colX]: x, [colY]: y });
      }
    }
    if (scatterData.length >= 10) {
      charts.push({
        id: 'chart-scatter',
        type: 'scatter',
        title: `${colX.replace(/_/g, ' ')} vs ${colY.replace(/_/g, ' ')}`,
        config: { x_axis: colX, y_axis: colY },
        data: scatterData,
      });
    }
  }

  // Chart 6: Line chart - categorical value counts over top N categories
  if (categoricalCols.length > 0) {
    const col = categoricalCols[0];
    const counts: Record<string, number> = {};
    for (const row of rows) {
      const v = String(row[col] ?? 'Unknown');
      counts[v] = (counts[v] ?? 0) + 1;
    }
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, value], i) => ({ index: i + 1, name, value, label: name }));
    if (sorted.length >= 4) {
      charts.push({
        id: 'chart-line-categorical',
        type: 'line',
        title: `Trend: ${col.replace(/_/g, ' ')} Counts`,
        config: { x_axis: 'name', y_axis: 'value' },
        data: sorted,
      });
    }
  }

  return charts;
}
