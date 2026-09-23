import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Gamepad2, ExternalLink } from 'lucide-react'
import { PageHeader, Card, Stat } from '../components/ui'
import { DatasetChart, EmptyState, InsightsCard, Spinner, UploadPrompt } from '../components/data'
import { api, fmt, type Dataset, type GameStats } from '../lib/api'
import { kpi, numericColumns } from '../lib/data'
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
  const tiles: { label: string; value: string; change?: number; hint: string }[] = []
  for (const d of datasets) {
    for (const c of numericColumns(d)) {
      const k = kpi(d, Number(c.key))
      if (!k) continue
      tiles.push({
        label: c.label,
        value: c.isPercent && k.latest <= 100 ? `${fmt(k.latest)}%` : fmt(k.latest),
        change: k.change,
        hint: k.change != null ? `vs previous ${k.window} days` : d.name,
      })
      if (tiles.length >= limit) break
    }
    if (tiles.length >= limit) break
  }
  if (!tiles.length) return null
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((t, i) => <Stat key={i} label={t.label} value={t.value} change={t.change} hint={t.hint} />)}
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

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle={stats ? stats.name : 'Loading game'}
        actions={stats && <a className="btn" href={`https://www.roblox.com/games/${stats.place_id}`} target="_blank" rel="noreferrer"><ExternalLink size={14} />Open on Roblox</a>}
      />

      <div className="card p-5 flex flex-wrap items-center gap-5">
        {stats?.icon ? <img src={stats.icon} alt="" className="h-16 w-16 rounded-xl bg-panel-2" /> : <div className="h-16 w-16 rounded-xl bg-panel-2" />}
        <div className="min-w-0 flex-1">
          <div className="text-lg font-semibold truncate">{stats?.name ?? '...'}</div>
          <div className="text-xs text-muted">{stats?.genre ? `${stats.genre} · ` : ''}Live data from Roblox</div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
          <div><div className="text-xs text-muted">Playing now</div><div className="text-lg font-semibold">{fmt(stats?.playing)}</div></div>
          <div><div className="text-xs text-muted">Visits</div><div className="text-lg font-semibold">{fmt(stats?.visits)}</div></div>
          <div><div className="text-xs text-muted">Favorites</div><div className="text-lg font-semibold">{fmt(stats?.favorites)}</div></div>
          <div><div className="text-xs text-muted">Rating</div><div className="text-lg font-semibold">{stats?.rating != null ? `${stats.rating}%` : '-'}</div></div>
        </div>
      </div>

      <div className="mt-4">
        {error && <p className="text-sm text-bad">{error}</p>}
        {datasets == null && !error && <Spinner />}
        {datasets && !datasets.length && <UploadPrompt what="Creator Dashboard" />}
        {datasets && datasets.length > 0 && (
          <>
            <KpiRow datasets={datasets} />
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <Card title={datasets[0].name} subtitle={`Uploaded ${new Date(datasets[0].uploaded_at).toLocaleDateString()}`} className="lg:col-span-2">
                <DatasetChart d={datasets[0]} />
              </Card>
              <InsightsCard focus="overview" />
            </div>
            {datasets.length > 1 && (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {datasets.slice(1, 5).map((d) => (
                  <Card key={d.id} title={d.name} subtitle={`${d.rows.length} rows`}><DatasetChart d={d} height={220} /></Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
