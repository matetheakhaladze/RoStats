import { Check, Download } from 'lucide-react'
import { PageHeader, Card, Badge, Progress } from '../components/ui'
import { invoices } from '../data/mock'

const plans = [
  { name: 'Free', price: 0, items: ['1 game', '7-day history', 'Basic dashboards', 'Community support'] },
  { name: 'Pro', price: 29, items: ['10 games', '1-year history', 'AI thumbnail and asset tools', 'Scheduled reports', '3 team seats'], current: true },
  { name: 'Studio', price: 99, items: ['Unlimited games', 'Unlimited history', 'Unlimited seats', 'API access', 'Priority support'] },
]

export default function Billing() {
  return (
    <div>
      <PageHeader title="Subscription" subtitle="Plan, usage and invoices" />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Current plan" className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2"><span className="text-2xl font-semibold">Pro</span><Badge tone="good">Active</Badge></div>
              <div className="text-sm text-muted mt-1">$29 per month, renews on Oct 1, 2026</div>
            </div>
            <div className="flex gap-2"><button className="btn">Change plan</button><button className="btn text-bad">Cancel</button></div>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {[
              ['Games tracked', 4, 10],
              ['AI credits', 62, 100],
              ['Team seats', 2, 3],
            ].map(([l, u, m]) => (
              <div key={l as string}>
                <div className="flex justify-between text-sm mb-1.5"><span>{l}</span><span className="text-muted">{u} / {m}</span></div>
                <Progress value={((u as number) / (m as number)) * 100} tone={(u as number) / (m as number) > 0.8 ? 'warn' : 'accent'} />
              </div>
            ))}
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

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <div key={p.name} className={`card p-5 ${p.current ? 'border-accent' : ''}`}>
            <div className="flex items-center justify-between"><span className="font-semibold">{p.name}</span>{p.current && <Badge tone="accent">Current</Badge>}</div>
            <div className="mt-3 text-3xl font-semibold">${p.price}<span className="text-sm font-normal text-muted">/mo</span></div>
            <ul className="mt-4 space-y-2 text-sm">{p.items.map((i) => <li key={i} className="flex items-center gap-2"><Check size={14} className="text-good" />{i}</li>)}</ul>
            <button className={`btn mt-5 w-full justify-center ${p.current ? '' : 'btn-primary'}`} disabled={p.current}>{p.current ? 'Your plan' : p.price > 29 ? 'Upgrade' : 'Downgrade'}</button>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Card title="Invoices">
          <table className="table w-full">
            <thead><tr><th>Invoice</th><th>Date</th><th>Plan</th><th>Amount</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id}>
                  <td className="font-mono text-xs">{i.id}</td>
                  <td>{i.date}</td>
                  <td>{i.plan}</td>
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
