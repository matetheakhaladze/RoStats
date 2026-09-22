import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader, Card, Stat, Badge, chartTooltip, axisStyle } from '../components/ui'
import { overviewSeries, revenueByProduct, topProducts, funnel } from '../data/mock'

export default function Monetization() {
  const total = revenueByProduct.reduce((a, b) => a + b.value, 0)
  return (
    <div>
      <PageHeader title="Monetization" subtitle="Revenue, products and the purchase funnel" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Revenue (30d)" value="R$ 452,300" change={12.5} hint="about $1,583 USD" />
        <Stat label="ARPPU" value="R$ 1,036" change={4.2} hint="per paying user" />
        <Stat label="Conversion rate" value="2.8%" change={0.6} hint="visits to purchase" />
        <Stat label="Lifetime value" value="R$ 5,290" change={7.9} hint="per paying user" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Daily revenue" subtitle="Robux earned per day" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={overviewSeries} margin={{ left: -10, right: 8 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={0.35} /><stop offset="100%" stopColor="#34d399" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip {...chartTooltip} />
                <Area type="monotone" dataKey="revenue" stroke="#34d399" fill="url(#rev)" strokeWidth={2} name="Robux" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Revenue by source" subtitle="Share of 30-day total">
          <div className="space-y-4">
            {revenueByProduct.map((r) => {
              const pct = Math.round((r.value / total) * 100)
              return (
                <div key={r.name}>
                  <div className="flex justify-between text-sm mb-1.5"><span>{r.name}</span><span className="text-muted">{pct}%</span></div>
                  <div className="h-1.5 w-full rounded-full bg-panel-2"><div className="h-full rounded-full bg-good" style={{ width: `${pct}%` }} /></div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Purchase funnel" subtitle="From visit to first purchase">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={funnel} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="stage" tick={axisStyle} axisLine={false} tickLine={false} width={95} />
                <Tooltip {...chartTooltip} cursor={{ fill: '#171e30' }} />
                <Bar dataKey="value" fill="#4f8cff" radius={[0, 4, 4, 0]} name="Players" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Top products" subtitle="30 days" className="lg:col-span-2">
          <table className="table w-full">
            <thead><tr><th>Product</th><th>Type</th><th className="text-right">Price</th><th className="text-right">Sales</th><th className="text-right">Revenue</th></tr></thead>
            <tbody>
              {topProducts.map((p) => (
                <tr key={p.name}>
                  <td className="font-medium">{p.name}</td>
                  <td><Badge tone={p.type === 'Game pass' ? 'accent' : 'neutral'}>{p.type}</Badge></td>
                  <td className="text-right">R$ {p.price}</td>
                  <td className="text-right text-muted">{p.sales.toLocaleString()}</td>
                  <td className="text-right font-medium">R$ {p.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}
