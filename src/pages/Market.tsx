import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownRight, ArrowUpRight, Bell } from 'lucide-react'
import { PageHeader, Card, Stat, Badge, Progress, chartTooltip, axisStyle } from '../components/ui'
import { marketTrend, trendingKeywords, upcomingGames } from '../data/mock'

export default function Market() {
  return (
    <div>
      <PageHeader title="Market Trends" subtitle="What is growing on the platform and what is about to launch" actions={<Badge tone="accent">Updated hourly</Badge>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Platform CCU" value="6.4M" change={3.2} hint="concurrent players" />
        <Stat label="Fastest genre" value="Horror" change={21.7} hint="CCU growth, 30d" />
        <Stat label="Upcoming launches" value="38" hint="tracked, next 90 days" />
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
        <Card title="Upcoming games" subtitle="Not launched yet, ranked by hype: wishlists, Discord growth, teaser views and creator followers">
          <table className="table w-full">
            <thead><tr><th>Game</th><th>Genre</th><th>Launch</th><th>Hype score</th><th className="text-right">Discord</th><th className="text-right">Teaser views</th><th className="text-right">7d trend</th><th></th></tr></thead>
            <tbody>
              {upcomingGames.map((g) => (
                <tr key={g.name}>
                  <td>
                    <div className="font-medium">{g.name}</div>
                    <div className="text-xs text-muted">{g.studio}</div>
                  </td>
                  <td><Badge tone={g.genre === 'Obby' ? 'accent' : 'neutral'}>{g.genre}</Badge></td>
                  <td className="text-muted">{g.launch}</td>
                  <td>
                    <div className="flex items-center gap-2 w-32">
                      <Progress value={g.signals} tone={g.signals >= 85 ? 'good' : g.signals >= 70 ? 'accent' : 'warn'} />
                      <span className="text-xs">{g.signals}</span>
                    </div>
                  </td>
                  <td className="text-right">{g.discord}</td>
                  <td className="text-right">{g.teaserViews}</td>
                  <td className={`text-right ${g.trend >= 0 ? 'text-good' : 'text-bad'}`}>{g.trend > 0 ? '+' : ''}{g.trend}%</td>
                  <td className="text-right"><button className="btn px-2 py-1 text-xs"><Bell size={12} />Watch</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}
