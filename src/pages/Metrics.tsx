import { Link } from 'react-router-dom'
import { Gamepad2 } from 'lucide-react'
import { PageHeader, Card } from '../components/ui'
import { DatasetChart, EmptyState, InsightsCard, Spinner, UploadPrompt } from '../components/data'
import { MONEY_WORDS, PLAYER_WORDS, matches } from '../lib/data'
import { useAuth } from '../lib/auth'
import { KpiRow, useGameData } from './Overview'

const PAGES = {
  players: {
    title: 'Players',
    subtitle: 'Retention, engagement and audience from your Creator Dashboard exports',
    words: PLAYER_WORDS,
    what: 'player (retention, engagement, acquisition)',
    tip: 'In Creator Dashboard open your experience, then Analytics. Export Retention, Engagement and Acquisition as CSV.',
  },
  monetization: {
    title: 'Monetization',
    subtitle: 'Revenue and paying users from your Creator Dashboard exports',
    words: MONEY_WORDS,
    what: 'monetization (revenue, payers)',
    tip: 'In Creator Dashboard open your experience, then Analytics, then Monetization. Export Revenue and Paying users as CSV.',
  },
} as const

export default function Metrics({ kind }: { kind: keyof typeof PAGES }) {
  const cfg = PAGES[kind]
  const { me, gameId } = useAuth()
  const { datasets, error } = useGameData()
  const mine = datasets?.filter((d) => matches(d, cfg.words)) ?? null

  if (!me?.games.length || !gameId) {
    return (
      <div>
        <PageHeader title={cfg.title} />
        <EmptyState icon={<Gamepad2 size={24} />} title="Add a game first" text="Add your game in Settings, then upload its Creator Dashboard exports." action={<Link to="/app/settings" className="btn btn-primary">Add a game</Link>} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={cfg.title} subtitle={cfg.subtitle} actions={<Link to="/app/data" className="btn">Import data</Link>} />
      {error && <p className="text-sm text-bad">{error}</p>}
      {mine == null && !error && <Spinner />}
      {mine && !mine.length && (
        <>
          <UploadPrompt what={cfg.what} />
          <p className="mt-3 text-center text-xs text-muted">{cfg.tip}</p>
        </>
      )}
      {mine && mine.length > 0 && (
        <>
          <KpiRow datasets={mine} />
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {mine.map((d) => (
                <Card key={d.id} title={d.name} subtitle={`${d.rows.length} rows · uploaded ${new Date(d.uploaded_at).toLocaleDateString()}`}>
                  <DatasetChart d={d} />
                </Card>
              ))}
            </div>
            <div><InsightsCard focus={kind} datasetIds={mine.map((d) => d.id)} /></div>
          </div>
        </>
      )}
    </div>
  )
}
