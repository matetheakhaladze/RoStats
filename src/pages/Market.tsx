import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { PageHeader, Card, Stat, Badge, Progress, chartTooltip, axisStyle } from '../components/ui'
import { marketGenres, marketTrend, trendingKeywords } from '../data/mock'

export default function Market() {
  return (
    <div>
      <PageHeader title="Market Trends" subtitle="What is growing on the platform right now" actions={<Badge tone="accent">Updated hourly</Badge>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Platform CCU" value="6.4M" change={3.2} hint="concurrent players" />
        <Stat label="Fastest genre" value="Horror" change={21.7} hint="CCU growth, 30d" />
        <Stat label="New games / day" value="4,120" change={-2.1} />
        <Stat label="Your genre rank" value="#14" change={6} hint="Obby, by CCU" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Genre CCU over 12 weeks" subtitle="Thousands of concurrent players" className="lg:col-span-2">
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={marketTrend} margin={{ left: -20, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="week" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip {...chartTooltip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="simulator" stroke="#4f8cff" strokeWidth={2} dot={false} name="Simulator" />
                <Line type="monotone" dataKey="horror" stroke="#f87171" strokeWidth={2} dot={false} name="Horror" />
                <Line type="monotone" dataKey="tycoon" stroke="#34d399" strokeWidth={2} dot={false} name="Tycoon" />
                <Line type="monotone" dataKey="racing" stroke="#fbbf24" strokeWidth={2} dot={false} name="Racing" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Trending searches" subtitle="Relative search volume, 7 days">
          <div className="space-y-4">
            {trendingKeywords.map((k) => (
              <div key={k.keyword}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span>{k.keyword}</span>
                  <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${k.change >= 0 ? 'text-good' : 'text-bad'}`}>
                    {k.change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(k.change)}%
                  </span>
                </div>
                <Progress value={k.volume} tone={k.change >= 20 ? 'good' : 'accent'} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Genre comparison" subtitle="Live concurrent players and 30-day growth">
          <table className="table w-full">
            <thead><tr><th>Genre</th><th className="text-right">CCU</th><th className="text-right">Games</th><th className="text-right">CCU per game</th><th className="text-right">30d growth</th><th>Opportunity</th></tr></thead>
            <tbody>
              {marketGenres.map((g) => {
                const perGame = Math.round(g.ccu / g.games)
                const opp = g.growth > 15 && perGame > 150 ? 'High' : g.growth > 5 ? 'Medium' : 'Low'
                return (
                  <tr key={g.genre}>
                    <td className="font-medium">{g.genre}</td>
                    <td className="text-right">{g.ccu.toLocaleString()}</td>
                    <td className="text-right text-muted">{g.games.toLocaleString()}</td>
                    <td className="text-right">{perGame}</td>
                    <td className={`text-right ${g.growth >= 0 ? 'text-good' : 'text-bad'}`}>{g.growth > 0 ? '+' : ''}{g.growth}%</td>
                    <td><Badge tone={opp === 'High' ? 'good' : opp === 'Medium' ? 'warn' : 'neutral'}>{opp}</Badge></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}
