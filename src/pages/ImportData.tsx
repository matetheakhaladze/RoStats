import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Upload, Trash2, FileText, Download, RefreshCw, Plug, Unplug } from 'lucide-react'
import { PageHeader, Card, Badge } from '../components/ui'
import { DatasetChart, Spinner } from '../components/data'
import { api, type Dataset, type SyncStatus } from '../lib/api'
import { parseCsv } from '../lib/data'
import { useAuth } from '../lib/auth'

function downloadCsv(d: Dataset) {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const text = [d.columns, ...d.rows].map((r) => r.map(esc).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }))
  a.download = `${d.name}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

function ago(iso?: string | null) {
  if (!iso) return 'never'
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`
}

function RobloxSync({ gameId, owner, onChange }: { gameId: string; owner: boolean; onChange: () => void }) {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState<'' | 'connect' | 'sync' | 'off'>('')
  const [err, setErr] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [steps, setSteps] = useState(false)

  useEffect(() => { setStatus(null); api.syncStatus(gameId).then(setStatus).catch(() => setStatus({ connected: false })) }, [gameId])

  const act = async (kind: 'connect' | 'sync' | 'off') => {
    setBusy(kind); setErr(null); setNote(null)
    try {
      if (kind === 'off') { await api.syncDisconnect(gameId); setStatus({ connected: false }) }
      else {
        const r = kind === 'connect' ? await api.syncConnect(gameId, key) : await api.syncRun(gameId)
        setStatus(r); setKey('')
        setNote(`Synced ${r.datasets?.length ?? 0} charts from Roblox${r.skipped?.length ? `. ${r.skipped.length} metrics were not available yet.` : '.'}`)
      }
      onChange()
    } catch (e) { setErr((e as Error).message) } finally { setBusy('') }
  }

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${status?.connected ? 'bg-accent text-on-accent' : 'bg-panel-2 text-muted'}`}><RefreshCw size={18} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-semibold tracking-tight">Auto sync from Roblox</h2>
            {status?.connected ? <Badge tone="good">Connected</Badge> : <Badge tone="accent">Recommended</Badge>}
          </div>
          <p className="mt-0.5 text-[13px] text-muted">
            {status?.connected
              ? `Last synced ${ago(status.last_sync)}. RoStats pulls new numbers every ${status.every_hours ?? 6} hours. Roblox's own data runs a few hours behind.`
              : 'Connect once and your retention, players and revenue update on their own. No more CSV exports.'}
          </p>
        </div>
        {status?.connected && owner && (
          <div className="flex gap-2">
            <button className="btn" onClick={() => act('sync')} disabled={!!busy}><RefreshCw size={14} className={busy === 'sync' ? 'animate-spin' : ''} />Sync now</button>
            <button className="btn text-bad" onClick={() => act('off')} disabled={!!busy}><Unplug size={14} />Disconnect</button>
          </div>
        )}
      </div>

      {status && !status.connected && owner && (
        <div className="mt-4 space-y-3">
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (key.trim()) act('connect') }}>
            <input className="input font-mono text-xs" type="password" autoComplete="off" placeholder="Paste your Open Cloud API key" value={key} onChange={(e) => setKey(e.target.value)} />
            <button className="btn btn-primary shrink-0 justify-center" disabled={!key.trim() || !!busy}>{busy === 'connect' ? <RefreshCw size={14} className="animate-spin" /> : <Plug size={14} />}{busy === 'connect' ? 'Connecting, about 20 s' : 'Connect'}</button>
          </form>
          <button className="text-[13px] font-semibold text-accent-text hover:underline" onClick={() => setSteps((v) => !v)}>{steps ? 'Hide steps' : 'How to get the key (1 minute)'}</button>
          {steps && (
            <ol className="list-decimal space-y-1.5 rounded-xl border border-line bg-bg p-4 pl-8 text-[13px] text-muted">
              <li>Open <a className="font-semibold text-accent-text hover:underline" href="https://create.roblox.com/dashboard/credentials?activeTab=ApiKeysTab" target="_blank" rel="noreferrer">Creator Dashboard, API Keys</a> and click Create API Key.</li>
              <li>Name it RoStats. Under Access Permissions pick <span className="font-semibold text-text">universe-analytics</span>, add this experience, and tick <span className="font-mono text-text">universe.analytics:read</span>. Nothing else.</li>
              <li>Under Security, add <span className="font-mono text-text">0.0.0.0/0</span> to Accepted IP Addresses so our server can use it.</li>
              <li>Save, copy the key and paste it above. It only lets RoStats read analytics. It can't change your game or touch Robux.</li>
            </ol>
          )}
        </div>
      )}
      {status && !status.connected && !owner && <p className="mt-3 text-[13px] text-muted">Only the person who added this game can connect it.</p>}
      {status?.connected && status.last_error && <p className="mt-3 text-xs text-warn">Last sync note: {status.last_error}</p>}
      {note && <p className="mt-3 text-sm text-good">{note}</p>}
      {err && <p className="mt-3 text-sm text-bad">{err}</p>}
    </div>
  )
}

export default function ImportData() {
  const { me, gameId } = useAuth()
  const [list, setList] = useState<Dataset[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const game = me?.games.find((g) => g.universe_id === gameId)

  const load = () => { if (gameId) api.datasets(gameId).then((r) => setList(r.data)).catch((e) => setMsg({ tone: 'bad', text: e.message })) }
  useEffect(() => { setList(null); load() }, [gameId]) // eslint-disable-line react-hooks/exhaustive-deps

  const upload = async (files: FileList | null) => {
    if (!files?.length || !gameId) return
    setBusy(true); setMsg(null)
    const done: string[] = []
    try {
      for (const f of Array.from(files)) {
        const parsed = parseCsv(await f.text())
        const r = await api.addDataset({ name: f.name.replace(/\.(csv|tsv|txt)$/i, ''), universe_id: gameId, ...parsed })
        done.push(r.trimmed ? `${f.name} (Free plan keeps the last 7 days)` : f.name)
      }
      setMsg({ tone: 'good', text: `Imported ${done.join(', ')}` })
      load()
    } catch (e) {
      setMsg({ tone: 'bad', text: (e as Error).message })
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  const remove = async (id: number) => {
    await api.deleteDataset(id).catch((e) => setMsg({ tone: 'bad', text: e.message }))
    load()
  }

  if (!gameId) {
    return (
      <div>
        <PageHeader title="Import data" />
        <Card><p className="text-sm">Add a game in <Link to="/app/settings" className="text-accent">Settings</Link> first.</p></Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Import data" subtitle={`Roblox analytics for ${game?.name ?? 'your game'}`} />

      <div className="mb-4"><RobloxSync gameId={gameId} owner={!game?.shared_by} onChange={load} /></div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Or upload CSV files" subtitle="Works for any chart, including ones the sync does not cover" className="lg:col-span-2">
          <input ref={input} type="file" accept=".csv,.tsv,.txt,text/csv" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
          <button
            className="w-full rounded-lg border border-dashed border-line p-10 text-center hover:bg-panel-2 transition-colors"
            onClick={() => input.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files) }}
            disabled={busy}
          >
            <Upload size={22} className="mx-auto text-muted" />
            <div className="mt-2 text-sm">{busy ? 'Importing...' : 'Drop CSV files here or click to choose'}</div>
            <div className="text-xs text-muted mt-1">The first column should be the date. Every other column becomes a chart line.</div>
          </button>
          {msg && <p className={`mt-3 text-sm ${msg.tone === 'good' ? 'text-good' : 'text-bad'}`}>{msg.text}</p>}
          {me?.plan === 'free' && <p className="mt-2 text-xs text-muted">Free plan keeps the last 7 days of each file. Pro keeps everything.</p>}
        </Card>

        <Card title="How to export">
          <ol className="space-y-2 text-sm text-muted list-decimal pl-4">
            <li>Open <a className="text-accent" href="https://create.roblox.com/dashboard/creations" target="_blank" rel="noreferrer">Creator Dashboard</a> and pick your experience.</li>
            <li>Go to Analytics and open a chart (Retention, Engagement, Monetization, Acquisition).</li>
            <li>Use the chart's download or export option to save it as CSV.</li>
            <li>Upload the file here. Name tells RoStats where to show it: files about revenue go to Monetization, retention and players go to Players.</li>
          </ol>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Your files" right={list && <Badge tone="neutral">{list.length}</Badge>}>
          {!list && <Spinner />}
          {list && !list.length && <p className="text-sm text-muted">No files yet.</p>}
          <div className="space-y-2">
            {list?.map((d) => (
              <div key={d.id} className="rounded-lg border border-line bg-bg">
                <div className="flex items-center gap-3 p-3">
                  {d.source === 'roblox' ? <RefreshCw size={16} className="shrink-0 text-accent-text" /> : <FileText size={16} className="shrink-0 text-muted" />}
                  <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(open === d.id ? null : d.id)}>
                    <div className="text-sm font-medium truncate">{d.name}</div>
                    <div className="text-xs text-muted">{d.source === 'roblox' ? 'Synced from Roblox' : 'Uploaded'} · {d.rows.length} rows · {new Date(d.uploaded_at).toLocaleString()}</div>
                  </button>
                  <button className="btn px-2 py-1" title="Download CSV" onClick={() => downloadCsv(d)}><Download size={12} /></button>
                  {d.mine !== false && d.source !== 'roblox'
                    ? <button className="btn px-2 py-1 text-bad" title="Delete" onClick={() => remove(d.id)}><Trash2 size={12} /></button>
                    : d.mine === false ? <span className="text-xs text-muted">from {d.owner}</span> : null}
                </div>
                {open === d.id && <div className="border-t border-line p-3"><DatasetChart d={d} height={220} /></div>}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
