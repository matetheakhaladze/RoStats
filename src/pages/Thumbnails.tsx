import { useState } from 'react'
import { Sparkles, Download, RefreshCw, Image as ImageIcon } from 'lucide-react'
import { PageHeader, Card, Badge, Segmented } from '../components/ui'

const styles = ['Cartoon', 'Realistic', 'Anime', 'Low poly']
const sizes = ['16:9 Thumbnail', '1:1 Icon']

const history = [
  { prompt: 'Neon obby tower with lava, excited avatar jumping', ctr: 9.4, variant: 'A', bg: '#1f2d5c' },
  { prompt: 'Kingdom tycoon castle at sunset with gold coins', ctr: 7.1, variant: 'B', bg: '#4a2f12' },
  { prompt: 'Racing car drifting through neon city', ctr: 8.2, variant: 'A', bg: '#0f3b3a' },
  { prompt: 'Boss fight arena, dramatic lighting', ctr: 11.3, variant: 'C', bg: '#3b1030' },
]

function Placeholder({ bg, label }: { bg: string; label: string }) {
  return (
    <div className="aspect-video w-full rounded-lg flex items-center justify-center" style={{ background: bg }}>
      <div className="flex flex-col items-center gap-2 text-white/70">
        <ImageIcon size={22} />
        <span className="text-xs">{label}</span>
      </div>
    </div>
  )
}

export default function Thumbnails() {
  const [prompt, setPrompt] = useState('Neon obby tower with lava, excited avatar jumping, bright colors')
  const [style, setStyle] = useState('Cartoon')
  const [size, setSize] = useState('16:9 Thumbnail')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const generate = () => {
    setBusy(true)
    setDone(false)
    setTimeout(() => { setBusy(false); setDone(true) }, 1400)
  }

  return (
    <div>
      <PageHeader title="Thumbnail Generator" subtitle="Generate, compare and A/B test thumbnails and icons" actions={<Badge tone="accent">38 credits left</Badge>} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Prompt" subtitle="Describe the scene, the mood and the main character">
          <textarea className="input h-28 resize-none" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <div className="mt-4 space-y-3">
            <div>
              <div className="text-xs text-muted mb-1.5">Style</div>
              <Segmented options={styles} value={style} onChange={setStyle} />
            </div>
            <div>
              <div className="text-xs text-muted mb-1.5">Format</div>
              <Segmented options={sizes} value={size} onChange={setSize} />
            </div>
            <div>
              <div className="text-xs text-muted mb-1.5">Reference</div>
              <div className="rounded-lg border border-dashed border-line p-4 text-center text-xs text-muted">Drop a screenshot from Studio to keep the same map and colors</div>
            </div>
          </div>
          <button className="btn btn-primary mt-4 w-full justify-center" onClick={generate} disabled={busy}>
            {busy ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {busy ? 'Generating 4 variants' : 'Generate 4 variants'}
          </button>
          <p className="mt-2 text-center text-[11px] text-muted">Uses 4 credits. About 20 seconds.</p>
        </Card>

        <Card title="Results" subtitle={done ? 'Pick a winner or send both to an A/B test' : 'Your variants will appear here'} className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {['#1f2d5c', '#2b1d4d', '#0f3b3a', '#4a2f12'].map((bg, i) => (
              <div key={i} className={`rounded-lg border border-line p-2 ${busy ? 'animate-pulse' : ''}`}>
                <Placeholder bg={done ? bg : '#171e30'} label={done ? `Variant ${'ABCD'[i]}` : busy ? 'Rendering' : 'Empty'} />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-muted">{style} · {size}</span>
                  <div className="flex gap-1">
                    <button className="btn px-2 py-1"><Download size={12} /></button>
                    <button className="btn px-2 py-1 text-xs">A/B test</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Previous generations" subtitle="Click-through rate measured on the game page">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {history.map((h) => (
              <div key={h.prompt} className="rounded-lg border border-line p-2">
                <Placeholder bg={h.bg} label={`Variant ${h.variant}`} />
                <div className="mt-2 text-xs truncate">{h.prompt}</div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-muted">CTR</span>
                  <span className={h.ctr >= 9 ? 'text-good font-medium' : 'text-text'}>{h.ctr}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
