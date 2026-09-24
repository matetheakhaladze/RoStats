import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, RefreshCw, Search, Sparkles } from 'lucide-react'
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
  return src ? <img src={src} alt="" className={`${size} shrink-0 rounded-xl bg-panel-2`} /> : <div className={`${size} shrink-0 rounded-xl bg-panel-2`} />
}

function PlayLink({ placeId }: { placeId?: string }) {
  if (!placeId) return null
  return (
    <a className="btn px-2.5" href={`https://www.roblox.com/games/${placeId}`} target="_blank" rel="noreferrer" title="Open on Roblox">
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
  const [picked, setPicked] = useState<string | null>(null)

  useEffect(() => {
    api.rising().then(setData).catch((e) => setError(e.message))
    api.marketAnalysis().then(setAi).catch((e) => setAiError(e.message))
  }, [])

  const notes = useMemo(() => new Map((ai?.games ?? []).map((g) => [g.universe_id, g])), [ai])

  if (error) return <Card><p className="text-sm text-bad">{error}</p></Card>
  if (!data) return <Spinner label="Finding games that are taking off" />

  const sel = data.games.find((g) => g.universe_id === picked) ?? data.games[0]
  const note = sel ? notes.get(sel.universe_id) : undefined

  return (
    <div className="space-y-4">
      <div className="card flex gap-3 p-5">
        <Sparkles size={18} className="mt-0.5 shrink-0 text-accent" />
        <div className="min-w-0">
          <div className="text-[15px] font-semibold tracking-tight">What's trending</div>
          {ai ? <p className="mt-1 text-sm leading-relaxed text-muted">{ai.summary || 'No summary yet.'}</p>
            : aiError ? <p className="mt-1 text-sm text-muted">{aiError}</p>
            : <div className="mt-2"><Spinner label="AI is reading the games" /></div>}
        </div>
      </div>

      {data.mode === 'new' && (
        <p className="text-xs text-muted">
          Tracking started {data.history_hours < 1 ? 'less than an hour' : `${Math.round(data.history_hours)} hours`} ago. Until there is a full day of history, this list shows young games from Roblox's Up-and-Coming chart.
        </p>
      )}

      {!data.games.length && <Card><p className="text-sm text-muted">No fast risers right now. Check back in a few hours.</p></Card>}
      {data.games.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="card overflow-hidden">
            <div className="grid grid-cols-[2rem_minmax(0,1fr)_6rem_7rem] gap-3 border-b border-line px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-faint">
              <span>#</span><span>Game</span><span className="text-right">Playing</span><span className="text-right">Growth</span>
            </div>
            {data.games.map((g, i) => {
              const on = g.universe_id === sel?.universe_id
              return (
                <button
                  key={g.universe_id}
                  onClick={() => setPicked(g.universe_id)}
                  className={`grid w-full grid-cols-[2rem_minmax(0,1fr)_6rem_7rem] items-center gap-3 border-b border-line px-5 py-3 text-left last:border-0 ${on ? 'bg-panel-2' : 'hover:bg-panel-2/50'}`}
                >
                  <span className="num text-sm text-muted">{i + 1}</span>
                  <span className="flex min-w-0 items-center gap-3">
                    <Icon src={g.icon} size="h-10 w-10" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">{g.name}</span>
                        {g.age_days != null && g.age_days <= 60 && <Badge tone="accent">New</Badge>}
                        {notes.has(g.universe_id) && <Sparkles size={12} className="shrink-0 text-accent" />}
                      </span>
                      <span className="block truncate text-xs text-muted">{[g.creator && `by ${g.creator}`, ageLabel(g.age_days), g.rating != null && `${g.rating}% liked`].filter(Boolean).join(' · ')}</span>
                    </span>
                  </span>
                  <span className="num text-right text-sm font-semibold">{fmt(g.playing)}</span>
                  <span className="text-right"><GrowthBadge g={g.growth} /></span>
                </button>
              )
            })}
          </div>

          {sel && (
            <div className="card h-fit p-5 xl:sticky xl:top-0">
              <div className="flex items-center gap-4">
                <Icon src={sel.icon} size="h-16 w-16" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-bold tracking-tight">{sel.name}</div>
                  <div className="truncate text-[13px] text-muted">{sel.creator ? `by ${sel.creator}` : 'Roblox game'}</div>
                </div>
                <PlayLink placeId={sel.place_id} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
                {[['Playing', fmt(sel.playing)], ['Liked', sel.rating != null ? `${sel.rating}%` : '-'], ['Visits', sel.visits != null ? fmt(sel.visits) : '-']].map(([l, v]) => (
                  <div key={l} className="bg-bg px-3 py-2.5"><div className="text-xs text-muted">{l}</div><div className="num mt-0.5 font-bold">{v}</div></div>
                ))}
              </div>
              <div className="mt-2 text-xs"><GrowthBadge g={sel.growth} /></div>
              {note ? (
                <div className="mt-5 space-y-4">
                  <div>
                    <div className="label mb-1.5 flex items-center gap-1.5"><Sparkles size={12} className="text-accent" />Why it's growing</div>
                    <p className="text-sm leading-relaxed">{note.why}</p>
                  </div>
                  {note.copy.length > 0 && (
                    <div>
                      <div className="label mb-1.5">What you can take from it</div>
                      <ul className="space-y-2">
                        {note.copy.map((c) => <li key={c} className="flex gap-2.5 text-sm leading-relaxed"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-good" />{c}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-5 text-sm text-muted">{ai ? 'No AI notes for this game yet. They cover the fastest risers and refresh every few hours.' : 'AI notes load with the trend summary.'}</p>
              )}
            </div>
          )}
        </div>
      )}
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
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="flex flex-1 flex-wrap gap-1.5">
          {cats.map((c) => (
            <button key={c} onClick={() => pick(c)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${active === c ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:border-line-strong hover:text-text'}`}>{c}</button>
          ))}
        </div>
        <form className="relative w-full lg:w-72" onSubmit={(e) => { e.preventDefault(); search() }}>
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-9" placeholder="Search a genre, like fishing" value={query} onChange={(e) => setQuery(e.target.value)} />
        </form>
      </div>

      {error && <Card><p className="text-sm text-bad">{error}</p></Card>}
      {loading && <Spinner label="Loading leaderboard" />}
      {board && !loading && (
        <Card
          title={`Top "${board.name}" games`}
          subtitle={`By players right now · updated ${new Date(board.updated * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
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
        actions={<>
          <Segmented options={TABS} value={tab} onChange={setTab} />
          <button className="btn px-2.5" onClick={() => setKey((k) => k + 1)} title="Refresh" aria-label="Refresh"><RefreshCw size={14} /></button>
        </>}
      />
      <div key={`${tab}-${key}`}>
        {tab === TABS[0] && <RisingTab />}
        {tab === TABS[1] && <LeaderboardsTab />}
        {tab === TABS[2] && <ChartsTab />}
      </div>
    </div>
  )
}
