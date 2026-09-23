import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Sparkles, RefreshCw, Upload, Lock } from 'lucide-react'
import { Card, Badge, chartTooltip, axisStyle } from './ui'
import { api, type Dataset } from '../lib/api'
import { chartRows, numericColumns, SERIES_COLORS } from '../lib/data'
import { useAuth } from '../lib/auth'

export function DatasetChart({ d, height = 260 }: { d: Dataset; height?: number }) {
  const cols = numericColumns(d).slice(0, 5)
  const rows = chartRows(d)
  if (!cols.length) return <div className="text-sm text-muted">No numeric columns found in this file.</div>
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ left: -10, right: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="x" tick={axisStyle} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={56} />
          <Tooltip {...chartTooltip} />
          {cols.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {cols.map((c, i) => (
            <Line key={c.key} type="monotone" dataKey={c.key} name={c.label} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={2} dot={rows.length < 20} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
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

  return (
    <Card
      title="AI insights"
      subtitle={pro ? 'Findings from your uploaded data. Uses 1 AI message.' : 'Pro feature'}
      right={pro ? <button className="btn" onClick={run} disabled={busy}>{busy ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}{text ? 'Refresh' : 'Analyze'}</button> : <Badge tone="accent">Pro</Badge>}
    >
      {!pro && <p className="text-sm text-muted">Upgrade to Pro to get AI analysis of your Creator Dashboard data.</p>}
      {pro && !text && !error && <p className="text-sm text-muted">Click Analyze to get the key findings and one next action.</p>}
      {error && <p className="text-sm text-bad">{error}</p>}
      {text && <div className="whitespace-pre-line text-sm leading-relaxed">{text}</div>}
    </Card>
  )
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted"><RefreshCw size={14} className="animate-spin" />{label}</div>
  )
}
