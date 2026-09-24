import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Sparkles, RefreshCw, Upload, Lock } from 'lucide-react'
import { Badge, chartTooltip, axisStyle } from './ui'
import { api, fmt, type Dataset } from '../lib/api'
import { chartRows, isTimeSeries, numericColumns, shortDate, toNumber, SERIES_COLORS } from '../lib/data'
import { useAuth } from '../lib/auth'

export function DatasetChart({ d, height = 260, stacked }: { d: Dataset; height?: number; stacked?: boolean }) {
  const allCols = numericColumns(d)
  const counts = allCols.filter((c) => !c.isPercent)
  // Mixing counts and percentages on one axis flattens the percentages, so plot one kind only.
  const cols = (counts.length && counts.length < allCols.length ? counts : allCols).slice(0, 5)
  const rows = chartRows(d)
  if (!cols.length) return <div className="text-sm text-muted">No numeric columns found in this file.</div>
  if (!isTimeSeries(d)) return <RankedTable d={d} />
  const stack = stacked ?? (cols.length > 1 && !cols.some((c) => c.isPercent))
  return (
    <div style={{ height }}>
      {cols.length > 1 && (
        <div className="-mt-1 mb-3 flex flex-wrap gap-x-4 gap-y-1">
          {cols.map((c, i) => (
            <span key={c.key} className="inline-flex items-center gap-1.5 text-xs text-muted">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />{c.label}
            </span>
          ))}
        </div>
      )}
      <ResponsiveContainer height={cols.length > 1 ? height - 28 : height}>
        <AreaChart data={rows} margin={{ left: -10, right: 8, top: 4 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="x" tick={axisStyle} axisLine={false} tickLine={false} minTickGap={32} tickFormatter={shortDate} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={52} tickFormatter={(v) => fmt(v)} />
          <Tooltip {...chartTooltip} labelFormatter={(l) => shortDate(String(l))} formatter={(v) => fmt(Number(v))} />
          {cols.map((c, i) => {
            const color = SERIES_COLORS[i % SERIES_COLORS.length]
            return (
              <Area
                key={c.key}
                type="monotone"
                dataKey={c.key}
                name={c.label}
                stackId={stack ? 'a' : undefined}
                stroke={color}
                strokeWidth={stack ? 1.5 : 2}
                fill={color}
                fillOpacity={stack ? 0.55 : cols.length > 1 ? 0.06 : 0.12}
                dot={false}
                activeDot={{ r: 3.5 }}
                connectNulls
              />
            )
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// Category files (products, countries, devices) shown as a ranked list with share bars.
export function RankedTable({ d, limit = 8 }: { d: Dataset; limit?: number }) {
  const cols = numericColumns(d)
  const main = cols[cols.length - 1]
  if (!main) return null
  const labelCols = d.columns.map((_, i) => i).filter((i) => !cols.some((c) => Number(c.key) === i))
  const rows = d.rows
    .map((r) => ({ name: String(r[0] ?? ''), sub: labelCols.slice(1).map((i) => r[i]).filter(Boolean).join(' · '), v: toNumber(r[Number(main.key)]) ?? 0 }))
    .sort((a, b) => b.v - a.v)
  const total = rows.reduce((s, r) => s + r.v, 0) || 1
  const top = rows[0]?.v || 1
  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_5rem_3.5rem] gap-x-4 border-b border-line pb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">
        <span>{d.columns[0]}</span><span className="hidden sm:block">Share</span><span className="text-right">{main.label}</span><span className="text-right">%</span>
      </div>
      {rows.slice(0, limit).map((r, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_5rem_3.5rem] items-center gap-x-4 border-b border-line py-3 last:border-0">
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{r.name}</span>
            {r.sub && <span className="block truncate text-xs text-muted">{r.sub}</span>}
          </span>
          <span className="hidden h-1.5 rounded-full bg-panel-2 sm:block">
            <span className="block h-1.5 rounded-full" style={{ width: `${(r.v / top) * 100}%`, background: SERIES_COLORS[i < 2 ? 0 : 1] }} />
          </span>
          <span className="num text-right text-sm font-semibold">{fmt(r.v)}</span>
          <span className="num text-right text-sm text-muted">{((r.v / total) * 100).toFixed(1)}%</span>
        </div>
      ))}
      {rows.length > limit && <p className="pt-2 text-xs text-muted">Showing the top {limit} of {rows.length}.</p>}
    </div>
  )
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center p-10 text-center">
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <div className="font-semibold">{title}</div>
      <p className="mt-1 max-w-md text-sm text-muted">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function UploadPrompt({ what }: { what: string }) {
  return (
    <EmptyState
      icon={<Upload size={24} />}
      title={`No ${what} data yet`}
      text={`Export the ${what} charts from your Roblox Creator Dashboard as CSV and upload them on the Import data page.`}
      action={<Link to="/app/data" className="btn btn-primary">Import data</Link>}
    />
  )
}

export function ProGate({ feature }: { feature: string }) {
  return (
    <EmptyState
      icon={<Lock size={24} />}
      title={`${feature} is part of Pro`}
      text="Pro unlocks the AI tools, unlimited games and full data history."
      action={<Link to="/app/billing" className="btn btn-primary">See plans</Link>}
    />
  )
}

export function InsightsCard({ focus, datasetIds }: { focus: 'overview' | 'players' | 'monetization'; datasetIds?: number[] }) {
  const { me, gameId, refresh } = useAuth()
  const [text, setText] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pro = me?.plan === 'pro'

  const run = async () => {
    setBusy(true); setError(null)
    try {
      const r = await api.insights({ universe_id: gameId ?? undefined, focus, dataset_ids: datasetIds })
      setText(r.text)
      refresh()
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  const lines = text?.split('\n').map((l) => l.replace(/^[-*•\d.\s]+/, '').trim()).filter(Boolean) ?? []
  const dots = ['bg-warn', 'bg-accent', 'bg-good', 'bg-violet', 'bg-bad']
  return (
    <div className="card flex h-full flex-col p-5">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={16} className="text-accent" />
        <h2 className="text-[15px] font-semibold tracking-tight">What stands out</h2>
        {pro
          ? <button className="btn ml-auto px-2.5 py-1.5 text-xs" onClick={run} disabled={busy}>{busy ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}{text ? 'Refresh' : 'Analyze'}</button>
          : <span className="ml-auto"><Badge tone="accent">Pro</Badge></span>}
      </div>
      {!pro && <p className="text-sm text-muted">Upgrade to Pro and AI reads your uploaded data, then tells you what changed and what to do next.</p>}
      {pro && !text && !error && !busy && <p className="text-sm text-muted">Click Analyze. AI reads your uploaded data and gives the key findings plus one next step. Uses 1 AI message.</p>}
      {busy && !text && <div className="space-y-2.5">{[90, 75, 82].map((w) => <div key={w} className="h-3 animate-pulse rounded bg-panel-2" style={{ width: `${w}%` }} />)}</div>}
      {error && <p className="text-sm text-bad">{error}</p>}
      {lines.length > 0 && (
        <ul className="space-y-3">
          {lines.map((l, i) => (
            <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed">
              <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${dots[i % dots.length]}`} />{l}
            </li>
          ))}
        </ul>
      )}
      {pro && <Link to="/app/chatbot" className="mt-auto pt-4 text-[13px] font-semibold text-accent hover:underline">Ask the chatbot about this</Link>}
    </div>
  )
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted"><RefreshCw size={14} className="animate-spin" />{label}</div>
  )
}
