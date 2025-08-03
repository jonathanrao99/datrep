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
  x_axis: string
  y_axis: string
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
          [config.x_axis]: Math.random() * 12000 + 8000, // funding range
          [config.y_axis]: Math.random() * 50 + 45, // test scores range
        }))
      
      case 'bar':
        return [
          { state: 'California', [config.y_axis]: 78.5, fill: COLORS[0] },
          { state: 'Texas', [config.y_axis]: 72.3, fill: COLORS[1] },
          { state: 'New York', [config.y_axis]: 75.8, fill: COLORS[2] },
          { state: 'Florida', [config.y_axis]: 70.2, fill: COLORS[3] },
          { state: 'Illinois', [config.y_axis]: 73.1, fill: COLORS[4] },
          { state: 'Pennsylvania', [config.y_axis]: 74.6, fill: COLORS[5] },
        ]
      
      case 'histogram':
        return Array.from({ length: 20 }, (_, i) => ({
          [config.x_axis]: 12 + (i * 0.65), // student-teacher ratio range
          count: Math.floor(Math.random() * 50) + 10,
          fill: COLORS[i % COLORS.length]
        }))
      
      case 'area':
        return Array.from({ length: 30 }, (_, i) => ({
          month: `Month ${i + 1}`,
          [config.y_axis]: Math.random() * 100 + 50,
          trend: Math.random() * 20 + 40
        }))
      
      case 'line':
        return Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          [config.y_axis]: Math.sin(i * 0.3) * 20 + 70,
          trend: Math.cos(i * 0.2) * 15 + 65
        }))
      
      case 'correlation_matrix':
        return [
          { metric: 'Funding', funding: 1.0, test_scores: 0.75, ratio: -0.3, dropout: -0.6 },
          { metric: 'Test Scores', funding: 0.75, test_scores: 1.0, ratio: -0.4, dropout: -0.8 },
          { metric: 'Teacher Ratio', funding: -0.3, test_scores: -0.4, ratio: 1.0, dropout: 0.5 },
          { metric: 'Dropout Rate', funding: -0.6, test_scores: -0.8, ratio: 0.5, dropout: 1.0 },
        ]
      
      default:
        return []
    }
  }

  const chartData = data.length > 0 ? data : generateSampleData()

  const renderChart = () => {
    switch (type) {
      case 'scatter':
        return (
          <ScatterChart data={chartData}>
            <defs>
              <linearGradient id="scatterGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis 
              dataKey={config.x_axis} 
              name={config.x_axis.replace(/_/g, ' ')}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
              stroke="#64748B"
              fontSize={12}
            />
            <YAxis 
              dataKey={config.y_axis} 
              name={config.y_axis.replace(/_/g, ' ')}
              tickFormatter={(value) => `${value}%`}
              stroke="#64748B"
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value, name) => [
                name === config.x_axis ? `$${value.toLocaleString()}` : `${value}%`,
                typeof name === 'string' ? name.replace(/_/g, ' ') : name
              ]}
            />
            <Legend />
            <Scatter 
              dataKey={config.y_axis} 
              fill="url(#scatterGradient)"
              stroke="#1E40AF"
              strokeWidth={1}
              name={config.y_axis.replace(/_/g, ' ')}
            />
          </ScatterChart>
        )

      case 'bar':
        return (
          <BarChart data={chartData}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#1E40AF" stopOpacity={0.9}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="state" stroke="#64748B" fontSize={12} />
            <YAxis 
              tickFormatter={(value) => `${value}%`}
              stroke="#64748B"
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value) => [`${value}%`, 'Average Test Score']}
            />
            <Legend />
            <Bar 
              dataKey={config.y_axis} 
              fill="url(#barGradient)"
              radius={[4, 4, 0, 0]}
              name="Average Test Score"
            />
          </BarChart>
        )

      case 'histogram':
        return (
          <BarChart data={chartData}>
            <defs>
              <linearGradient id="histogramGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#059669" stopOpacity={0.9}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis 
              dataKey={config.x_axis}
              tickFormatter={(value) => value.toFixed(1)}
              stroke="#64748B"
              fontSize={12}
            />
            <YAxis stroke="#64748B" fontSize={12} />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value, name) => [value, 'Number of Schools']}
            />
            <Legend />
            <Bar 
              dataKey="count" 
              fill="url(#histogramGradient)"
              radius={[4, 4, 0, 0]}
              name="Number of Schools"
            />
          </BarChart>
        )

      case 'area':
        return (
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
            <YAxis stroke="#64748B" fontSize={12} />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey={config.y_axis} 
              stroke="#8B5CF6" 
              fill="url(#areaGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        )

      case 'line':
        return (
          <LineChart data={chartData}>
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="hour" stroke="#64748B" fontSize={12} />
            <YAxis stroke="#64748B" fontSize={12} />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey={config.y_axis} 
              stroke="#F59E0B" 
              strokeWidth={3}
              dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#F59E0B', strokeWidth: 2 }}
            />
          </LineChart>
        )

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