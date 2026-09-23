import { useEffect, useState } from 'react'
import { Plus, Trash2, ExternalLink } from 'lucide-react'
import { PageHeader, Card, Badge } from '../components/ui'
import { api, fmt, type GameStats } from '../lib/api'
import { useAuth } from '../lib/auth'

export default function SettingsPage() {
  const { me, refresh, signOut, setGameId } = useAuth()
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null)
  const [stats, setStats] = useState<GameStats[]>([])
  const [confirm, setConfirm] = useState(false)

  const loadStats = () => { api.gameStats().then((r) => setStats(r.data)).catch(() => {}) }
  useEffect(loadStats, [me?.games.length])

  if (!me) return null

  const add = async () => {
    if (!input.trim()) return
    setBusy(true); setMsg(null)
    try {
      const g = await api.addGame(input.trim())
      setInput('')
      setMsg({ tone: 'good', text: `Added ${g.name}` })
      await refresh()
      setGameId(g.universe_id)
    } catch (e) {
      setMsg({ tone: 'bad', text: (e as Error).message })
    } finally { setBusy(false) }
  }

  const remove = async (id: string) => {
    await api.removeGame(id).catch((e) => setMsg({ tone: 'bad', text: e.message }))
    await refresh()
  }

  const deleteAccount = async () => {
    await api.deleteMe().catch(() => {})
    signOut()
  }

  const limitReached = me.game_limit != null && me.games.length >= me.game_limit

  return (
    <div>
      <PageHeader title="Settings" subtitle="Your account and games" />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Games" subtitle={me.game_limit != null ? `Free plan: ${me.games.length} of ${me.game_limit} game` : 'Pro: unlimited games'} className="lg:col-span-2">
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="Paste a game link, like https://www.roblox.com/games/123456/..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              disabled={busy || limitReached}
            />
            <button className="btn btn-primary shrink-0" onClick={add} disabled={busy || limitReached || !input.trim()}><Plus size={14} />Add</button>
          </div>
          {limitReached && <p className="mt-2 text-xs text-muted">Remove your game or upgrade to Pro to add more.</p>}
          {msg && <p className={`mt-2 text-sm ${msg.tone === 'good' ? 'text-good' : 'text-bad'}`}>{msg.text}</p>}

          <div className="mt-4 space-y-2">
            {!me.games.length && <p className="text-sm text-muted">No games yet.</p>}
            {me.games.map((g) => {
              const s = stats.find((x) => x.universe_id === g.universe_id)
              return (
                <div key={g.universe_id} className="flex items-center gap-3 rounded-lg border border-line bg-bg p-3">
                  {s?.icon ? <img src={s.icon} alt="" className="h-10 w-10 rounded-lg" /> : <div className="h-10 w-10 rounded-lg bg-panel-2" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{g.name}</div>
                    <div className="text-xs text-muted">{s ? `${fmt(s.playing)} playing · ${fmt(s.visits)} visits` : `Universe ${g.universe_id}`}</div>
                  </div>
                  {g.place_id && <a className="btn px-2 py-1" href={`https://www.roblox.com/games/${g.place_id}`} target="_blank" rel="noreferrer"><ExternalLink size={12} /></a>}
                  <button className="btn px-2 py-1 text-bad" title="Remove game and its data" onClick={() => remove(g.universe_id)}><Trash2 size={12} /></button>
                </div>
              )
            })}
          </div>
        </Card>

        <Card title="Account">
          <div className="flex items-center gap-3">
            {me.picture ? <img src={me.picture} alt="" className="h-12 w-12 rounded-full bg-panel-2" /> : <div className="h-12 w-12 rounded-full bg-panel-2" />}
            <div>
              <div className="font-medium">{me.display_name || me.name}</div>
              <div className="text-xs text-muted">@{me.name} · ID {me.id}</div>
            </div>
          </div>
          <div className="mt-3"><Badge tone={me.plan === 'pro' ? 'accent' : 'neutral'}>{me.plan === 'pro' ? 'Pro' : 'Free'}</Badge></div>
          <div className="mt-5 space-y-2">
            <button className="btn w-full justify-center" onClick={signOut}>Sign out</button>
            {!confirm
              ? <button className="btn w-full justify-center text-bad" onClick={() => setConfirm(true)}>Delete my data</button>
              : (
                <div className="rounded-lg border border-line bg-bg p-3 text-xs">
                  <p>This deletes your account, games, uploaded files and generated images. It cannot be undone.</p>
                  <div className="mt-2 flex gap-2">
                    <button className="btn px-2 py-1 text-bad" onClick={deleteAccount}>Delete everything</button>
                    <button className="btn px-2 py-1" onClick={() => setConfirm(false)}>Cancel</button>
                  </div>
                </div>
              )}
          </div>
        </Card>
      </div>
    </div>
  )
}
