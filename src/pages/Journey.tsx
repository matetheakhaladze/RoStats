import { ArrowRight } from 'lucide-react'
import { PageHeader, Card, Stat, Badge } from '../components/ui'
import { journeySteps, journeyPaths } from '../data/mock'

export default function Journey() {
  const max = journeySteps[0].users
  return (
    <div>
      <PageHeader title="User Journey" subtitle="Where new players go, and where they leave" actions={<Badge tone="neutral">New players, last 30 days</Badge>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Tutorial completion" value="73%" change={4.1} />
        <Stat label="Biggest drop-off" value="Reached level 5" hint="40% leave before this" />
        <Stat label="Time to first purchase" value="2d 4h" change={-9} hint="median" />
        <Stat label="Journeys analyzed" value="100,000" />
      </div>

      <div className="mt-4">
        <Card title="Core funnel" subtitle="Share of new players reaching each step">
          <div className="space-y-2">
            {journeySteps.map((s, i) => {
              const pct = (s.users / max) * 100
              return (
                <div key={s.step} className="flex items-center gap-4">
                  <div className="w-36 shrink-0 text-sm">{s.step}</div>
                  <div className="flex-1">
                    <div className="h-9 w-full rounded-md bg-panel-2 overflow-hidden">
                      <div className="flex h-full items-center rounded-md bg-accent px-3 text-xs font-medium text-white" style={{ width: `${Math.max(pct, 6)}%`, opacity: 1 - i * 0.08 }}>
                        {s.users.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className={`w-24 shrink-0 text-right text-xs ${s.drop >= 40 ? 'text-bad' : s.drop >= 25 ? 'text-warn' : 'text-muted'}`}>
                    {i === 0 ? '' : `-${s.drop}% drop`}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Common paths" subtitle="Most frequent sequences after joining" className="lg:col-span-2">
          <div className="space-y-2">
            {journeyPaths.map((p) => (
              <div key={p.path} className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-bg px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-1.5 text-sm">
                  {p.path.split(' > ').map((n, i, arr) => (
                    <span key={i} className="inline-flex items-center gap-1.5">
                      <span className={`rounded-md px-2 py-0.5 text-xs ${n === 'Left game' ? 'bg-[#2e1616] text-bad' : n === 'Shop' ? 'bg-[#0f2a22] text-good' : 'bg-panel-2'}`}>{n}</span>
                      {i < arr.length - 1 && <ArrowRight size={12} className="text-muted" />}
                    </span>
                  ))}
                </div>
                <div className="ml-auto flex gap-4 text-xs">
                  <span className="text-muted">{p.users.toLocaleString()} players</span>
                  <span className={p.conversion >= 9 ? 'text-good' : p.conversion === 0 ? 'text-bad' : 'text-text'}>{p.conversion}% buy</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Suggested fixes" subtitle="Generated from this month's journeys">
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-line bg-bg p-3">
              <Badge tone="bad">High impact</Badge>
              <div className="mt-2">40% of players quit between the tutorial and level 5. Levels 3 and 4 take twice as long as level 2.</div>
            </div>
            <div className="rounded-lg border border-line bg-bg p-3">
              <Badge tone="good">Opportunity</Badge>
              <div className="mt-2">Players who visit the boss arena convert at 11%. Surface it earlier in the lobby.</div>
            </div>
            <div className="rounded-lg border border-line bg-bg p-3">
              <Badge tone="warn">Watch</Badge>
              <div className="mt-2">Daily reward players rarely reach the shop. Consider a shop shortcut on the reward screen.</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
