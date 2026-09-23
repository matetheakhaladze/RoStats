import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Upload, Trash2, FileText, Download } from 'lucide-react'
import { PageHeader, Card, Badge } from '../components/ui'
import { DatasetChart, Spinner } from '../components/data'
import { api, type Dataset } from '../lib/api'
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
      <PageHeader title="Import data" subtitle={`Creator Dashboard exports for ${game?.name ?? 'your game'}`} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Upload CSV files" className="lg:col-span-2">
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
                  <FileText size={16} className="text-muted shrink-0" />
                  <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(open === d.id ? null : d.id)}>
                    <div className="text-sm font-medium truncate">{d.name}</div>
                    <div className="text-xs text-muted">{d.rows.length} rows · {d.columns.length} columns · {new Date(d.uploaded_at).toLocaleString()}</div>
                  </button>
                  <button className="btn px-2 py-1" title="Download CSV" onClick={() => downloadCsv(d)}><Download size={12} /></button>
                  <button className="btn px-2 py-1 text-bad" title="Delete" onClick={() => remove(d.id)}><Trash2 size={12} /></button>
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
