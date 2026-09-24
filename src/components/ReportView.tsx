import { Card, Stat } from './ui'
import { DatasetChart } from './data'
import { KpiRow } from '../pages/Overview'
import { fmt, type Dataset, type Report } from '../lib/api'
import { isTimeSeries, matches, MONEY_WORDS, PLAYER_WORDS } from '../lib/data'

export const PERIODS = [
  { days: 1, label: 'Last day' },
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
  { days: 0, label: 'All uploaded data' },
]

export function periodLabel(days: number) {
  return PERIODS.find((p) => p.days === days)?.label ?? `Last ${days} days`
}

function DataTable({ d }: { d: Dataset }) {
  const rows = d.rows.slice(-31)
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="table w-full">
        <thead><tr>{d.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{r.map((v, j) => <td key={j} className={j ? 'text-right' : ''}>{typeof v === 'number' ? fmt(v) : v ?? '-'}</td>)}</tr>
          ))}
        </tbody>
      </table>
      {d.rows.length > rows.length && <p className="mt-2 text-xs text-muted">Showing the last {rows.length} of {d.rows.length} rows. The CSV download has all of them.</p>}
    </div>
  )
}

function Section({ title, sets, tables }: { title: string; sets: Dataset[]; tables: boolean }) {
  if (!sets.length) return null
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {sets.map((d) => (
        <Card key={d.id} title={d.name} subtitle={`${d.rows.length} rows`}>
          <div className="print-avoid"><DatasetChart d={d} height={220} /></div>
          {tables && isTimeSeries(d) && <DataTable d={d} />}
        </Card>
      ))}
    </section>
  )
}

export function ReportView({ report, tables = true }: { report: Report; tables?: boolean }) {
  const g = report.game
  const players = report.datasets.filter((d) => matches(d, PLAYER_WORDS) && !matches(d, MONEY_WORDS))
  const money = report.datasets.filter((d) => matches(d, MONEY_WORDS))
  const other = report.datasets.filter((d) => !players.includes(d) && !money.includes(d))

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-4">
        {g.icon ? <img src={g.icon} alt="" className="h-16 w-16 rounded-xl bg-panel-2" /> : <div className="h-16 w-16 rounded-xl bg-panel-2" />}
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider text-muted">Game report</div>
          <h1 className="text-2xl font-semibold">{g.name}</h1>
          <div className="text-sm text-muted">
            {periodLabel(report.days)} · generated {new Date(report.generated_at).toLocaleString()}
            {g.creator ? ` · by ${g.creator}` : ''}
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Live on Roblox</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Playing now" value={fmt(g.playing)} />
          <Stat label="Total visits" value={fmt(g.visits)} />
          <Stat label="Favorites" value={fmt(g.favorites)} />
          <Stat label="Like ratio" value={g.rating != null ? `${g.rating}%` : '-'} />
        </div>
      </section>

      {report.datasets.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Key numbers, {periodLabel(report.days).toLowerCase()}</h2>
          <KpiRow datasets={report.datasets} />
        </section>
      ) : (
        <Card><p className="text-sm text-muted">No Creator Dashboard data was uploaded for this period, so this report only has live Roblox stats and benchmarks.</p></Card>
      )}

      <Section title="Players" sets={players} tables={tables} />
      <Section title="Monetization" sets={money} tables={tables} />
      <Section title="Other data" sets={other} tables={tables} />

      {report.benchmarks.length > 0 && (
        <section className="space-y-4 print-avoid">
          <h2 className="text-lg font-semibold">Benchmarks</h2>
          <Card subtitle={`Compared with ${report.benchmark_pool} games on the Roblox home page charts right now`}>
            <table className="table w-full">
              <thead><tr><th>Metric</th><th className="text-right">This game</th><th className="text-right">Chart median</th><th className="w-1/3">Percentile</th></tr></thead>
              <tbody>
                {report.benchmarks.map((b) => (
                  <tr key={b.key}>
                    <td className="font-medium">{b.label}</td>
                    <td className="text-right">{b.value != null ? `${fmt(b.value)}${b.unit === '%' ? '%' : ''}` : '-'}</td>
                    <td className="text-right text-muted">{b.median != null ? `${fmt(b.median)}${b.unit === '%' ? '%' : ''}` : '-'}</td>
                    <td>
                      {b.percentile != null ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel-2">
                            <div className={`h-full rounded-full ${b.percentile >= 50 ? 'bg-good' : 'bg-warn'}`} style={{ width: `${b.percentile}%` }} />
                          </div>
                          <span className="w-10 text-right text-xs text-muted">{b.percentile}th</span>
                        </div>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted">Percentile means the share of chart games this game beats or matches. Chart games are the most popular on Roblox, so 30th and above is already strong.</p>
          </Card>
        </section>
      )}

      <p className="text-xs text-muted">Made with RoStats. Live stats come from Roblox. Charts come from Creator Dashboard exports uploaded by the game team.</p>
    </div>
  )
}

export function reportCsv(report: Report) {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines: string[] = []
  const g = report.game
  lines.push(`RoStats report,${esc(g.name)}`, `Period,${esc(periodLabel(report.days))}`, `Generated,${esc(report.generated_at)}`, '')
  lines.push('Live stats', 'Playing now,Total visits,Favorites,Like ratio %', [g.playing, g.visits, g.favorites, g.rating ?? ''].join(','), '')
  for (const d of report.datasets) {
    lines.push(esc(d.name), d.columns.map(esc).join(','))
    for (const r of d.rows) lines.push(r.map(esc).join(','))
    lines.push('')
  }
  if (report.benchmarks.length) {
    lines.push('Benchmarks', 'Metric,This game,Chart median,Percentile')
    for (const b of report.benchmarks) lines.push([esc(b.label), b.value ?? '', b.median ?? '', b.percentile ?? ''].join(','))
  }
  return lines.join('\n')
}

export function downloadText(name: string, text: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
