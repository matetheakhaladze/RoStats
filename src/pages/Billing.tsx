import { useState } from 'react'
import { Check, Download, Minus, Coins } from 'lucide-react'
import { PageHeader, Card, Badge, Progress } from '../components/ui'
import { invoices } from '../data/mock'

const plans = [
  {
    name: 'Free', price: 0, desc: 'Everything that costs us nothing to run',
    items: [
      { text: '1 game', ok: true },
      { text: '7-day data history', ok: true },
      { text: 'Basic dashboards (overview, players, performance)', ok: true },
      { text: 'Community support', ok: true },
      { text: 'Art Generator and Chatbot', ok: false },
      { text: 'Market trends and upcoming games', ok: false },
      { text: 'Scheduled reports and exports', ok: false },
    ],
  },
  {
    name: 'Pro', price: 29, desc: 'Full access to everything', current: true,
    items: [
      { text: 'Unlimited games', ok: true },
      { text: 'Full data history', ok: true },
      { text: 'All dashboards, market trends, user journeys', ok: true },
      { text: 'Art Generator and Chatbot', ok: true },
      { text: '100 free credits every month', ok: true },
      { text: 'Scheduled reports, exports, API access', ok: true },
      { text: 'Priority support', ok: true },
    ],
  },
]

const packs = [
  { credits: 50, price: 5 },
  { credits: 200, price: 15, best: true },
  { credits: 500, price: 30 },
]

export default function Billing() {
  const [pack, setPack] = useState(1)

  return (
    <div>
      <PageHeader title="Subscription" subtitle="Plan, credits and invoices" />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Current plan" className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2"><span className="text-2xl font-semibold">Pro</span><Badge tone="good">Active</Badge></div>
              <div className="text-sm text-muted mt-1">$29 per month, renews on Oct 1, 2026</div>
            </div>
            <div className="flex gap-2"><button className="btn">Switch to Free</button></div>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <div className="flex justify-between text-sm mb-1.5"><span>Monthly credits</span><span className="text-muted">38 of 100 used</span></div>
              <Progress value={38} />
              <div className="text-xs text-muted mt-1.5">Resets on Oct 1. Unused monthly credits do not roll over.</div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5"><span>Purchased credits</span><span className="text-muted">0</span></div>
              <Progress value={0} tone="good" />
              <div className="text-xs text-muted mt-1.5">Purchased credits never expire and are used after monthly ones.</div>
            </div>
          </div>
        </Card>

        <Card title="Payment method">
          <div className="rounded-lg border border-line bg-bg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Visa ending 4242</span>
              <Badge tone="neutral">Default</Badge>
            </div>
            <div className="text-xs text-muted mt-1">Expires 08/28</div>
          </div>
          <button className="btn mt-3 w-full justify-center">Update card</button>
          <p className="mt-3 text-xs text-muted">Billing is handled by Stripe. RoStats never stores card numbers.</p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {plans.map((p) => (
          <div key={p.name} className={`card p-5 ${p.current ? 'border-accent' : ''}`}>
            <div className="flex items-center justify-between"><span className="font-semibold">{p.name}</span>{p.current && <Badge tone="accent">Current</Badge>}</div>
            <div className="mt-3 text-3xl font-semibold">${p.price}<span className="text-sm font-normal text-muted">/mo</span></div>
            <p className="mt-1 text-sm text-muted">{p.desc}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {p.items.map((i) => (
                <li key={i.text} className={`flex items-start gap-2 ${i.ok ? '' : 'text-muted'}`}>
                  {i.ok ? <Check size={14} className="text-good mt-0.5 shrink-0" /> : <Minus size={14} className="mt-0.5 shrink-0" />}{i.text}
                </li>
              ))}
            </ul>
            <button className={`btn mt-5 w-full justify-center ${p.current ? '' : 'btn-primary'}`} disabled={p.current}>{p.current ? 'Your plan' : p.price === 0 ? 'Downgrade' : 'Upgrade to Pro'}</button>
          </div>
        ))}

        <Card title="Buy credits" subtitle="Credits are used by the Art Generator. 1 credit = 1 image.">
          <div className="space-y-2">
            {packs.map((k, i) => (
              <button key={k.credits} onClick={() => setPack(i)} className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${pack === i ? 'border-accent bg-accent-soft' : 'border-line hover:bg-panel-2'}`}>
                <span className="flex items-center gap-2 text-sm"><Coins size={14} className={pack === i ? 'text-accent' : 'text-muted'} />{k.credits} credits</span>
                <span className="text-sm">
                  {k.best && <Badge tone="good">Best value</Badge>}
                  <span className="ml-2 font-medium">${k.price}</span>
                </span>
              </button>
            ))}
          </div>
          <button className="btn btn-primary mt-4 w-full justify-center">Buy {packs[pack].credits} credits for ${packs[pack].price}</button>
          <p className="mt-2 text-center text-[11px] text-muted">Purchased credits never expire. Art Generator requires the Pro plan.</p>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Invoices">
          <table className="table w-full">
            <thead><tr><th>Invoice</th><th>Date</th><th>Description</th><th>Amount</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id}>
                  <td className="font-mono text-xs">{i.id}</td>
                  <td>{i.date}</td>
                  <td>{i.plan === 'Free' ? 'Free plan' : 'Pro plan, monthly'}</td>
                  <td>{i.amount}</td>
                  <td><Badge tone="good">{i.status}</Badge></td>
                  <td className="text-right"><button className="btn px-2 py-1 text-xs"><Download size={12} />PDF</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}
