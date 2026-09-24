import { createContext, useContext, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

export const HeaderSlot = createContext<HTMLElement | null | undefined>(undefined)

function HeaderContent({ title, subtitle, actions, inline }: { title: string; subtitle?: string; actions?: ReactNode; inline?: boolean }) {
  return (
    <div className={`flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 ${inline ? 'mb-6' : ''}`}>
      <div className="min-w-0">
        <h1 className={`${inline ? 'text-xl' : 'text-lg'} truncate font-semibold tracking-tight`}>{title}</h1>
        {subtitle && <p className="truncate text-[13px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

// Renders the page title and actions in the app top bar when inside the app shell, inline otherwise.
export function PageHeader(props: { title: string; subtitle?: string; actions?: ReactNode }) {
  const slot = useContext(HeaderSlot)
  if (slot === null) return null
  if (slot) return createPortal(<HeaderContent {...props} />, slot)
  return <HeaderContent {...props} inline />
}

export function Card({ title, subtitle, children, className = '', right }: { title?: string; subtitle?: string; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <div className={`card p-5 ${className}`}>
      {(title || right) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>}
            {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  )
}

export function Sparkline({ values, tone = 'good', width = 120, height = 36 }: { values: number[]; tone?: 'good' | 'bad' | 'accent'; width?: number; height?: number }) {
  if (values.length < 2) return null
  const min = Math.min(...values), max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * width).toFixed(1)},${(height - 3 - ((v - min) / span) * (height - 6)).toFixed(1)}`)
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0 overflow-visible" aria-hidden="true">
      <polyline points={pts.join(' ')} fill="none" stroke={`var(--${tone})`} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function Stat({ label, value, change, hint, spark, changeUnit = '%' }: { label: string; value: string; change?: number; hint?: string; spark?: number[]; changeUnit?: string }) {
  const up = (change ?? 0) >= 0
  return (
    <div className="card flex min-w-0 flex-col gap-2 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
        <span className="min-w-0 truncate text-[13px] text-muted">{label}</span>
        {change !== undefined && (
          <span className={`num inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold ${up ? 'text-good' : 'text-bad'}`}>
            {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {up ? '+' : '-'}{Math.abs(change)}{changeUnit}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-3">
        <span className="num text-[22px] font-bold leading-none tracking-tight sm:text-[28px]">{value}</span>
        {spark && <span className="hidden sm:block"><Sparkline values={spark} tone={up ? 'good' : 'bad'} /></span>}
      </div>
      {hint && <div className="truncate text-xs text-faint">{hint}</div>}
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
    <div className="inline-flex rounded-[10px] border border-line bg-panel p-0.5">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${value === o ? 'bg-panel-2 text-text' : 'text-muted hover:text-text'}`}
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
