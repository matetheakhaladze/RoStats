import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Gamepad2, ExternalLink } from 'lucide-react'
import { PageHeader, Stat } from '../components/ui'
import { EmptyState, Spinner, UploadPrompt } from '../components/data'
import { DataBoard, sliceDays } from './Metrics'
import { api, fmt, type Dataset, type GameStats } from '../lib/api'
import { columnValues, isTimeSeries, kpi, numericColumns } from '../lib/data'
import { useAuth } from '../lib/auth'

export function useGameData() {
  const { gameId } = useAuth()
  const [stats, setStats] = useState<GameStats | null>(null)
  const [datasets, setDatasets] = useState<Dataset[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!gameId) { setDatasets([]); return }
    let alive = true
    setDatasets(null); setStats(null); setError(null)
    api.datasets(gameId).then((r) => alive && setDatasets(r.data)).catch((e) => alive && setError(e.message))
    api.gameStats().then((r) => alive && setStats(r.data.find((g) => g.universe_id === gameId) ?? null)).catch(() => {})
    return () => { alive = false }
  }, [gameId])

  return { stats, datasets, error }
}

export function KpiRow({ datasets, limit = 8 }: { datasets: Dataset[]; limit?: number }) {
  const tiles: { label: string; value: string; change?: number; hint: string; spark: number[]; unit: string }[] = []
  // Round robin across files so the row shows one number from each before repeating a file.
  const lists = datasets.filter(isTimeSeries).map((d) => numericColumns(d).map((c) => ({ d, c })))
  const picks: { d: Dataset; c: ReturnType<typeof numericColumns>[number] }[] = []
  for (let i = 0; picks.length < limit && lists.some((l) => l[i]); i++) for (const l of lists) if (l[i] && picks.length < limit) picks.push(l[i])
  for (const { d, c } of picks) {
    const k = kpi(d, Number(c.key))
    if (!k) continue
    const pct = c.isPercent && k.latest <= 100
    tiles.push({
      label: c.label,
      value: pct ? `${fmt(k.latest)}%` : fmt(k.latest),
      change: k.change,
      hint: k.change != null ? `last ${k.window} days vs the ${k.window} before` : d.name,
      spark: columnValues(d, Number(c.key)),
      unit: '%',
    })
  }
  if (!tiles.length) return null
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {tiles.map((t, i) => <Stat key={i} label={t.label} value={t.value} change={t.change} hint={t.hint} spark={t.spark} changeUnit={t.unit} />)}
    </div>
  )
}

export default function Overview() {
  const { me, gameId } = useAuth()
  const { stats, datasets, error } = useGameData()

  if (!me?.games.length || !gameId) {
    return (
      <div>
        <PageHeader title="Overview" />
        <EmptyState
          icon={<Gamepad2 size={24} />}
          title="Add your first game"
          text="Paste your game's Roblox link in Settings. RoStats shows its live stats right away, and you can upload Creator Dashboard exports for deeper analytics."
          action={<Link to="/app/settings" className="btn btn-primary">Add a game</Link>}
        />
      </div>
    )
  }

  const live = [
    { label: 'Playing now', value: fmt(stats?.playing), live: true },
    { label: 'Total visits', value: fmt(stats?.visits) },
    { label: 'Favorites', value: fmt(stats?.favorites) },
    { label: 'Like ratio', value: stats?.rating != null ? `${stats.rating}%` : '-' },
  ]
  return (
    <div className="space-y-4">
      <PageHeader
        title="Overview"
        subtitle={stats ? `${stats.name}${stats.creator ? ` by ${stats.creator}` : ''}` : 'Loading game'}
        actions={stats && <a className="btn" href={`https://www.roblox.com/games/${stats.place_id}`} target="_blank" rel="noreferrer"><ExternalLink size={14} />Open on Roblox</a>}
      />

      <div className="card flex flex-col gap-5 p-5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-4 lg:w-80 lg:shrink-0">
          {stats?.icon ? <img src={stats.icon} alt="" className="h-16 w-16 shrink-0 rounded-2xl bg-panel-2" /> : <div className="h-16 w-16 shrink-0 animate-pulse rounded-2xl bg-panel-2" />}
          <div className="min-w-0">
            <div className="truncate text-lg font-bold tracking-tight">{stats?.name ?? 'Loading'}</div>
            <div className="truncate text-[13px] text-muted">{stats?.genre ? `${stats.genre} · ` : ''}Live from Roblox</div>
          </div>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
          {live.map((l) => (
            <div key={l.label} className="bg-bg px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs text-muted">
                {l.live && <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-good opacity-60" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-good" /></span>}
                {l.label}
              </div>
              <div className="num mt-1 text-xl font-bold tracking-tight">{l.value}</div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-bad">{error}</p>}
      {datasets == null && !error && <Spinner />}
      {datasets && !datasets.length && <UploadPrompt what="Creator Dashboard" />}
      {datasets && datasets.length > 0 && <DataBoard datasets={datasets.map((d) => sliceDays(d, 30))} focus="overview" />}
    </div>
  )
}
