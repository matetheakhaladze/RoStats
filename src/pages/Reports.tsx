import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, FileText, Link2, Printer, Check } from 'lucide-react'
import { PageHeader, Card, Segmented } from '../components/ui'
import { EmptyState, Spinner } from '../components/data'
import { ReportView, reportCsv, downloadText } from '../components/ReportView'

const SHORT = [{ days: 1, label: '1D' }, { days: 7, label: '7D' }, { days: 30, label: '30D' }, { days: 90, label: '90D' }, { days: 0, label: 'All' }]
import { api, type Report } from '../lib/api'
import { useAuth } from '../lib/auth'

export default function Reports() {
  const { me, gameId } = useAuth()
  const [days, setDays] = useState(30)
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    if (!gameId) return
    let alive = true
    setReport(null); setError(null); setLink(null)
    api.report(gameId, days).then((r) => alive && setReport(r)).catch((e) => alive && setError(e.message))
    return () => { alive = false }
  }, [gameId, days])

  if (!me?.games.length || !gameId) {
    return (
      <div>
        <PageHeader title="Reports" />
        <EmptyState icon={<FileText size={24} />} title="Add a game first" text="Reports are made per game." action={<Link to="/app/settings" className="btn btn-primary">Add a game</Link>} />
      </div>
    )
  }

  const share = async () => {
    setSharing(true)
    try {
      const r = await api.shareReport(gameId, days)
      const url = `${location.origin}${location.pathname}#/r/${r.token}`
      setLink(url)
      await navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {})
    } catch (e) {
      setError((e as Error).message)
    } finally { setSharing(false) }
  }

  const fileName = (report?.game.name ?? 'game').replace(/[^\w-]+/g, '_').slice(0, 40)

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Share your game's numbers"
        actions={<>
          <Segmented options={SHORT.map((p) => p.label)} value={SHORT.find((p) => p.days === days)!.label} onChange={(l) => setDays(SHORT.find((p) => p.label === l)!.days)} />
          <button className="btn" disabled={!report} onClick={() => window.print()} title="Opens the print window. Pick Save as PDF as the printer."><Printer size={14} />PDF</button>
          <button className="btn" disabled={!report} onClick={() => report && downloadText(`${fileName}_report.csv`, reportCsv(report))}><Download size={14} />CSV</button>
          <button className="btn btn-primary" disabled={!report || sharing} onClick={share}>{copied ? <Check size={14} /> : <Link2 size={14} />}{copied ? 'Copied' : 'Share link'}</button>
        </>}
      />
      {link && (
        <div className="no-print card mb-6 flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
          <span className="shrink-0 text-[13px] text-muted">Anyone with this link can view the report for 14 days:</span>
          <input className="input font-mono text-xs" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
        </div>
      )}

      {error && <Card><p className="text-sm text-bad">{error}</p></Card>}
      {!report && !error && <Spinner label="Building report" />}
      {report && <ReportView report={report} />}
    </div>
  )
}
