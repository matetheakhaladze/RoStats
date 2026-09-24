import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Gamepad2, Upload } from 'lucide-react'
import { PageHeader, Card, Segmented } from '../components/ui'
import { DatasetChart, EmptyState, InsightsCard, RankedTable, Spinner, UploadPrompt } from '../components/data'
import { MONEY_WORDS, PLAYER_WORDS, isTimeSeries, matches, numericColumns } from '../lib/data'
import type { Dataset } from '../lib/api'
import { useAuth } from '../lib/auth'
import { KpiRow, useGameData } from './Overview'

const PAGES = {
  players: {
    title: 'Players',
    subtitle: 'Retention, engagement and audience from your Creator Dashboard exports',
    words: PLAYER_WORDS,
    what: 'player (retention, engagement, acquisition)',
    tip: 'In Creator Dashboard open your experience, then Analytics. Export Retention, Engagement and Acquisition as CSV.',
  },
  monetization: {
    title: 'Monetization',
    subtitle: 'Revenue and paying users from your Creator Dashboard exports',
    words: MONEY_WORDS,
    what: 'monetization (revenue, payers)',
    tip: 'In Creator Dashboard open your experience, then Analytics, then Monetization. Export Revenue and Paying users as CSV.',
  },
} as const

const RANGES = [{ label: '7D', days: 7 }, { label: '30D', days: 30 }, { label: '90D', days: 90 }, { label: 'All', days: 0 }]

export function sliceDays(d: Dataset, days: number): Dataset {
  if (!days || !isTimeSeries(d)) return d
  return { ...d, rows: d.rows.slice(-days) }
}

export default function Metrics({ kind }: { kind: keyof typeof PAGES }) {
  const cfg = PAGES[kind]
  const { me, gameId } = useAuth()
  const { stats, datasets, error } = useGameData()
  const [range, setRange] = useState('30D')
  const days = RANGES.find((r) => r.label === range)!.days
  const all = datasets?.filter((d) => matches(d, cfg.words)) ?? null
  const mine = all?.map((d) => sliceDays(d, days)) ?? null

  if (!me?.games.length || !gameId) {
    return (
      <div>
        <PageHeader title={cfg.title} />
        <EmptyState icon={<Gamepad2 size={24} />} title="Add a game first" text="Add your game in Settings, then upload its Creator Dashboard exports." action={<Link to="/app/settings" className="btn btn-primary">Add a game</Link>} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={cfg.title}
        subtitle={`${stats?.name ?? 'Your game'} · ${range === 'All' ? 'all uploaded data' : `last ${days} days`}`}
        actions={<>
          {all && all.length > 0 && <Segmented options={RANGES.map((r) => r.label)} value={range} onChange={setRange} />}
          <Link to="/app/data" className="btn"><Upload size={14} />Import</Link>
        </>}
      />
      {error && <p className="text-sm text-bad">{error}</p>}
      {mine == null && !error && <Spinner />}
      {mine && !mine.length && (
        <>
          <UploadPrompt what={cfg.what} />
          <p className="mt-3 text-center text-xs text-muted">{cfg.tip}</p>
        </>
      )}
      {mine && mine.length > 0 && (
        <DataBoard datasets={mine} focus={kind} ids={all!.map((d) => d.id)} />
      )}
    </div>
  )
}

export function DataBoard({ datasets, focus, ids }: { datasets: Dataset[]; focus: 'overview' | 'players' | 'monetization'; ids?: number[] }) {
  const series = datasets.filter(isTimeSeries)
  const ranked = datasets.filter((d) => !isTimeSeries(d))
  const score = (d: Dataset) => numericColumns(d).filter((c) => !c.isPercent).length * 10 + (/revenue|robux|active|dau/i.test(d.name) ? 5 : 0)
  const ordered = [...series].sort((a, b) => score(b) - score(a))
  const [main, ...rest] = ordered
  return (
    <div className="space-y-4">
      <KpiRow datasets={ordered} limit={4} />
      <div className="grid gap-4 xl:grid-cols-3">
        {main
          ? <Card title={main.name} subtitle={`${main.rows.length} days`} className="xl:col-span-2"><DatasetChart d={main} height={300} /></Card>
          : <div className="xl:col-span-2" />}
        <InsightsCard focus={focus} datasetIds={ids} />
      </div>
      {(ranked.length > 0 || rest.length > 0) && (
        <div className="grid gap-4 xl:grid-cols-2">
          {ranked.map((d) => <Card key={d.id} title={d.name} subtitle={`${d.rows.length} rows`}><RankedTable d={d} /></Card>)}
          {rest.map((d) => <Card key={d.id} title={d.name} subtitle={`${d.rows.length} days`}><DatasetChart d={d} height={240} /></Card>)}
        </div>
      )}
    </div>
  )
}
