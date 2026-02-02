'use client'

import { LucideIcon } from 'lucide-react'

interface CategoryCardProps {
  title: string
  subtitle?: string
  icon: LucideIcon
  count?: number
  color: 'primary' | 'accent' | 'secondary' | 'success' | 'warning'
  isPremium?: boolean
  onClick?: () => void
}

const colorMap = {
  primary: {
    bg: 'from-primary/20 to-primary/5',
    border: 'border-primary/30',
    icon: 'bg-gradient-to-br from-primary to-primary-dark',
    text: 'text-primary',
    glow: 'rgba(59, 130, 246, 0.3)',
  },
  accent: {
    bg: 'from-accent/20 to-accent/5',
    border: 'border-accent/30',
    icon: 'bg-gradient-to-br from-accent to-accent-dark',
    text: 'text-accent',
    glow: 'rgba(6, 182, 212, 0.3)',
  },
  secondary: {
    bg: 'from-secondary/20 to-secondary/5',
    border: 'border-secondary/30',
    icon: 'bg-gradient-to-br from-secondary to-secondary-dark',
    text: 'text-secondary',
    glow: 'rgba(139, 92, 246, 0.3)',
  },
  success: {
    bg: 'from-success/20 to-success/5',
    border: 'border-success/30',
    icon: 'bg-gradient-to-br from-success to-emerald-600',
    text: 'text-success',
    glow: 'rgba(16, 185, 129, 0.3)',
  },
  warning: {
    bg: 'from-warning/20 to-warning/5',
    border: 'border-warning/30',
    icon: 'bg-gradient-to-br from-warning to-amber-600',
    text: 'text-warning',
    glow: 'rgba(245, 158, 11, 0.3)',
  },
}

export default function CategoryCard({
  title,
  subtitle,
  icon: Icon,
  count,
  color,
  isPremium,
  onClick,
}: CategoryCardProps) {
  const colors = colorMap[color]

  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl p-5 cursor-pointer
        bg-gradient-to-br ${colors.bg}
        border ${colors.border}
        backdrop-blur-sm
        transition-all duration-300 ease-out
        hover:scale-[1.02] hover:shadow-lg
        group
      `}
      style={{
        boxShadow: `0 4px 20px ${colors.glow}`,
      }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/20" />
        <div className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full bg-white/10" />
      </div>

      {/* Premium Badge */}
      {isPremium && (
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-[10px] font-bold text-white">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Premium
          </span>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        <h3 className="font-bold text-foreground text-lg mb-1">{title}</h3>
        {subtitle && (
          <p className="text-foreground-muted text-sm mb-4">{subtitle}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-4">
          {count !== undefined && (
            <span className={`text-sm font-medium ${colors.text}`}>
              {count} פריטים
            </span>
          )}

          {/* Arrow Button */}
          <div
            className={`
              w-10 h-10 rounded-full flex items-center justify-center
              ${colors.icon}
              transition-transform duration-300
              group-hover:scale-110
            `}
          >
            <svg
              className="w-5 h-5 text-white transform -rotate-45"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Icon Watermark */}
      <div className="absolute -bottom-4 -right-4 opacity-10">
        <Icon size={80} />
      </div>
    </div>
  )
}
