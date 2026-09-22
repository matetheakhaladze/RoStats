import { useState } from 'react'
import { Download, FileText, Plus, Play } from 'lucide-react'
import { PageHeader, Card, Badge, Segmented } from '../components/ui'
import { reports } from '../data/mock'

const metrics = ['Visits', 'Active players', 'Revenue', 'Retention', 'Session length', 'Server health', 'Crash rate', 'Top products', 'Regions', 'Devices']

export default function Reports() {
  const [selected, setSelected] = useState<string[]>(['Visits', 'Revenue', 'Retention'])
  const [format, setFormat] = useState('PDF')
  const [range, setRange] = useState('30 days')

  const toggle = (m: string) => setSelected((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]))

  return (
    <div>
      <PageHeader title="Reports & Export" subtitle="Build custom reports, schedule them, or export raw data" actions={<button className="btn btn-primary"><Plus size={14} />New report</button>} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Report builder" subtitle="Pick metrics, a range and a format" className="lg:col-span-2">
          <div className="space-y-5">
            <div>
              <div className="text-xs text-muted mb-2">Metrics ({selected.length} selected)</div>
              <div className="flex flex-wrap gap-2">
                {metrics.map((m) => (
                  <button key={m} onClick={() => toggle(m)} className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${selected.includes(m) ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:text-text'}`}>{m}</button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><div className="text-xs text-muted mb-1.5">Date range</div><Segmented options={['7 days', '30 days', '90 days']} value={range} onChange={setRange} /></div>
              <div><div className="text-xs text-muted mb-1.5">Format</div><Segmented options={['PDF', 'XLSX', 'CSV']} value={format} onChange={setFormat} /></div>
              <div><div className="text-xs text-muted mb-1.5">Games</div><select className="input"><option>All games</option><option>Tower Escape Simulator</option><option>Blox Kingdom Tycoon</option></select></div>
            </div>
            <div className="rounded-lg border border-line bg-bg p-4">
              <div className="flex items-center gap-2 text-sm"><FileText size={16} className="text-accent" />Preview: {selected.length} sections, {range}, {format}</div>
              <ul className="mt-3 grid gap-1 text-xs text-muted sm:grid-cols-2">
                {selected.map((s, i) => <li key={s}>{i + 1}. {s}</li>)}
              </ul>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary"><Download size={14} />Generate and download</button>
              <button className="btn"><Play size={14} />Schedule</button>
            </div>
          </div>
        </Card>

        <Card title="Raw data export" subtitle="Everything we store, for your own analysis">
          <div className="space-y-2">
            {[
              ['Sessions', '2.1M rows', 'CSV'],
              ['Purchases', '48k rows', 'CSV'],
              ['Server events', '910k rows', 'JSON'],
              ['Chatbot transcripts', '7.8k rows', 'JSON'],
            ].map(([n, r, f]) => (
              <div key={n} className="flex items-center justify-between rounded-lg border border-line bg-bg px-3 py-2.5">
                <div><div className="text-sm">{n}</div><div className="text-xs text-muted">{r}</div></div>
                <button className="btn px-2 py-1 text-xs"><Download size={12} />{f}</button>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">Exports over 100k rows are emailed as a link.</p>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Scheduled reports">
          <table className="table w-full">
            <thead><tr><th>Report</th><th>Schedule</th><th>Format</th><th>Last sent</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.name}>
                  <td className="font-medium">{r.name}</td>
                  <td className="text-muted">{r.schedule}</td>
                  <td><Badge tone="neutral">{r.format}</Badge></td>
                  <td className="text-muted">{r.last}</td>
                  <td><Badge tone={r.status === 'Sent' ? 'good' : 'warn'}>{r.status}</Badge></td>
                  <td className="text-right"><button className="btn px-2 py-1 text-xs">Run now</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}
