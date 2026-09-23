import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Calendar, Gamepad2, AlignLeft, Plus, Trash2, X } from 'lucide-react'
import { PageHeader } from '../components/ui'
import { Spinner } from '../components/data'
import { api, type Task, type TaskStatus, type Team, type TeamMember } from '../lib/api'
import { useAuth } from '../lib/auth'

const COLUMNS: { key: TaskStatus; label: string; dot: string }[] = [
  { key: 'todo', label: 'To do', dot: 'bg-muted' },
  { key: 'doing', label: 'In progress', dot: 'bg-accent' },
  { key: 'review', label: 'Review', dot: 'bg-warn' },
  { key: 'done', label: 'Done', dot: 'bg-good' },
]

function Avatar({ m, size = 'h-6 w-6' }: { m?: TeamMember; size?: string }) {
  if (!m) return null
  return m.picture
    ? <img src={m.picture} alt={m.name} title={m.display_name || m.name} className={`${size} rounded-full bg-panel-2`} />
    : <div title={m.name} className={`${size} rounded-full bg-accent text-[10px] font-semibold text-white flex items-center justify-center`}>{m.name.slice(0, 2).toUpperCase()}</div>
}

function dueTone(due: string | null, done: boolean) {
  if (!due || done) return 'text-muted'
  const d = new Date(due + 'T23:59:59')
  const diff = (d.getTime() - Date.now()) / 86400000
  return diff < 0 ? 'text-bad' : diff < 2 ? 'text-warn' : 'text-muted'
}

function TaskModal({ task, members, games, onClose, onSave, onDelete }: {
  task: Task
  members: TeamMember[]
  games: { universe_id: string; name: string }[]
  onClose: () => void
  onSave: (patch: Partial<Task> & { clear?: string[] }) => void
  onDelete: () => void
}) {
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes)
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [assignee, setAssignee] = useState(task.assignee_id ?? '')
  const [due, setDue] = useState(task.due ?? '')
  const [game, setGame] = useState(task.universe_id ?? '')
  const [confirm, setConfirm] = useState(false)

  const save = () => {
    const clear: string[] = []
    const patch: Partial<Task> & { clear?: string[] } = { title: title.trim() || task.title, notes, status }
    if (assignee) patch.assignee_id = assignee; else clear.push('assignee_id')
    if (due) patch.due = due; else clear.push('due')
    if (game) patch.universe_id = game; else clear.push('universe_id')
    patch.clear = clear
    onSave(patch)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-16" onClick={onClose}>
      <div className="card w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-2">
          <input className="input text-base font-semibold" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          <button className="btn px-2" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted">Column
            <select className="input mt-1" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </label>
          <label className="text-xs text-muted">Assigned to
            <select className="input mt-1" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="">Nobody</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.display_name || m.name}</option>)}
            </select>
          </label>
          <label className="text-xs text-muted">Due date
            <input type="date" className="input mt-1" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
          <label className="text-xs text-muted">Game
            <select className="input mt-1" value={game} onChange={(e) => setGame(e.target.value)}>
              <option value="">None</option>
              {games.map((g) => <option key={g.universe_id} value={g.universe_id}>{g.name}</option>)}
            </select>
          </label>
        </div>
        <label className="mt-3 block text-xs text-muted">Notes
          <textarea className="input mt-1 h-32 resize-y text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Details, links, checklist..." maxLength={5000} />
        </label>
        <div className="mt-4 flex items-center gap-2">
          {!confirm
            ? <button className="btn text-bad" onClick={() => setConfirm(true)}><Trash2 size={14} />Delete</button>
            : <><button className="btn text-bad" onClick={onDelete}>Yes, delete</button><button className="btn" onClick={() => setConfirm(false)}>Keep</button></>}
          <button className="btn btn-primary ml-auto" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  )
}

export default function Tasks() {
  const { me } = useAuth()
  const [params, setParams] = useSearchParams()
  const board = params.get('team') || ''
  const [teams, setTeams] = useState<Team[]>([])
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<Task | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)

  useEffect(() => { api.teams().then((r) => setTeams(r.data)).catch(() => {}) }, [])
  useEffect(() => {
    setTasks(null); setError(null)
    api.tasks(board || null).then((r) => setTasks(r.data)).catch((e) => setError(e.message))
  }, [board])

  const team = teams.find((t) => t.id === board)
  const members: TeamMember[] = useMemo(() => {
    if (team) return team.members
    return me ? [{ id: me.id, name: me.name, display_name: me.display_name, picture: me.picture, role: 'owner' }] : []
  }, [team, me])
  const memberById = (id: string | null) => members.find((m) => m.id === id)
  const games = me?.games ?? []

  if (!me) return null

  const byCol = (k: TaskStatus) => (tasks ?? []).filter((t) => t.status === k).sort((a, b) => a.position - b.position)

  const patchLocal = (id: string, p: Partial<Task>) => setTasks((ts) => ts?.map((t) => (t.id === id ? { ...t, ...p } : t)) ?? ts)

  const update = async (id: string, p: Partial<Task> & { clear?: string[] }) => {
    const { clear, ...rest } = p
    patchLocal(id, { ...rest, ...Object.fromEntries((clear ?? []).map((c) => [c, null])) })
    try {
      const saved = await api.updateTask(id, p)
      patchLocal(id, saved)
    } catch (e) { setError((e as Error).message) }
  }

  const add = async (status: TaskStatus) => {
    const title = (adding[status] || '').trim()
    if (!title) return
    setAdding((a) => ({ ...a, [status]: '' }))
    try {
      const t = await api.createTask({ title, status, team_id: board || null })
      setTasks((ts) => [...(ts ?? []), t])
    } catch (e) { setError((e as Error).message) }
  }

  const drop = (status: TaskStatus, beforeId: string | null) => (e: DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    setOver(null)
    const id = dragId ?? e.dataTransfer.getData('text/plain')
    if (!id) return
    const col = byCol(status).filter((t) => t.id !== id)
    let position: number
    if (beforeId) {
      const i = col.findIndex((t) => t.id === beforeId)
      const prev = col[i - 1]?.position ?? (col[i].position - 2)
      position = (prev + col[i].position) / 2
    } else {
      position = (col[col.length - 1]?.position ?? 0) + 1
    }
    setDragId(null)
    update(id, { status, position })
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Tasks"
        subtitle={team ? `Shared board for ${team.name}` : 'Your personal board. Team boards are shared with everyone in the team.'}
        actions={
          <select className="input w-56" value={board} onChange={(e) => setParams(e.target.value ? { team: e.target.value } : {})}>
            <option value="">Personal board</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        }
      />
      {error && <p className="mb-3 text-sm text-bad">{error}</p>}
      {!tasks && !error && <Spinner label="Loading board" />}
      {tasks && (
        <div className="grid min-h-0 flex-1 gap-4 overflow-x-auto pb-2 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((c) => {
            const list = byCol(c.key)
            return (
              <div
                key={c.key}
                className={`flex min-h-[320px] flex-col rounded-xl border bg-panel p-3 ${over === c.key ? 'border-accent' : 'border-line'}`}
                onDragOver={(e) => { e.preventDefault(); setOver(c.key) }}
                onDragLeave={() => setOver((o) => (o === c.key ? null : o))}
                onDrop={drop(c.key, null)}
              >
                <div className="mb-3 flex items-center gap-2 px-1">
                  <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                  <span className="text-sm font-medium">{c.label}</span>
                  <span className="text-xs text-muted">{list.length}</span>
                </div>
                <div className="flex-1 space-y-2">
                  {list.map((t) => {
                    const m = memberById(t.assignee_id)
                    const g = games.find((x) => x.universe_id === t.universe_id)
                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => { setDragId(t.id); e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move' }}
                        onDragEnd={() => { setDragId(null); setOver(null) }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={drop(c.key, t.id)}
                        onClick={() => setOpen(t)}
                        className={`cursor-pointer rounded-lg border border-line bg-bg p-3 text-sm hover:border-accent ${dragId === t.id ? 'opacity-40' : ''}`}
                      >
                        <div className={`font-medium ${t.status === 'done' ? 'text-muted line-through' : ''}`}>{t.title}</div>
                        {(t.due || g || t.notes || m) && (
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            {t.due && <span className={`inline-flex items-center gap-1 ${dueTone(t.due, t.status === 'done')}`}><Calendar size={11} />{new Date(t.due + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}
                            {g && <span className="inline-flex max-w-[140px] items-center gap-1 truncate text-muted"><Gamepad2 size={11} />{g.name}</span>}
                            {t.notes && <AlignLeft size={11} className="text-muted" />}
                            <span className="ml-auto"><Avatar m={m} size="h-5 w-5" /></span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <form className="mt-2 flex gap-1" onSubmit={(e) => { e.preventDefault(); add(c.key) }}>
                  <input
                    className="input py-1.5 text-xs"
                    placeholder="Add a task"
                    value={adding[c.key] || ''}
                    onChange={(e) => setAdding((a) => ({ ...a, [c.key]: e.target.value }))}
                    maxLength={200}
                  />
                  <button className="btn px-2" disabled={!(adding[c.key] || '').trim()}><Plus size={14} /></button>
                </form>
              </div>
            )
          })}
        </div>
      )}
      {open && (
        <TaskModal
          task={open}
          members={members}
          games={games}
          onClose={() => setOpen(null)}
          onSave={(p) => { update(open.id, p); setOpen(null) }}
          onDelete={async () => {
            const id = open.id
            setOpen(null)
            setTasks((ts) => ts?.filter((t) => t.id !== id) ?? ts)
            await api.deleteTask(id).catch((e) => setError(e.message))
          }}
        />
      )}
    </div>
  )
}
