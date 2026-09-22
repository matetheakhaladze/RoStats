import { useEffect, useRef, useState } from 'react'
import { Send, Sparkles, Plus, MessageSquare } from 'lucide-react'
import { PageHeader, Badge } from '../components/ui'

type Msg = { role: 'user' | 'bot'; text: string }

const suggestions = [
  'Why did revenue drop on Tuesday?',
  'Which server region has the worst ping?',
  'Write a Discord update about the new boss arena',
  'What should my next game pass be?',
]

const history = [
  'Retention ideas for level 3',
  'Explain the crash on srv-77b2',
  'Price for VIP pass',
]

function reply(q: string): string {
  const s = q.toLowerCase()
  if (s.includes('revenue') || s.includes('drop')) return 'Revenue on Tuesday was R$ 11,400, about 22% below the 7-day average. Two things lined up: the 2x Coins Boost sale ended Monday night, and srv-1c77 (EU) ran at full capacity for six hours, so around 900 EU players could not join. Purchases per active player were normal, so this looks like a traffic dip, not a pricing problem. Want me to draft a weekend promo to recover it?'
  if (s.includes('ping') || s.includes('server') || s.includes('region')) return 'Asia is the weakest region right now: srv-77b2 averages 142 ms and dropped to 47 FPS during the last boss wave. It also has 6 EnemySpawner timeouts today. The quickest win is capping enemies per wave at 40 on that server; the same script runs fine everywhere else at that limit.'
  if (s.includes('discord') || s.includes('update') || s.includes('write')) return 'Here is a draft:\n\nBoss Arena is live! Fight the Lava Titan with up to 8 players, earn the new Titan Slayer badge and unlock the Molten Trail (game pass, 149 R$). Servers restart in 10 minutes to roll it out. Report bugs in #bug-reports and tell us what boss should come next.'
  if (s.includes('game pass') || s.includes('price') || s.includes('sell')) return 'Based on your funnel, the best candidate is a cosmetic that shows on the leaderboard. Players who reach the boss arena convert at 11%, and 68% of your revenue already comes from cosmetics and boosts. A 199 R$ "Titan Skin" pass with a leaderboard tag should land around 900 to 1,200 sales in the first month if you promote it on the arena entry screen.'
  if (s.includes('retention') || s.includes('level')) return 'Levels 3 and 4 take twice as long as level 2, and 40% of new players quit there. Try shortening level 3 by one section, adding a checkpoint halfway through level 4, and giving a small reward (50 coins) at the end of level 3. Similar changes in obby games usually lift D1 retention by 3 to 5 points.'
  return 'I can answer questions about your games using the same data you see in the dashboards: players, revenue, servers, crashes, market trends. Try asking about a specific metric, a server, or ask me to write something for your community.'
}

export default function Chatbot() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'bot', text: 'Hi Mate. I have access to all four of your experiences. Ask me anything about players, revenue, servers, or ask me to write an update for your community.' },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, typing])

  const send = (text: string) => {
    const q = text.trim()
    if (!q || typing) return
    setMsgs((m) => [...m, { role: 'user', text: q }])
    setInput('')
    setTyping(true)
    setTimeout(() => { setMsgs((m) => [...m, { role: 'bot', text: reply(q) }]); setTyping(false) }, 900)
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Chatbot" subtitle="Ask about your games in plain language" actions={<Badge tone="good">Connected to 4 games</Badge>} />

      <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-4">
        <div className="hidden lg:flex flex-col card p-3">
          <button className="btn w-full justify-center" onClick={() => setMsgs(msgs.slice(0, 1))}><Plus size={14} />New chat</button>
          <div className="mt-4 text-[11px] font-medium uppercase tracking-wider text-muted px-1">Recent</div>
          <div className="mt-1 space-y-0.5">
            {history.map((h) => (
              <button key={h} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-muted hover:bg-panel-2 hover:text-text"><MessageSquare size={14} className="shrink-0" /><span className="truncate">{h}</span></button>
            ))}
          </div>
          <div className="mt-auto rounded-lg border border-line bg-bg p-3 text-xs text-muted">The bot only sees your own analytics data. Nothing is shared with other studios.</div>
        </div>

        <div className="card flex min-h-[520px] flex-col lg:col-span-3">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {msgs.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                {m.role === 'bot' && <div className="h-8 w-8 shrink-0 rounded-full bg-accent-soft text-accent flex items-center justify-center"><Sparkles size={14} /></div>}
                <div className={`max-w-[75%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-accent text-white rounded-br-md' : 'bg-panel-2 rounded-bl-md'}`}>{m.text}</div>
              </div>
            ))}
            {typing && (
              <div className="flex gap-3">
                <div className="h-8 w-8 shrink-0 rounded-full bg-accent-soft text-accent flex items-center justify-center"><Sparkles size={14} /></div>
                <div className="rounded-2xl rounded-bl-md bg-panel-2 px-4 py-3 text-sm text-muted">Thinking...</div>
              </div>
            )}
            <div ref={bottom} />
          </div>

          {msgs.length <= 1 && (
            <div className="flex flex-wrap gap-2 px-5 pb-3">
              {suggestions.map((s) => <button key={s} className="btn text-xs" onClick={() => send(s)}>{s}</button>)}
            </div>
          )}

          <form className="flex items-center gap-2 border-t border-line p-3" onSubmit={(e) => { e.preventDefault(); send(input) }}>
            <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about players, revenue, servers, or ask for a write-up" />
            <button type="submit" className="btn btn-primary" disabled={!input.trim() || typing}><Send size={14} /></button>
          </form>
        </div>
      </div>
    </div>
  )
}
