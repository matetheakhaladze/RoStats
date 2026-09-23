import { Check, Minus, Coins } from 'lucide-react'
import { PageHeader, Card, Badge, Progress } from '../components/ui'
import { useAuth } from '../lib/auth'

const plans = [
  {
    name: 'Free', price: 0, key: 'free',
    items: [
      { text: '1 game', ok: true },
      { text: 'Last 7 days of uploaded data', ok: true },
      { text: 'Overview, Players, Monetization, Market Trends', ok: true },
      { text: 'Art Generator and Chatbot', ok: false },
      { text: 'AI insights', ok: false },
    ],
  },
  {
    name: 'Pro', price: 29, key: 'pro',
    items: [
      { text: 'Unlimited games', ok: true },
      { text: 'Full data history', ok: true },
      { text: 'Art Generator, Chatbot and AI insights', ok: true },
      { text: '100 image credits every month', ok: true },
      { text: '50 AI messages per day', ok: true },
    ],
  },
]

const packs = [
  { credits: 50, price: 5 },
  { credits: 200, price: 15 },
  { credits: 500, price: 30 },
]

export default function Billing() {
  const { me } = useAuth()
  if (!me) return null
  const c = me.credits
  const pro = me.plan === 'pro'

  return (
    <div>
      <PageHeader title="Subscription" subtitle="Plan and credits" />

      <Card title="Current plan">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-2xl font-semibold">{pro ? 'Pro' : 'Free'}</span>
          <Badge tone={pro ? 'good' : 'neutral'}>Active</Badge>
        </div>
        {pro && (
          <div className="mt-5 grid gap-6 sm:grid-cols-3">
            <div>
              <div className="flex justify-between text-sm mb-1.5"><span>Monthly credits</span><span className="text-muted">{c.monthly_left} of {c.monthly_total} left</span></div>
              <Progress value={(c.monthly_left / Math.max(1, c.monthly_total)) * 100} />
              <div className="text-xs text-muted mt-1.5">Resets on {new Date(c.resets).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5"><span>Purchased credits</span><span className="text-muted">{c.bought}</span></div>
              <Progress value={c.bought ? 100 : 0} tone="good" />
              <div className="text-xs text-muted mt-1.5">Never expire, used after monthly credits</div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5"><span>AI messages today</span><span className="text-muted">{me.chats_today} of {me.chats_per_day}</span></div>
              <Progress value={(me.chats_today / Math.max(1, me.chats_per_day)) * 100} tone={me.chats_today >= me.chats_per_day ? 'warn' : 'accent'} />
              <div className="text-xs text-muted mt-1.5">Resets at midnight UTC</div>
            </div>
          </div>
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {plans.map((p) => {
          const current = (p.key === 'pro') === pro
          return (
            <div key={p.name} className={`card p-5 ${current ? 'border-accent' : ''}`}>
              <div className="flex items-center justify-between"><span className="font-semibold">{p.name}</span>{current && <Badge tone="accent">Current</Badge>}</div>
              <div className="mt-3 text-3xl font-semibold">${p.price}<span className="text-sm font-normal text-muted">/mo</span></div>
              <ul className="mt-4 space-y-2 text-sm">
                {p.items.map((i) => (
                  <li key={i.text} className={`flex items-start gap-2 ${i.ok ? '' : 'text-muted'}`}>
                    {i.ok ? <Check size={14} className="text-good mt-0.5 shrink-0" /> : <Minus size={14} className="mt-0.5 shrink-0" />}{i.text}
                  </li>
                ))}
              </ul>
              {!current && p.key === 'pro' && <button className="btn btn-primary mt-5 w-full justify-center" disabled>Upgrade (payments coming soon)</button>}
            </div>
          )
        })}

        <Card title="Buy credits" subtitle="1 credit = 1 generated image">
          <div className="space-y-2">
            {packs.map((k) => (
              <div key={k.credits} className="flex items-center justify-between rounded-lg border border-line p-3">
                <span className="flex items-center gap-2 text-sm"><Coins size={14} className="text-muted" />{k.credits} credits</span>
                <span className="text-sm font-medium">${k.price}</span>
              </div>
            ))}
          </div>
          <button className="btn mt-4 w-full justify-center" disabled>Payments coming soon</button>
        </Card>
      </div>
    </div>
  )
}
