import { useEffect, useRef, useState } from 'react'
import { Send, Sparkles, Plus } from 'lucide-react'
import { PageHeader, Badge, Toggle } from '../components/ui'
import { ProGate } from '../components/data'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

type Msg = { role: 'user' | 'assistant'; text: string; error?: boolean }

const suggestions = [
  'What is the biggest problem in my data?',
  'How can I improve day 1 retention?',
  'Write a Discord update for my next event',
  'Ideas for a new game pass',
]

const GREETING: Msg = {
  role: 'assistant',
  text: 'Hi. I can see the Creator Dashboard files you uploaded for this game. Ask me what is going well, what to fix, or ask me to write something for your community.',
}

export default function Chatbot() {
  const { me, gameId, refresh } = useAuth()
  const [msgs, setMsgs] = useState<Msg[]>([GREETING])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [notes, setNotes] = useState('')
  const [useData, setUseData] = useState(true)
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, typing])
  useEffect(() => { setMsgs([GREETING]) }, [gameId])

  if (me?.plan !== 'pro') {
    return (<div><PageHeader title="Chatbot" /><ProGate feature="The Chatbot" /></div>)
  }

  const send = async (text: string) => {
    const q = text.trim()
    if (!q || typing) return
    const next: Msg[] = [...msgs, { role: 'user', text: q }]
    setMsgs(next)
    setInput('')
    setTyping(true)
    try {
      const history = next.slice(1).filter((m) => !m.error).slice(-12).map((m) => ({ role: m.role, content: m.text }))
      const r = await api.chat({ messages: history, universe_id: gameId ?? undefined, include_data: useData, notes: notes.trim() || undefined })
      setMsgs((m) => [...m, { role: 'assistant', text: r.reply || 'No answer, try asking again.' }])
    } catch (e) {
      setMsgs((m) => [...m, { role: 'assistant', text: (e as Error).message, error: true }])
    } finally {
      setTyping(false)
      refresh()
    }
  }

  const left = Math.max(0, me.chats_per_day - me.chats_today)

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Chatbot" subtitle="Ask about your game in plain language" actions={<Badge tone={left ? 'good' : 'warn'}>{left} messages left today</Badge>} />

      <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-4">
        <div className="hidden lg:flex flex-col card p-3">
          <button className="btn w-full justify-center" onClick={() => setMsgs([GREETING])}><Plus size={14} />New chat</button>
          <div className="mt-4 flex items-center justify-between px-1">
            <div>
              <div className="text-sm">Use my uploaded data</div>
              <div className="text-xs text-muted">Creator Dashboard files</div>
            </div>
            <Toggle checked={useData} onChange={setUseData} />
          </div>
          <div className="mt-4 text-[11px] font-medium uppercase tracking-wider text-muted px-1">Extra notes</div>
          <textarea
            className="input mt-1 h-40 resize-none text-xs"
            placeholder="Anything the bot should know: what you changed last update, your goals, numbers not in the files."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="mt-auto rounded-lg border border-line bg-bg p-3 text-xs text-muted">Only your own files and notes are sent to the AI. Nothing is shared with other developers.</div>
        </div>

        <div className="card flex min-h-[520px] flex-col lg:col-span-3">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {msgs.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                {m.role === 'assistant' && <div className="h-8 w-8 shrink-0 rounded-full bg-accent-soft text-accent flex items-center justify-center"><Sparkles size={14} /></div>}
                <div className={`max-w-[75%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-accent text-white rounded-br-md' : m.error ? 'bg-[#2e1616] text-bad rounded-bl-md' : 'bg-panel-2 rounded-bl-md'}`}>{m.text}</div>
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
            <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your players, revenue, updates, or ask for a write-up" />
            <button type="submit" className="btn btn-primary" disabled={!input.trim() || typing || !left}><Send size={14} /></button>
          </form>
        </div>
      </div>
    </div>
  )
}
