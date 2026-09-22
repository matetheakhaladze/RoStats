import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader, Card, Stat, Badge, Progress, chartTooltip, axisStyle } from '../components/ui'
import { chatbotVolume, chatbotIntents, chatbotTranscripts } from '../data/mock'

const sentimentTone = { positive: 'good', neutral: 'neutral', negative: 'bad' } as const

export default function Chatbot() {
  return (
    <div>
      <PageHeader title="Chatbot Analytics" subtitle="Your in-game support bot, last 7 days" actions={<Badge tone="good">Bot online</Badge>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Conversations" value="7,840" change={14.2} />
        <Stat label="Resolved by bot" value="83%" change={2.4} hint="rest escalated to Discord" />
        <Stat label="Avg response" value="1.2 s" change={-8} />
        <Stat label="Satisfaction" value="4.6 / 5" change={1.1} hint="from 1,920 ratings" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Conversations per day" subtitle="Total vs resolved without a human" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={chatbotVolume} margin={{ left: -20, right: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip {...chartTooltip} cursor={{ fill: '#171e30' }} />
                <Bar dataKey="conversations" fill="#232b3d" radius={[4, 4, 0, 0]} name="Total" />
                <Bar dataKey="resolved" fill="#4f8cff" radius={[4, 4, 0, 0]} name="Resolved" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Top intents" subtitle="What players ask about">
          <div className="space-y-4">
            {chatbotIntents.map((i) => (
              <div key={i.intent}>
                <div className="flex justify-between text-sm mb-1.5"><span>{i.intent}</span><span className="text-muted">{i.share}%</span></div>
                <Progress value={i.share * 3} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Recent conversations" subtitle="Live feed" className="lg:col-span-2">
          <div className="space-y-3">
            {chatbotTranscripts.map((t) => (
              <div key={t.user + t.time} className="flex gap-3 rounded-lg border border-line bg-bg p-3">
                <div className="h-8 w-8 shrink-0 rounded-full bg-panel-2 flex items-center justify-center text-xs font-medium">{t.user[0].toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted"><span className="text-text font-medium">{t.user}</span><span>{t.time}</span></div>
                  <div className="text-sm mt-0.5">{t.msg}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge tone="accent">{t.intent}</Badge>
                  <Badge tone={sentimentTone[t.sentiment as keyof typeof sentimentTone]}>{t.sentiment}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Knowledge gaps" subtitle="Questions the bot could not answer">
          <div className="space-y-3 text-sm">
            {[
              ['How to rebirth after level 50', 41],
              ['Trade scam refund', 33],
              ['Private server not loading', 27],
              ['Where is the secret badge', 19],
            ].map(([q, n]) => (
              <div key={q as string} className="flex items-center justify-between rounded-lg border border-line bg-bg px-3 py-2">
                <span>{q}</span>
                <span className="text-xs text-warn">{n} asks</span>
              </div>
            ))}
          </div>
          <button className="btn mt-4 w-full justify-center">Add answers to knowledge base</button>
        </Card>
      </div>
    </div>
  )
}
