import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { PageHeader, Card, Badge, Segmented } from '../components/ui'
import { Spinner } from '../components/data'
import { api, fmt, type MarketSort } from '../lib/api'

export default function Market() {
  const [sorts, setSorts] = useState<MarketSort[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState<string>('')
  const [updated, setUpdated] = useState<number>(0)

  const load = () => {
    setError(null)
    api.market()
      .then((r) => { setSorts(r.sorts); setUpdated(r.updated); if (r.sorts[0] && !active) setActive(r.sorts[0].title) })
      .catch((e) => setError(e.message))
  }
  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sort = useMemo(() => sorts?.find((s) => s.title === active) ?? sorts?.[0], [sorts, active])
  const total = sort?.games.reduce((s, g) => s + g.playing, 0) ?? 0

  return (
    <div>
      <PageHeader
        title="Market Trends"
        subtitle="Live from the Roblox home page, refreshed every 10 minutes"
        actions={<button className="btn" onClick={load}><RefreshCw size={14} />Refresh</button>}
      />
      {error && <Card><p className="text-sm text-bad">{error}</p></Card>}
      {!sorts && !error && <Spinner label="Loading Roblox charts" />}
      {sorts && !sorts.length && <Card><p className="text-sm text-muted">Roblox did not return any charts right now. Try again in a few minutes.</p></Card>}
      {sort && (
        <>
          <div className="mb-4 overflow-x-auto">
            <Segmented options={sorts!.map((s) => s.title)} value={sort.title} onChange={setActive} />
          </div>
          <Card
            title={sort.title}
            subtitle={`${sort.games.length} games · ${fmt(total)} playing now · updated ${new Date(updated * 1000).toLocaleTimeString()}`}
          >
            <table className="table w-full">
              <thead><tr><th>#</th><th>Game</th><th className="text-right">Playing</th><th className="text-right">Share</th><th className="text-right">Rating</th><th></th></tr></thead>
              <tbody>
                {sort.games.map((g, i) => (
                  <tr key={g.universe_id}>
                    <td className="text-muted w-8">{i + 1}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        {g.icon ? <img src={g.icon} alt="" className="h-9 w-9 rounded-lg bg-panel-2" /> : <div className="h-9 w-9 rounded-lg bg-panel-2" />}
                        <span className="font-medium">{g.name}</span>
                      </div>
                    </td>
                    <td className="text-right">{fmt(g.playing)}</td>
                    <td className="text-right text-muted">{total ? `${Math.round((g.playing / total) * 100)}%` : '-'}</td>
                    <td className="text-right">
                      {g.rating != null ? <Badge tone={g.rating >= 85 ? 'good' : g.rating >= 70 ? 'warn' : 'bad'}>{g.rating}%</Badge> : '-'}
                    </td>
                    <td className="text-right">
                      {g.place_id && <a className="btn px-2 py-1" href={`https://www.roblox.com/games/${g.place_id}`} target="_blank" rel="noreferrer"><ExternalLink size={12} /></a>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}
