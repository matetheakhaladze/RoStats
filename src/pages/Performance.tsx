import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { RefreshCw } from 'lucide-react'
import { PageHeader, Card, Stat, Badge, Progress, chartTooltip, axisStyle } from '../components/ui'
import { serverHealth, servers, crashLog } from '../data/mock'

const tone = { healthy: 'good', warning: 'warn', critical: 'bad' } as const

export default function Performance() {
  return (
    <div>
      <PageHeader
        title="Game Performance"
        subtitle="Server health, client frame rate and crash monitoring"
        actions={<button className="btn"><RefreshCw size={14} />Refresh</button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Live servers" value="184" change={4.5} hint="avg 38 players each" />
        <Stat label="Avg ping" value="71 ms" change={-6.2} hint="lower is better" />
        <Stat label="Client FPS" value="57.4" change={1.8} hint="p50 across devices" />
        <Stat label="Crash rate" value="0.42%" change={-18} hint="per session" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Server CPU and memory" subtitle="Average across all servers, last 24h">
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={serverHealth} margin={{ left: -20, right: 8 }}>
                <defs>
                  <linearGradient id="cpu" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f8cff" stopOpacity={0.3} /><stop offset="100%" stopColor="#4f8cff" stopOpacity={0} /></linearGradient>
                  <linearGradient id="mem" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a78bfa" stopOpacity={0.3} /><stop offset="100%" stopColor="#a78bfa" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="hour" tick={axisStyle} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                <Tooltip {...chartTooltip} />
                <Area type="monotone" dataKey="cpu" stroke="#4f8cff" fill="url(#cpu)" strokeWidth={2} name="CPU" />
                <Area type="monotone" dataKey="memory" stroke="#a78bfa" fill="url(#mem)" strokeWidth={2} name="Memory" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Ping and frame rate" subtitle="Client-side, last 24h">
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={serverHealth} margin={{ left: -20, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="hour" tick={axisStyle} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip {...chartTooltip} />
                <Line type="monotone" dataKey="ping" stroke="#fbbf24" strokeWidth={2} dot={false} name="Ping (ms)" />
                <Line type="monotone" dataKey="fps" stroke="#34d399" strokeWidth={2} dot={false} name="FPS" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Server instances" subtitle="Sorted by load" className="lg:col-span-2">
          <table className="table w-full">
            <thead><tr><th>Server</th><th>Region</th><th>Players</th><th>Ping</th><th>FPS</th><th>Uptime</th><th>Status</th></tr></thead>
            <tbody>
              {servers.map((s) => (
                <tr key={s.id}>
                  <td className="font-mono text-xs">{s.id}</td>
                  <td>{s.region}</td>
                  <td>
                    <div className="flex items-center gap-2 w-28">
                      <Progress value={(s.players / s.max) * 100} tone={s.players === s.max ? 'warn' : 'accent'} />
                      <span className="text-xs text-muted">{s.players}/{s.max}</span>
                    </div>
                  </td>
                  <td className={s.ping > 120 ? 'text-bad' : s.ping > 80 ? 'text-warn' : ''}>{s.ping} ms</td>
                  <td>{s.fps}</td>
                  <td className="text-muted">{s.uptime}</td>
                  <td><Badge tone={tone[s.status as keyof typeof tone]}>{s.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Crash log" subtitle="Grouped script errors" right={<Badge tone="bad">20 today</Badge>}>
          <div className="space-y-4">
            {crashLog.map((c) => (
              <div key={c.time} className="rounded-lg border border-line bg-bg p-3">
                <div className="flex justify-between text-xs text-muted mb-1"><span>{c.server}</span><span>{c.time}</span></div>
                <div className="font-mono text-xs text-text break-all">{c.error}</div>
                <div className="mt-2 text-xs text-bad">{c.count} occurrences</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
