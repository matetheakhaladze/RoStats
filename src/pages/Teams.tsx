import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Copy, Crown, ExternalLink, LogOut, Plus, RefreshCw, Trash2, Users, X } from 'lucide-react'
import { PageHeader, Card, Badge } from '../components/ui'
import { EmptyState, Spinner } from '../components/data'
import { api, type Team } from '../lib/api'
import { useAuth } from '../lib/auth'

export function inviteUrl(code: string) {
  return `${location.origin}${location.pathname}#/join/${code}`
}

function TeamCard({ team, reload }: { team: Team; reload: () => void }) {
  const { me, refresh } = useAuth()
  const [copied, setCopied] = useState(false)
  const [pick, setPick] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)
  if (!me) return null
  const owner = team.owner_id === me.id
  const myGames = me.games.filter((g) => !g.shared_by && !team.games.some((t) => t.universe_id === g.universe_id))

  const run = async (fn: () => Promise<unknown>) => {
    setErr(null)
    try { await fn(); reload(); refresh() } catch (e) { setErr((e as Error).message) }
  }
  const copy = () => {
    navigator.clipboard.writeText(inviteUrl(team.invite_code)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {})
  }

  return (
    <Card
      title={team.name}
      subtitle={`${team.members.length} member${team.members.length === 1 ? '' : 's'} · ${team.games.length} shared game${team.games.length === 1 ? '' : 's'}`}
      right={<Link to={`/app/tasks?team=${team.id}`} className="btn text-xs">Open task board</Link>}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Members</div>
          <div className="space-y-2">
            {team.members.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                {m.picture ? <img src={m.picture} alt="" className="h-7 w-7 rounded-full bg-panel-2" /> : <div className="h-7 w-7 rounded-full bg-panel-2" />}
                <span className="min-w-0 flex-1 truncate text-sm">{m.display_name || m.name} <span className="text-muted">@{m.name}</span></span>
                {m.role === 'owner' && <Crown size={13} className="text-warn" />}
                {owner && m.id !== me.id && (
                  <button className="text-muted hover:text-bad" title="Remove from team" onClick={() => run(() => api.removeMember(team.id, m.id))}><X size={14} /></button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Shared games</div>
          <div className="space-y-2">
            {!team.games.length && <p className="text-sm text-muted">No games shared yet.</p>}
            {team.games.map((g) => (
              <div key={g.universe_id} className="flex items-center gap-2 rounded-lg border border-line bg-bg px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm">{g.name}<span className="block text-xs text-muted">shared by {g.added_by_name}</span></span>
                {g.place_id && <a className="text-muted hover:text-text" href={`https://www.roblox.com/games/${g.place_id}`} target="_blank" rel="noreferrer"><ExternalLink size={13} /></a>}
                {(owner || g.added_by === me.id) && (
                  <button className="text-muted hover:text-bad" title="Stop sharing" onClick={() => run(() => api.unshareGame(team.id, g.universe_id))}><X size={14} /></button>
                )}
              </div>
            ))}
            {myGames.length > 0 && (
              <div className="flex gap-2 pt-1">
                <select className="input" value={pick} onChange={(e) => setPick(e.target.value)}>
                  <option value="">Share one of your games...</option>
                  {myGames.map((g) => <option key={g.universe_id} value={g.universe_id}>{g.name}</option>)}
                </select>
                <button className="btn shrink-0" disabled={!pick} onClick={() => run(async () => { await api.shareGame(team.id, pick); setPick('') })}><Plus size={14} />Share</button>
              </div>
            )}
            <p className="text-xs text-muted">Everyone in the team sees the shared game's dashboards, uploaded data and reports.</p>
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Invite link</div>
          <div className="flex gap-2">
            <input className="input font-mono text-xs" readOnly value={inviteUrl(team.invite_code)} onFocus={(e) => e.currentTarget.select()} />
            <button className="btn shrink-0 px-2" onClick={copy} title="Copy">{copied ? <Check size={14} /> : <Copy size={14} />}</button>
          </div>
          <p className="mt-2 text-xs text-muted">Send this to teammates. They sign in with Roblox and join.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {owner && <button className="btn text-xs" onClick={() => run(() => api.resetInvite(team.id))}><RefreshCw size={12} />New link</button>}
            {!owner && <button className="btn text-xs text-bad" onClick={() => run(() => api.removeMember(team.id, me.id))}><LogOut size={12} />Leave team</button>}
            {owner && !confirm && <button className="btn text-xs text-bad" onClick={() => setConfirm(true)}><Trash2 size={12} />Delete team</button>}
            {owner && confirm && (
              <span className="flex items-center gap-2 text-xs">
                Delete team and its task board?
                <button className="btn px-2 py-1 text-xs text-bad" onClick={() => run(() => api.deleteTeam(team.id))}>Delete</button>
                <button className="btn px-2 py-1 text-xs" onClick={() => setConfirm(false)}>Cancel</button>
              </span>
            )}
          </div>
        </div>
      </div>
      {err && <p className="mt-3 text-sm text-bad">{err}</p>}
    </Card>
  )
}

export default function Teams() {
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const { refresh } = useAuth()

  const load = () => { api.teams().then((r) => setTeams(r.data)).catch((e) => setErr(e.message)) }
  useEffect(load, [])

  const create = async () => {
    setErr(null)
    try { await api.createTeam(name.trim()); setName(''); load() } catch (e) { setErr((e as Error).message) }
  }
  const join = async () => {
    setErr(null)
    const c = code.trim().split('/join/').pop() || ''
    try { await api.joinTeam(c); setCode(''); load(); refresh() } catch (e) { setErr((e as Error).message) }
  }

  return (
    <div>
      <PageHeader title="Teams" subtitle="Share games, data and a task board with your studio" />
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card title="Create a team">
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) create() }}>
            <input className="input" placeholder="Studio name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
            <button className="btn btn-primary shrink-0" disabled={!name.trim()}><Plus size={14} />Create</button>
          </form>
        </Card>
        <Card title="Join a team">
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (code.trim()) join() }}>
            <input className="input" placeholder="Paste an invite link" value={code} onChange={(e) => setCode(e.target.value)} />
            <button className="btn shrink-0" disabled={!code.trim()}>Join</button>
          </form>
        </Card>
      </div>
      {err && <p className="mb-4 text-sm text-bad">{err}</p>}
      {!teams && !err && <Spinner label="Loading teams" />}
      {teams && !teams.length && (
        <EmptyState icon={<Users size={24} />} title="No teams yet" text="Create a team for your studio, share your game with it and invite your teammates. Everyone gets the same dashboards, reports and task board." />
      )}
      <div className="space-y-4">
        {teams?.map((t) => <TeamCard key={t.id} team={t} reload={load} />)}
      </div>
      {teams && teams.length > 0 && <p className="mt-4 text-xs text-muted"><Badge>Tip</Badge> Shared games show up in the game picker at the top for every member.</p>}
    </div>
  )
}
