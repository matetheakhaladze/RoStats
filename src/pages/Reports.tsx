import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, FileText, Link2, Printer, Check } from 'lucide-react'
import { PageHeader, Card, Segmented } from '../components/ui'
import { EmptyState, Spinner } from '../components/data'
import { ReportView, PERIODS, reportCsv, downloadText } from '../components/ReportView'
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
      <div className="no-print">
        <PageHeader
          title="Reports"
          subtitle="Send your game's numbers to your team, investors or an analytics studio"
        />
        <Card className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="overflow-x-auto"><Segmented options={PERIODS.map((p) => p.label)} value={PERIODS.find((p) => p.days === days)!.label} onChange={(l) => setDays(PERIODS.find((p) => p.label === l)!.days)} /></div>
            <div className="ml-auto flex flex-wrap gap-2">
              <button className="btn" disabled={!report} onClick={() => window.print()}><Printer size={14} />Save as PDF</button>
              <button className="btn" disabled={!report} onClick={() => report && downloadText(`${fileName}_report.csv`, reportCsv(report))}><Download size={14} />CSV</button>
              <button className="btn btn-primary" disabled={!report || sharing} onClick={share}>{copied ? <Check size={14} /> : <Link2 size={14} />}{copied ? 'Link copied' : 'Share link'}</button>
            </div>
          </div>
          {link && (
            <div className="mt-3 rounded-lg border border-line bg-bg p-3 text-xs">
              <div className="text-muted">Anyone with this link can view this report for 14 days, without signing in:</div>
              <input className="input mt-2 font-mono" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
            </div>
          )}
          <p className="mt-3 text-xs text-muted">"Save as PDF" opens the print window. Choose "Save as PDF" as the printer.</p>
        </Card>
      </div>

      {error && <Card><p className="text-sm text-bad">{error}</p></Card>}
      {!report && !error && <Spinner label="Building report" />}
      {report && <ReportView report={report} />}
    </div>
  )
}
