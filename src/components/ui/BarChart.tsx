'use client'

import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'

interface ChartData {
  label: string
  value1: number
  value2: number
}

interface BarChartProps {
  data?: ChartData[]
  title?: string
  subtitle?: string
}

const defaultData: ChartData[] = [
  { label: 'אוג', value1: 65, value2: 45 },
  { label: 'ספט', value1: 80, value2: 55 },
  { label: 'אוק', value1: 45, value2: 70 },
  { label: 'נוב', value1: 90, value2: 60 },
  { label: 'דצמ', value1: 70, value2: 85 },
  { label: 'ינו', value1: 55, value2: 40 },
]

export default function BarChart({
  data = defaultData,
  title = 'פברואר 2024',
  subtitle,
}: BarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const maxValue = Math.max(
    ...data.flatMap((d) => [d.value1, d.value2])
  )

  const getHeight = (value: number) => {
    return (value / maxValue) * 100
  }

  // Y-axis labels
  const yLabels = ['30K', '20K', '10K', '0']

  return (
    <div className="glass-card rounded-2xl p-5 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          {subtitle && (
            <p className="text-foreground-subtle text-sm">{subtitle}</p>
          )}
        </div>
        <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
          <SlidersHorizontal size={18} className="text-foreground-muted" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-t from-primary to-primary-hover" />
          <span className="text-xs text-foreground-muted">מסמכים</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-t from-secondary to-secondary-hover" />
          <span className="text-xs text-foreground-muted">תיקיות</span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex gap-2">
        {/* Y-Axis */}
        <div className="flex flex-col justify-between text-left pr-2 py-2">
          {yLabels.map((label) => (
            <span key={label} className="text-[10px] text-foreground-subtle">
              {label}
            </span>
          ))}
        </div>

        {/* Bars Container */}
        <div className="flex-1 relative">
          {/* Grid Lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-full h-px bg-white/5"
              />
            ))}
          </div>

          {/* Bars */}
          <div className="flex items-end justify-around h-40 relative z-10">
            {data.map((item, index) => (
              <div
                key={index}
                className="flex flex-col items-center gap-1"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Bar Group */}
                <div className="flex items-end gap-1 h-32">
                  {/* Bar 1 - Primary (Green/Blue) */}
                  <div
                    className="w-3 md:w-4 rounded-full bg-gradient-to-t from-primary/80 to-primary transition-all duration-300 relative group"
                    style={{
                      height: `${getHeight(item.value1)}%`,
                      minHeight: '8px',
                      transform: hoveredIndex === index ? 'scaleY(1.05)' : 'scaleY(1)',
                      boxShadow: hoveredIndex === index
                        ? '0 0 20px rgba(59, 130, 246, 0.5)'
                        : 'none',
                    }}
                  >
                    {/* Tooltip */}
                    {hoveredIndex === index && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-background-card px-2 py-1 rounded text-[10px] whitespace-nowrap border border-white/10 z-20">
                        {item.value1}
                      </div>
                    )}
                  </div>

                  {/* Bar 2 - Secondary (Purple) */}
                  <div
                    className="w-3 md:w-4 rounded-full bg-gradient-to-t from-secondary/80 to-secondary transition-all duration-300"
                    style={{
                      height: `${getHeight(item.value2)}%`,
                      minHeight: '8px',
                      transform: hoveredIndex === index ? 'scaleY(1.05)' : 'scaleY(1)',
                      boxShadow: hoveredIndex === index
                        ? '0 0 20px rgba(139, 92, 246, 0.5)'
                        : 'none',
                    }}
                  />
                </div>

                {/* X-Axis Label */}
                <span
                  className={`text-[10px] mt-2 transition-colors ${
                    hoveredIndex === index
                      ? 'text-foreground'
                      : 'text-foreground-subtle'
                  }`}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
        <div>
          <p className="text-foreground-subtle text-xs">סה"כ החודש</p>
          <p className="text-xl font-bold text-foreground">
            {data.reduce((acc, d) => acc + d.value1 + d.value2, 0)}
          </p>
        </div>
        <div className="flex items-center gap-1 text-success text-sm">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
          <span>+12%</span>
        </div>
      </div>
    </div>
  )
}
