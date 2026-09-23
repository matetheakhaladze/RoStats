import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Download, Printer } from 'lucide-react'
import { Logo } from '../components/Layout'
import { Spinner } from '../components/data'
import { ReportView, reportCsv, downloadText } from '../components/ReportView'
import { ThemeToggle } from '../lib/theme'
import { api, type Report } from '../lib/api'

export default function PublicReport() {
  const { token = '' } = useParams()
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { api.publicReport(token).then(setReport).catch((e) => setError(e.message)) }, [token])

  return (
    <div className="min-h-full bg-bg">
      <header className="no-print border-b border-line bg-panel">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <Link to="/"><Logo size={24} /></Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button className="btn" disabled={!report} onClick={() => window.print()}><Printer size={14} />PDF</button>
            <button className="btn" disabled={!report} onClick={() => report && downloadText('rostats_report.csv', reportCsv(report))}><Download size={14} />CSV</button>
          </div>
        </div>
      </header>
      <main className="print-main mx-auto max-w-6xl px-5 py-8">
        {error && <div className="card p-6 text-sm text-bad">{error}</div>}
        {!report && !error && <Spinner label="Loading report" />}
        {report && (
          <>
            <ReportView report={report} />
            {report.expires && <p className="no-print mt-4 text-xs text-muted">This shared link works until {new Date(report.expires * 1000).toLocaleDateString()}.</p>}
          </>
        )}
      </main>
    </div>
  )
}
