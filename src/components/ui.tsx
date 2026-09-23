import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ title, subtitle, children, className = '', right }: { title?: string; subtitle?: string; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <div className={`card p-5 ${className}`}>
      {(title || right) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  )
}

export function Stat({ label, value, change, hint }: { label: string; value: string; change?: number; hint?: string }) {
  const up = (change ?? 0) >= 0
  return (
    <div className="card p-5">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-2xl font-semibold mt-2">{value}</div>
      <div className="flex items-center gap-2 mt-2 text-xs">
        {change !== undefined && (
          <span className={`inline-flex items-center gap-0.5 font-medium ${up ? 'text-good' : 'text-bad'}`}>
            {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(change)}%
          </span>
        )}
        {hint && <span className="text-muted">{hint}</span>}
      </div>
    </div>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'accent' }) {
  const tones: Record<string, string> = {
    neutral: 'bg-panel-2 text-muted',
    good: 'bg-good-soft text-good',
    warn: 'bg-warn-soft text-warn',
    bad: 'bg-bad-soft text-bad',
    accent: 'bg-accent-soft text-accent',
  }
  return <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium ${tones[tone]}`}>{children}</span>
}

export function Progress({ value, tone = 'accent' }: { value: number; tone?: 'accent' | 'good' | 'warn' | 'bad' }) {
  const colors = { accent: 'bg-accent', good: 'bg-good', warn: 'bg-warn', bad: 'bg-bad' }
  return (
    <div className="h-1.5 w-full rounded-full bg-panel-2 overflow-hidden">
      <div className={`h-full rounded-full ${colors[tone]}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}

export function Segmented({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-bg p-0.5">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${value === o ? 'bg-panel-2 text-text' : 'text-muted hover:text-text'}`}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-line'}`}
      aria-pressed={checked}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? 'left-4.5' : 'left-0.5'}`} />
    </button>
  )
}

export const chartTooltip = {
  contentStyle: { background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: 'var(--muted)' },
  itemStyle: { color: 'var(--text)' },
}

export const axisStyle = { fontSize: 11, fill: 'var(--muted)' }
