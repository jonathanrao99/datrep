'use client'

import React from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  ComposedChart
} from 'recharts'

interface ChartConfig {
  x_axis?: string
  y_axis?: string
  trend_line?: boolean
  aggregation?: string
  bins?: number
  columns?: string[]
}

interface ChartProps {
  type: string
  title: string
  config: ChartConfig
  data: any[]
}

// Beautiful color palette
const COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6366F1'  // Indigo
]

const GRADIENT_COLORS = [
  'url(#blueGradient)',
  'url(#emeraldGradient)',
  'url(#amberGradient)',
  'url(#redGradient)',
  'url(#purpleGradient)',
  'url(#cyanGradient)'
]

export function ChartRenderer({ type, title, config, data }: ChartProps) {
  // Generate sample data based on chart type and config
  const generateSampleData = () => {
    switch (type) {
      case 'scatter':
        return Array.from({ length: 50 }, (_, i) => ({
          [config.x_axis ?? 'x']: Math.random() * 12000 + 8000,
          [config.y_axis ?? 'y']: Math.random() * 50 + 45,
        }))
      
      case 'bar':
        const barKey = config.y_axis ?? 'value'
        return [
          { state: 'California', [barKey]: 78.5, fill: COLORS[0] },
          { state: 'Texas', [barKey]: 72.3, fill: COLORS[1] },
          { state: 'New York', [barKey]: 75.8, fill: COLORS[2] },
          { state: 'Florida', [barKey]: 70.2, fill: COLORS[3] },
          { state: 'Illinois', [barKey]: 73.1, fill: COLORS[4] },
          { state: 'Pennsylvania', [barKey]: 74.6, fill: COLORS[5] },
        ]
      
      case 'histogram':
        return Array.from({ length: 20 }, (_, i) => ({
          [config.x_axis ?? 'x']: 12 + (i * 0.65),
          count: Math.floor(Math.random() * 50) + 10,
          fill: COLORS[i % COLORS.length]
        }))
      
      case 'area':
        return Array.from({ length: 30 }, (_, i) => ({
          month: `Month ${i + 1}`,
          [config.y_axis ?? 'value']: Math.random() * 100 + 50,
          trend: Math.random() * 20 + 40
        }))
      
      case 'line':
        return Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          [config.y_axis ?? 'value']: Math.sin(i * 0.3) * 20 + 70,
          trend: Math.cos(i * 0.2) * 15 + 65
        }))
      
      case 'correlation_matrix':
        return [
          { metric: 'Funding', funding: 1.0, test_scores: 0.75, ratio: -0.3, dropout: -0.6 },
          { metric: 'Test Scores', funding: 0.75, test_scores: 1.0, ratio: -0.4, dropout: -0.8 },
          { metric: 'Teacher Ratio', funding: -0.3, test_scores: -0.4, ratio: 1.0, dropout: 0.5 },
          { metric: 'Dropout Rate', funding: -0.6, test_scores: -0.8, ratio: 0.5, dropout: 1.0 },
        ]
      
      case 'pie':
        return [{ name: 'Sample', value: 100 }]
      
      default:
        return []
    }
  }

  const chartData = data.length > 0 ? data : generateSampleData()
  const xAxis = config?.x_axis ?? 'x'
  const yAxis = config?.y_axis ?? 'y'

  const renderChart = () => {
    switch (type) {
      case 'scatter':
        return (
          <ScatterChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <defs>
              <linearGradient id="scatterGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.8}/>
                <stop offset="100%" stopColor="#1E40AF" stopOpacity={0.6}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis 
              dataKey={xAxis} 
              name={String(xAxis).replace(/_/g, ' ')}
              tickFormatter={(v) => typeof v === 'number' && v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)}
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#CBD5E1' }}
            />
            <YAxis 
              dataKey={yAxis} 
              name={String(yAxis).replace(/_/g, ' ')}
              tickFormatter={(v) => typeof v === 'number' && v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)}
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#CBD5E1' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                padding: '12px 16px'
              }}
              formatter={(value: number) => [typeof value === 'number' ? value.toLocaleString() : value, String(yAxis).replace(/_/g, ' ')]}
              cursor={{ strokeDasharray: '4 4' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Scatter 
              dataKey={yAxis} 
              fill="url(#scatterGradient)"
              stroke="#1E40AF"
              strokeWidth={1}
              fillOpacity={0.8}
              name={String(yAxis).replace(/_/g, ' ')}
            />
          </ScatterChart>
        )

      case 'bar':
        const barXKey = xAxis || 'state'
        const barYKey = yAxis || 'value'
        return (
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <defs>
              {COLORS.map((c, i) => (
                <linearGradient key={i} id={`barGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity={0.9}/>
                  <stop offset="100%" stopColor={c} stopOpacity={0.7}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis 
              dataKey={barXKey} 
              stroke="#64748B" 
              fontSize={11} 
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#CBD5E1' }}
            />
            <YAxis 
              tickFormatter={(value) => typeof value === 'number' && value >= 1000 ? `${(value/1000).toFixed(0)}k` : String(value)}
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#CBD5E1' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                padding: '12px 16px'
              }}
              formatter={(value: number) => [typeof value === 'number' ? value.toLocaleString() : value, barYKey.replace(/_/g, ' ')]}
              cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar 
              dataKey={barYKey} 
              radius={[6, 6, 0, 0]}
              name={barYKey.replace(/_/g, ' ')}
            >
              {chartData.map((_, index) => (
                <Cell key={index} fill={`url(#barGrad-${index % COLORS.length})`} />
              ))}
            </Bar>
          </BarChart>
        )

      case 'histogram':
        return (
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <defs>
              <linearGradient id="histogramGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.85}/>
                <stop offset="100%" stopColor="#059669" stopOpacity={0.7}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis 
              dataKey={xAxis}
              tickFormatter={(value) => typeof value === 'number' ? value.toFixed(1) : String(value)}
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#CBD5E1' }}
            />
            <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={{ stroke: '#CBD5E1' }} />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                padding: '12px 16px'
              }}
              formatter={(value: number) => [value, 'Count']}
              cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar 
              dataKey="count" 
              fill="url(#histogramGradient)"
              radius={[6, 6, 0, 0]}
              name="Count"
            />
          </BarChart>
        )

      case 'area': {
        const areaXKey = xAxis || 'label'
        const areaYKey = yAxis || 'value'
        return (
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.6}/>
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey={areaXKey} stroke="#64748B" fontSize={11} tickLine={false} axisLine={{ stroke: '#CBD5E1' }} />
            <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={{ stroke: '#CBD5E1' }} tickFormatter={(v) => typeof v === 'number' && v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                padding: '12px 16px'
              }}
              formatter={(value: number) => [typeof value === 'number' ? value.toLocaleString() : value, areaYKey.replace(/_/g, ' ')]}
              cursor={{ stroke: '#8B5CF6', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area 
              type="monotone" 
              dataKey={areaYKey} 
              stroke="#8B5CF6" 
              fill="url(#areaGradient)"
              strokeWidth={2.5}
            />
          </AreaChart>
        )
      }

      case 'line': {
        const lineXKey = xAxis || 'name'
        const lineYKey = yAxis || 'value'
        return (
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey={lineXKey} stroke="#64748B" fontSize={11} tickLine={false} axisLine={{ stroke: '#CBD5E1' }} angle={-45} textAnchor="end" height={60} />
            <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={{ stroke: '#CBD5E1' }} />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                padding: '12px 16px'
              }}
              formatter={(value: number) => [typeof value === 'number' ? value.toLocaleString() : value, lineYKey.replace(/_/g, ' ')]}
              cursor={{ stroke: '#F59E0B', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line 
              type="monotone" 
              dataKey={lineYKey} 
              stroke="#F59E0B" 
              strokeWidth={2.5}
              dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#F59E0B', strokeWidth: 2 }}
            />
          </LineChart>
        )
      }

      case 'pie':
      case 'donut': {
        const pieData = chartData.length > 0 ? chartData : []
        const pieNameKey = xAxis || 'name'
        const pieValueKey = yAxis || 'value'
        const total = pieData.reduce((s, d) => s + (Number(d[pieValueKey]) || 0), 0)
        return (
          <PieChart>
            <Pie
              data={pieData}
              dataKey={pieValueKey}
              nameKey={pieNameKey}
              cx="50%"
              cy="50%"
              outerRadius={type === 'donut' ? '75%' : '80%'}
              innerRadius={type === 'donut' ? '45%' : 0}
              paddingAngle={2}
              label={({ [pieNameKey]: name, [pieValueKey]: val }) => {
                const pct = total > 0 ? ((Number(val) / total) * 100).toFixed(1) : '0'
                const label = String(name).length > 15 ? String(name).slice(0, 12) + '…' : name
                return `${label} (${pct}%)`
              }}
            >
              {pieData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} stroke="#fff" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                padding: '12px 16px'
              }}
              formatter={(value: number) => {
                const pct = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : '0'
                return [`${typeof value === 'number' ? value.toLocaleString() : value} (${pct}%)`, pieValueKey.replace(/_/g, ' ')]
              }}
            />
          </PieChart>
        )
      }

      case 'correlation_matrix':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-2 text-xs">
              <div className="font-semibold text-slate-900">Metric</div>
              <div className="font-semibold text-slate-900">Funding</div>
              <div className="font-semibold text-slate-900">Test Scores</div>
              <div className="font-semibold text-slate-900">Teacher Ratio</div>
              <div className="font-semibold text-slate-900">Dropout Rate</div>
              
              {chartData.map((row, index) => (
                <React.Fragment key={index}>
                  <div className="font-medium text-slate-700">{row.metric}</div>
                  <div className={`text-center p-2 rounded-lg ${getCorrelationColor(row.funding)}`}>
                    {row.funding.toFixed(2)}
                  </div>
                  <div className={`text-center p-2 rounded-lg ${getCorrelationColor(row.test_scores)}`}>
                    {row.test_scores.toFixed(2)}
                  </div>
                  <div className={`text-center p-2 rounded-lg ${getCorrelationColor(row.ratio)}`}>
                    {row.ratio.toFixed(2)}
                  </div>
                  <div className={`text-center p-2 rounded-lg ${getCorrelationColor(row.dropout)}`}>
                    {row.dropout.toFixed(2)}
                  </div>
                </React.Fragment>
              ))}
            </div>
            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
              <p className="font-medium text-slate-700 mb-1">Correlation Interpretation:</p>
              <p>Values range from -1 (strong negative correlation) to +1 (strong positive correlation). 
              Darker colors indicate stronger relationships between variables.</p>
            </div>
          </div>
        )

      default:
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">Chart type '{type}' not supported</p>
              <p className="text-slate-400 text-sm">Please try a different visualization</p>
            </div>
          </div>
        )
    }
  }

  const getCorrelationColor = (value: number) => {
    if (value >= 0.7) return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
    if (value >= 0.3) return 'bg-blue-100 text-blue-800 border border-blue-200'
    if (value >= -0.3) return 'bg-slate-100 text-slate-800 border border-slate-200'
    if (value >= -0.7) return 'bg-amber-100 text-amber-800 border border-amber-200'
    return 'bg-red-100 text-red-800 border border-red-200'
  }

  return (
    <div className="w-full h-full p-4">
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  )
} 