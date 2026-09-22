import { useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download } from 'lucide-react'
import { PageHeader, Card, Stat, Badge, Segmented, chartTooltip, axisStyle } from '../components/ui'
import { overviewSeries, weeklyActivity, games, topProducts, crashLog } from '../data/mock'

export default function Overview() {
  const [range, setRange] = useState('30d')
  const data = range === '7d' ? overviewSeries.slice(-7) : range === '14d' ? overviewSeries.slice(-14) : overviewSeries

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Tower Escape Simulator, last 30 days"
        actions={<><Segmented options={['7d', '14d', '30d']} value={range} onChange={setRange} /><button className="btn"><Download size={14} />Export</button></>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Visits" value="384,120" change={8.3} hint="vs previous period" />
        <Stat label="Revenue" value="R$ 452,300" change={12.5} hint="about $1,583 USD" />
        <Stat label="Avg session" value="42 min" change={5.2} hint="median 31 min" />
        <Stat label="D1 retention" value="51%" change={3.1} hint="genre avg 44%" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Visits and active players" subtitle="Daily totals" className="lg:col-span-2">
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={data} margin={{ left: -10, right: 8 }}>
                <defs>
                  <linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f8cff" stopOpacity={0.35} /><stop offset="100%" stopColor="#4f8cff" stopOpacity={0} /></linearGradient>
                  <linearGradient id="p" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={0.3} /><stop offset="100%" stopColor="#34d399" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} interval={Math.ceil(data.length / 8)} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip {...chartTooltip} />
                <Area type="monotone" dataKey="visits" stroke="#4f8cff" fill="url(#v)" strokeWidth={2} name="Visits" />
                <Area type="monotone" dataKey="players" stroke="#34d399" fill="url(#p)" strokeWidth={2} name="Players" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Weekly activity" subtitle="Active vs new players">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={weeklyActivity} margin={{ left: -20, right: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip {...chartTooltip} cursor={{ fill: '#171e30' }} />
                <Bar dataKey="active" fill="#4f8cff" radius={[4, 4, 0, 0]} name="Active" />
                <Bar dataKey="newPlayers" fill="#a78bfa" radius={[4, 4, 0, 0]} name="New" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Your experiences" subtitle="Concurrent players right now">
          <div className="space-y-3">
            {games.map((g) => (
              <div key={g.id} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{g.name}</div>
                  <div className="text-xs text-muted">{g.genre}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{g.players.toLocaleString()}</div>
                  <div className="text-xs text-good">{g.rating}% rating</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Top products" subtitle="By revenue, 30 days">
          <table className="table w-full">
            <thead><tr><th>Product</th><th className="text-right">Sales</th><th className="text-right">Robux</th></tr></thead>
            <tbody>
              {topProducts.slice(0, 4).map((p) => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td className="text-right text-muted">{p.sales.toLocaleString()}</td>
                  <td className="text-right font-medium">{(p.revenue / 1000).toFixed(0)}k</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Recent incidents" subtitle="Last 24 hours" right={<Badge tone="warn">4 open</Badge>}>
          <div className="space-y-3">
            {crashLog.map((c) => (
              <div key={c.time} className="flex gap-3">
                <div className="text-xs text-muted w-10 shrink-0 pt-0.5">{c.time}</div>
                <div className="min-w-0">
                  <div className="text-sm truncate">{c.error}</div>
                  <div className="text-xs text-muted">{c.server} · {c.count} occurrences</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
