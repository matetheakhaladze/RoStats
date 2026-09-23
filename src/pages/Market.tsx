import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, RefreshCw, Search, Sparkles, TrendingUp } from 'lucide-react'
import { PageHeader, Card, Badge, Segmented } from '../components/ui'
import { Spinner } from '../components/data'
import { api, fmt, type Board, type Growth, type MarketAnalysis, type MarketSort, type Rising } from '../lib/api'

const TABS = ['Rising games', 'Leaderboards', 'Home page charts']

function GrowthBadge({ g }: { g?: Growth | null }) {
  if (!g || g.change == null || g.change_pct == null) return <span className="text-xs text-muted">tracking</span>
  const up = g.change >= 0
  return (
    <span className={`text-xs font-medium ${up ? 'text-good' : 'text-bad'}`} title={`${fmt(g.before)} players ${g.hours}h ago`}>
      {up ? '+' : ''}{fmt(g.change)} ({up ? '+' : ''}{g.change_pct}%) <span className="font-normal text-muted">{g.hours}h</span>
    </span>
  )
}

function Icon({ src, size = 'h-10 w-10' }: { src?: string; size?: string }) {
  return src ? <img src={src} alt="" className={`${size} rounded-lg bg-panel-2 shrink-0`} /> : <div className={`${size} rounded-lg bg-panel-2 shrink-0`} />
}

function PlayLink({ placeId }: { placeId?: string }) {
  if (!placeId) return null
  return (
    <a className="btn px-2 py-1" href={`https://www.roblox.com/games/${placeId}`} target="_blank" rel="noreferrer" title="Open on Roblox">
      <ExternalLink size={12} />
    </a>
  )
}

function ageLabel(days: number | null) {
  if (days == null) return null
  if (days < 1) return 'released today'
  if (days < 60) return `${days} days old`
  if (days < 365) return `${Math.round(days / 30)} months old`
  return `${Math.round(days / 365)}y old`
}

/* ---------------------------------------------------------------- Rising */

function RisingTab() {
  const [data, setData] = useState<Rising | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ai, setAi] = useState<MarketAnalysis | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  useEffect(() => {
    api.rising().then(setData).catch((e) => setError(e.message))
    api.marketAnalysis().then(setAi).catch((e) => setAiError(e.message))
  }, [])

  const notes = useMemo(() => new Map((ai?.games ?? []).map((g) => [g.universe_id, g])), [ai])

  if (error) return <Card><p className="text-sm text-bad">{error}</p></Card>
  if (!data) return <Spinner label="Finding games that are taking off" />

  return (
    <div className="space-y-4">
      {data.mode === 'new' && (
        <div className="rounded-lg border border-line bg-panel p-3 text-xs text-muted">
          RoStats started tracking player counts {data.history_hours < 1 ? 'less than an hour' : `${Math.round(data.history_hours)} hours`} ago.
          Until there is a full day of history, this list shows young games from Roblox's Up-and-Coming chart. Growth numbers fill in automatically.
        </div>
      )}

      <Card title="What's trending" subtitle="AI read on the games below, refreshed every few hours">
        {ai ? (
          <p className="text-sm leading-relaxed">{ai.summary || 'No summary yet.'}</p>
        ) : aiError ? (
          <p className="text-sm text-muted">{aiError}</p>
        ) : (
          <Spinner label="Analyzing the games" />
        )}
      </Card>

      <div className="space-y-3">
        {data.games.map((g, i) => {
          const note = notes.get(g.universe_id)
          return (
            <div key={g.universe_id} className="card p-4">
              <div className="flex items-start gap-3">
                <span className="w-5 pt-2 text-sm text-muted">{i + 1}</span>
                <Icon src={g.icon} size="h-14 w-14" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium truncate">{g.name}</span>
                    {g.age_days != null && g.age_days <= 60 && <Badge tone="accent">New</Badge>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span><span className="text-text font-medium">{fmt(g.playing)}</span> playing</span>
                    <GrowthBadge g={g.growth} />
                    {g.rating != null && <span>{g.rating}% liked</span>}
                    {g.visits != null && <span>{fmt(g.visits)} visits</span>}
                    {ageLabel(g.age_days) && <span>{ageLabel(g.age_days)}</span>}
                    {g.creator && <span>by {g.creator}</span>}
                  </div>
                </div>
                <PlayLink placeId={g.place_id} />
              </div>
              {note && (
                <div className="mt-3 ml-8 rounded-lg border border-line bg-bg p-3 text-sm">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-accent"><Sparkles size={12} />Why it's growing</div>
                  <p className="mt-1 leading-relaxed">{note.why}</p>
                  {note.copy.length > 0 && (
                    <>
                      <div className="mt-2 text-xs font-medium text-muted">What you can take from it</div>
                      <ul className="mt-1 list-disc pl-5 space-y-0.5">
                        {note.copy.map((c) => <li key={c}>{c}</li>)}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {!data.games.length && <Card><p className="text-sm text-muted">No fast risers right now. Check back in a few hours.</p></Card>}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- Leaderboards */

function LeaderboardsTab() {
  const [cats, setCats] = useState<string[]>([])
  const [active, setActive] = useState<string>('+1')
  const [query, setQuery] = useState('')
  const [board, setBoard] = useState<Board | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { api.categories().then((r) => setCats(r.categories)).catch(() => {}) }, [])

  const load = (p: { name?: string; q?: string }) => {
    setLoading(true); setError(null)
    api.board(p).then(setBoard).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }
  useEffect(() => { load({ name: active }) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (c: string) => { setActive(c); setQuery(''); load({ name: c }) }
  const search = () => { if (query.trim()) { setActive(''); load({ q: query.trim() }) } }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {cats.map((c) => (
          <button key={c} onClick={() => pick(c)} className={`btn text-xs ${active === c ? 'btn-primary' : ''}`}>{c}</button>
        ))}
      </div>
      <form className="flex gap-2 max-w-md" onSubmit={(e) => { e.preventDefault(); search() }}>
        <input className="input" placeholder="Any keyword, like 'fishing' or 'mining'" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="btn shrink-0" type="submit" disabled={!query.trim()}><Search size={14} />Search</button>
      </form>

      {error && <Card><p className="text-sm text-bad">{error}</p></Card>}
      {loading && <Spinner label="Loading leaderboard" />}
      {board && !loading && (
        <Card
          title={`Top "${board.name}" games`}
          subtitle={`By players right now · updated ${new Date(board.updated * 1000).toLocaleTimeString()}`}
        >
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr><th className="w-8">#</th><th>Game</th><th className="text-right">Players</th><th className="text-right">24h change</th><th className="text-right">Rating</th><th></th></tr>
              </thead>
              <tbody>
                {board.games.map((g, i) => (
                  <tr key={g.universe_id}>
                    <td className="text-muted">{i + 1}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <Icon src={g.icon} size="h-9 w-9" />
                        <span className="font-medium">{g.name}</span>
                      </div>
                    </td>
                    <td className="text-right font-medium">{fmt(g.playing)}</td>
                    <td className="text-right"><GrowthBadge g={g.growth} /></td>
                    <td className="text-right">
                      {g.rating != null ? <Badge tone={g.rating >= 85 ? 'good' : g.rating >= 70 ? 'warn' : 'bad'}>{g.rating}%</Badge> : '-'}
                    </td>
                    <td className="text-right"><PlayLink placeId={g.place_id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!board.games.length && <p className="text-sm text-muted">No games found.</p>}
        </Card>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- Home charts */

function ChartsTab() {
  const [sorts, setSorts] = useState<MarketSort[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState('')

  useEffect(() => {
    api.market().then((r) => { setSorts(r.sorts); setActive(r.sorts[0]?.title ?? '') }).catch((e) => setError(e.message))
  }, [])

  const sort = sorts?.find((s) => s.title === active) ?? sorts?.[0]
  if (error) return <Card><p className="text-sm text-bad">{error}</p></Card>
  if (!sorts) return <Spinner label="Loading Roblox charts" />
  if (!sort) return <Card><p className="text-sm text-muted">Roblox did not return any charts right now.</p></Card>

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto"><Segmented options={sorts.map((s) => s.title)} value={sort.title} onChange={setActive} /></div>
      <Card title={sort.title} subtitle="Straight from the Roblox home page">
        <table className="table w-full">
          <thead><tr><th className="w-8">#</th><th>Game</th><th className="text-right">Players</th><th className="text-right">Rating</th><th></th></tr></thead>
          <tbody>
            {sort.games.map((g, i) => (
              <tr key={g.universe_id}>
                <td className="text-muted">{i + 1}</td>
                <td><div className="flex items-center gap-3"><Icon src={g.icon} size="h-9 w-9" /><span className="font-medium">{g.name}</span></div></td>
                <td className="text-right">{fmt(g.playing)}</td>
                <td className="text-right">{g.rating != null ? `${g.rating}%` : '-'}</td>
                <td className="text-right"><PlayLink placeId={g.place_id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

export default function Market() {
  const [tab, setTab] = useState(TABS[0])
  const [key, setKey] = useState(0)
  return (
    <div>
      <PageHeader
        title="Market Trends"
        subtitle="Games that are taking off, why, and who leads each genre"
        actions={<button className="btn" onClick={() => setKey((k) => k + 1)}><RefreshCw size={14} />Refresh</button>}
      />
      <div className="mb-4 flex items-center gap-3">
        <TrendingUp size={16} className="text-muted" />
        <Segmented options={TABS} value={tab} onChange={setTab} />
      </div>
      <div key={`${tab}-${key}`}>
        {tab === TABS[0] && <RisingTab />}
        {tab === TABS[1] && <LeaderboardsTab />}
        {tab === TABS[2] && <ChartsTab />}
      </div>
    </div>
  )
}
