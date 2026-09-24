import { useEffect, useRef, useState } from 'react'
import { Send, Sparkles, Plus } from 'lucide-react'
import { PageHeader, Toggle } from '../components/ui'
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
      <PageHeader
        title="Chatbot"
        subtitle="Ask about your game in plain language"
        actions={<>
          <span className={`num text-xs ${left ? 'text-muted' : 'text-warn'}`}>{left} of {me.chats_per_day} messages left today</span>
          <button className="btn" onClick={() => setMsgs([GREETING])}><Plus size={14} />New chat</button>
        </>}
      />

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="card flex min-h-[520px] flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto p-5 lg:p-6">
            {msgs.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                {m.role === 'assistant' && <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"><Sparkles size={14} /></div>}
                <div className={`max-w-[75%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'rounded-br-md bg-accent-fill text-on-accent' : m.error ? 'rounded-bl-md bg-bad-soft text-bad' : 'rounded-bl-md bg-panel-2'}`}>{m.text}</div>
              </div>
            ))}
            {typing && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"><Sparkles size={14} /></div>
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-panel-2 px-4 py-3.5">
                  {[0, 150, 300].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${d}ms` }} />)}
                </div>
              </div>
            )}
            <div ref={bottom} />
          </div>

          {msgs.length <= 1 && (
            <div className="grid gap-2 px-5 pb-4 sm:grid-cols-2 lg:px-6">
              {suggestions.map((s) => (
                <button key={s} className="rounded-xl border border-line bg-bg px-4 py-3 text-left text-[13px] font-medium hover:border-line-strong" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          )}

          <form className="border-t border-line p-3" onSubmit={(e) => { e.preventDefault(); send(input) }}>
            <div className="flex items-center gap-2 rounded-xl border border-line bg-bg p-1.5 pl-3 focus-within:border-accent">
              <input className="min-w-0 flex-1 bg-transparent text-sm outline-none" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your players, revenue, updates, or ask for a write-up" />
              <button type="submit" className="btn btn-primary px-3" disabled={!input.trim() || typing || !left} aria-label="Send"><Send size={14} /></button>
            </div>
          </form>
        </div>

        <div className="card flex h-fit flex-col gap-5 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Use my uploaded data</div>
              <div className="text-xs text-muted">Creator Dashboard files for this game</div>
            </div>
            <Toggle checked={useData} onChange={setUseData} />
          </div>
          <div>
            <div className="label mb-2">Extra notes</div>
            <textarea
              className="input h-36 resize-none text-[13px]"
              placeholder="Anything the bot should know: what you changed last update, your goals, numbers not in the files."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <p className="text-xs text-faint">Only your own files and notes go to the AI. Nothing is shared with other developers.</p>
        </div>
      </div>
    </div>
  )
}
