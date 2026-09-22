import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader, Card, Stat, Progress, chartTooltip, axisStyle } from '../components/ui'
import { retentionCurve, retentionCohorts, ageBuckets, regions, devices } from '../data/mock'

const pieColors = ['#4f8cff', '#34d399', '#fbbf24', '#a78bfa']

function heat(v: number) {
  if (v === 0) return 'bg-panel-2 text-muted'
  if (v >= 45) return 'bg-[#1e3a8a] text-white'
  if (v >= 30) return 'bg-[#1e3a8a]/70 text-white'
  if (v >= 20) return 'bg-[#1e3a8a]/45 text-text'
  return 'bg-[#1e3a8a]/25 text-text'
}

export default function Players() {
  return (
    <div>
      <PageHeader title="Player Analytics" subtitle="Who plays, how long they stay, and where they come from" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Daily active users" value="12,450" change={8.3} />
        <Stat label="New players (7d)" value="14,750" change={11.2} />
        <Stat label="Avg session length" value="42 min" change={5.2} />
        <Stat label="Sessions per user" value="2.4" change={-1.1} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Retention curve" subtitle="Share of new players who return" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={retentionCurve} margin={{ left: -20, right: 10 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} unit="%" />
                <Tooltip {...chartTooltip} />
                <Line type="monotone" dataKey="rate" stroke="#4f8cff" strokeWidth={2.5} dot={{ r: 4, fill: '#4f8cff' }} name="Retention" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Age groups" subtitle="Based on account age brackets">
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={ageBuckets} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="none">
                  {ageBuckets.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                </Pie>
                <Tooltip {...chartTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {ageBuckets.map((a, i) => (
              <div key={a.name} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: pieColors[i] }} />{a.name} <span className="text-muted ml-auto">{a.value}%</span></div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Retention cohorts" subtitle="Weekly cohorts, % returning" className="lg:col-span-2">
          <table className="table w-full">
            <thead><tr><th>Cohort</th><th>D1</th><th>D3</th><th>D7</th><th>D14</th><th>D30</th></tr></thead>
            <tbody>
              {retentionCohorts.map((c) => (
                <tr key={c.cohort}>
                  <td className="font-medium">{c.cohort}</td>
                  {(['d1', 'd3', 'd7', 'd14', 'd30'] as const).map((k) => (
                    <td key={k} className="p-1.5"><div className={`rounded-md px-3 py-2 text-center text-xs ${heat(c[k])}`}>{c[k] ? `${c[k]}%` : ''}</div></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Devices" subtitle="Share of sessions">
          <div className="space-y-4">
            {devices.map((d, i) => (
              <div key={d.name}>
                <div className="flex justify-between text-sm mb-1.5"><span>{d.name}</span><span className="text-muted">{d.value}%</span></div>
                <div className="h-1.5 w-full rounded-full bg-panel-2"><div className="h-full rounded-full" style={{ width: `${d.value}%`, background: pieColors[i] }} /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Top regions" subtitle="Players by country, 30 days">
          <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
            {regions.map((r) => (
              <div key={r.name} className="flex items-center gap-4">
                <div className="w-32 text-sm">{r.name}</div>
                <div className="flex-1"><Progress value={r.share * 2.5} /></div>
                <div className="w-20 text-right text-sm text-muted">{r.players.toLocaleString()}</div>
                <div className="w-10 text-right text-sm">{r.share}%</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
