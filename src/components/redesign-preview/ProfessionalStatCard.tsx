/**
 * Professional Stat Card Component
 * Demonstrates the new productivity-focused design system
 */

import { ArrowRight, LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface ProfessionalStatCardProps {
  title: string
  value: number
  unit: string
  icon: LucideIcon
  accentColor: 'blue' | 'emerald' | 'purple' | 'red' | 'amber'
  progress?: {
    label: string
    value: number
  }
  subtitle?: string
  trend?: {
    label: string
    value: string
    positive?: boolean
  }
  onClick?: () => void
  children?: React.ReactNode
}

const accentColors = {
  blue: {
    gradient: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    hoverBg: 'group-hover:bg-blue-100',
    icon: 'text-blue-600',
    text: 'text-blue-600',
  },
  emerald: {
    gradient: 'from-emerald-500 to-emerald-600',
    bg: 'bg-emerald-50',
    hoverBg: 'group-hover:bg-emerald-100',
    icon: 'text-emerald-600',
    text: 'text-emerald-600',
  },
  purple: {
    gradient: 'from-purple-500 to-purple-600',
    bg: 'bg-purple-50',
    hoverBg: 'group-hover:bg-purple-100',
    icon: 'text-purple-600',
    text: 'text-purple-600',
  },
  red: {
    gradient: 'from-red-500 to-red-600',
    bg: 'bg-red-50',
    hoverBg: 'group-hover:bg-red-100',
    icon: 'text-red-600',
    text: 'text-red-600',
  },
  amber: {
    gradient: 'from-amber-500 to-amber-600',
    bg: 'bg-amber-50',
    hoverBg: 'group-hover:bg-amber-100',
    icon: 'text-amber-600',
    text: 'text-amber-600',
  },
}

export function ProfessionalStatCard({
  title,
  value,
  unit,
  icon: Icon,
  accentColor,
  progress,
  subtitle,
  trend,
  onClick,
  children,
}: ProfessionalStatCardProps) {
  const colors = accentColors[accentColor]

  return (
    <Card
      className={cn(
        'group relative overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-all duration-300 rounded-xl',
        onClick && 'cursor-pointer hover:-translate-y-1'
      )}
      onClick={onClick}
    >
      {/* Top accent bar with gradient */}
      <div className={cn('absolute top-0 left-0 w-full h-1 bg-gradient-to-r', colors.gradient)} />

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
          {title}
        </CardTitle>
        <div className={cn('p-2.5 rounded-lg transition-colors', colors.bg, colors.hoverBg)}>
          <Icon className={cn('h-5 w-5', colors.icon)} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Main value */}
        <div className="flex items-baseline gap-2">
          <div className="text-4xl font-bold text-slate-900">{value}</div>
          <span className="text-sm text-slate-500 font-medium">{unit}</span>
        </div>

        {/* Progress section */}
        {progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">{progress.label}</span>
              <span className="text-slate-900 font-semibold">{progress.value}%</span>
            </div>
            <Progress value={progress.value} className="h-2 bg-slate-100" />
          </div>
        )}

        {/* Custom children */}
        {children}

        {/* Footer section */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-500">
            {subtitle || 'View details'}
          </span>
          {trend ? (
            <span className={cn(
              'text-xs font-semibold',
              trend.positive !== false ? colors.text : 'text-red-600'
            )}>
              {trend.value}
            </span>
          ) : (
            <ArrowRight
              className={cn(
                'h-4 w-4 text-slate-400 transition-all',
                onClick && 'group-hover:translate-x-1',
                onClick && colors.text.replace('text-', 'group-hover:text-')
              )}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Example usage component
export function StatCardExamples() {
  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Professional Design System</h1>
          <p className="text-slate-600">Modern, productivity-focused component examples</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ProfessionalStatCard
            title="Active Tasks"
            value={12}
            unit="tasks"
            icon={CheckSquare}
            accentColor="blue"
            progress={{ label: 'Completion rate', value: 75 }}
            subtitle="In progress"
            onClick={() => console.log('Clicked')}
          />

          <ProfessionalStatCard
            title="Completed"
            value={48}
            unit="done"
            icon={Award}
            accentColor="emerald"
            trend={{ label: 'This month', value: '+12 from last', positive: true }}
            subtitle="This month"
          />

          <ProfessionalStatCard
            title="Team Tasks"
            value={24}
            unit="active"
            icon={Target}
            accentColor="purple"
            subtitle="Team activity"
          />

          <ProfessionalStatCard
            title="Overdue"
            value={3}
            unit="tasks"
            icon={AlertCircle}
            accentColor="red"
            trend={{ label: 'Needs attention', value: 'Action required', positive: false }}
            subtitle="Urgent"
          />
        </div>
      </div>
    </div>
  )
}
