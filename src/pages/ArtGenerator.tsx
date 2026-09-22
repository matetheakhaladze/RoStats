import { useState, type ReactNode } from 'react'
import { Sparkles, Download, RefreshCw, Image as ImageIcon, Upload, X, Eye, Play, Star, ThumbsUp } from 'lucide-react'
import { PageHeader, Card, Badge, Segmented } from '../components/ui'

type Format = 'Thumbnail' | 'Icon' | 'Vector'
type Style = 'Cartoon' | 'Anime'

const formats: Format[] = ['Thumbnail', 'Icon', 'Vector']
const styles: Style[] = ['Cartoon', 'Anime']

const previous = [
  { prompt: 'Make the tower taller and add lava at the bottom', style: 'Cartoon', format: 'Thumbnail', bg: '#1f2d5c', date: 'Today' },
  { prompt: 'Turn the castle into anime style, sunset sky', style: 'Anime', format: 'Thumbnail', bg: '#4a2f12', date: 'Today' },
  { prompt: 'Simplify to a flat icon of the main character', style: 'Cartoon', format: 'Icon', bg: '#0f3b3a', date: 'Yesterday' },
  { prompt: 'Boss silhouette as a clean vector logo', style: 'Cartoon', format: 'Vector', bg: '#3b1030', date: 'Yesterday' },
  { prompt: 'Add neon glow trail behind the car', style: 'Anime', format: 'Thumbnail', bg: '#1b2a4a', date: '2 days ago' },
  { prompt: 'Group shot of all pets, bright and happy', style: 'Cartoon', format: 'Thumbnail', bg: '#2a1f4d', date: '3 days ago' },
]

// Games that surround yours on the fake Roblox home page.
const neighbors = [
  { name: 'Grow a Garden', players: '1.2M', bg: '#2f5d3a' },
  { name: 'Blox Fruits', players: '640K', bg: '#3a2f6e' },
  { name: 'Adopt Me!', players: '210K', bg: '#7a3f6a' },
  { name: 'Brookhaven RP', players: '480K', bg: '#3f6a7a' },
  { name: 'Rivals', players: '155K', bg: '#7a4a3f' },
  { name: 'Dress to Impress', players: '390K', bg: '#7a3f5a' },
  { name: '99 Nights in the Forest', players: '270K', bg: '#2f4f3a' },
  { name: 'Fisch', players: '120K', bg: '#2f4f6e' },
  { name: 'Murder Mystery 2', players: '88K', bg: '#5a2f2f' },
  { name: 'Pet Simulator 99', players: '140K', bg: '#6e5a2f' },
  { name: 'Doors', players: '95K', bg: '#2a2a2a' },
]

function Art({ bg, label, ratio = 'aspect-video', children }: { bg: string; label?: string; ratio?: string; children?: ReactNode }) {
  return (
    <div className={`${ratio} w-full rounded-lg flex items-center justify-center relative overflow-hidden`} style={{ background: bg }}>
      {children ?? (
        <div className="flex flex-col items-center gap-1.5 text-white/70">
          <ImageIcon size={20} />
          {label && <span className="text-[11px]">{label}</span>}
        </div>
      )}
    </div>
  )
}

function HomeMenuTest({ format, onClose }: { format: Format; onClose: () => void }) {
  const [revealed, setRevealed] = useState(false)
  const [started, setStarted] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)
  const yourIndex = 6

  const isIcon = format !== 'Thumbnail'
  const tiles = neighbors.slice(0, yourIndex).map((n) => ({ ...n, yours: false }))
    .concat([{ name: 'Tower Escape Simulator', players: '4.8K', bg: '#1f2d5c', yours: true }])
    .concat(neighbors.slice(yourIndex).map((n) => ({ ...n, yours: false })))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="card w-full max-w-5xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold">Home menu test</h3>
            <p className="text-xs text-muted mt-0.5">Your {format.toLowerCase()} is hidden between real games on a Roblox home page. Find it, then reveal to see how it stands out.</p>
          </div>
          <button className="btn px-2 py-1" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="mt-4 rounded-xl border border-line bg-[#0e0f12] p-4">
          <div className="flex items-center gap-3 text-xs text-white/60 mb-3">
            <span className="font-semibold text-white/90 text-sm">Recommended for you</span>
            <span className="ml-auto">Sort by: Relevance</span>
          </div>
          <div className={`grid gap-3 ${isIcon ? 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-8' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>
            {tiles.map((t, i) => (
              <button
                key={i}
                onClick={() => { if (started && picked === null) { setPicked(i); setRevealed(true) } }}
                className={`text-left rounded-lg transition-all ${revealed && t.yours ? 'ring-2 ring-accent' : ''} ${revealed && !t.yours ? 'opacity-40' : ''} ${picked === i && !t.yours ? 'ring-2 ring-bad' : ''}`}
              >
                <Art bg={started ? t.bg : '#1a1c22'} ratio={isIcon ? 'aspect-square' : 'aspect-video'}>
                  {started ? (
                    <div className="absolute inset-0 flex items-end p-2">
                      <span className="text-[10px] font-medium text-white/80 drop-shadow">{revealed && t.yours ? `Your ${format.toLowerCase()}` : ''}</span>
                    </div>
                  ) : <span className="text-white/20 text-xs">?</span>}
                </Art>
                <div className="mt-1.5 px-0.5">
                  <div className="text-xs font-medium text-white/90 truncate">{started ? t.name : 'Loading...'}</div>
                  <div className="flex items-center gap-2 text-[10px] text-white/50"><span className="inline-flex items-center gap-0.5"><ThumbsUp size={9} />{90 - (i % 7)}%</span><span>{started ? t.players : ''} playing</span></div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!started && <button className="btn btn-primary" onClick={() => setStarted(true)}><Play size={14} />Start test</button>}
          {started && !revealed && <span className="text-sm text-muted">Click the tile you think is yours.</span>}
          {started && <button className="btn" onClick={() => setRevealed(true)}><Eye size={14} />Reveal</button>}
          {revealed && (
            <span className={`ml-auto text-sm ${picked === yourIndex ? 'text-good' : picked === null ? 'text-muted' : 'text-warn'}`}>
              {picked === yourIndex ? 'Found it on the first try. It stands out.' : picked === null ? 'Revealed without guessing.' : 'You picked another game first. Consider brighter colors or a clearer focal point.'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ArtGenerator() {
  const [format, setFormat] = useState<Format>('Thumbnail')
  const [style, setStyle] = useState<Style>('Cartoon')
  const [changes, setChanges] = useState('Make the tower taller, add lava at the bottom and put the avatar in the center jumping')
  const [refs, setRefs] = useState<string[]>(['Studio screenshot.png'])
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [test, setTest] = useState(false)

  const ratio = format === 'Thumbnail' ? 'aspect-video' : 'aspect-square'
  const generate = () => { setBusy(true); setDone(false); setTimeout(() => { setBusy(false); setDone(true) }, 1400) }

  return (
    <div>
      <PageHeader title="Art Generator" subtitle="Thumbnails, icons and vector art from your own reference images" actions={<Badge tone="accent">62 credits left</Badge>} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Reference images" subtitle="Screenshots from Studio, old thumbnails, sketches">
          <div className="space-y-2">
            {refs.map((r) => (
              <div key={r} className="flex items-center gap-3 rounded-lg border border-line bg-bg p-2">
                <div className="h-10 w-14 rounded-md bg-[#1f2d5c] flex items-center justify-center text-white/60"><ImageIcon size={14} /></div>
                <span className="text-xs flex-1 truncate">{r}</span>
                <button className="text-muted hover:text-text" onClick={() => setRefs(refs.filter((x) => x !== r))}><X size={14} /></button>
              </div>
            ))}
            <button className="w-full rounded-lg border border-dashed border-line p-4 text-center text-xs text-muted hover:text-text" onClick={() => setRefs([...refs, `Reference ${refs.length + 1}.png`])}>
              <Upload size={16} className="mx-auto mb-1" />Add image (up to 4)
            </button>
          </div>

          <div className="mt-4">
            <div className="text-xs text-muted mb-1.5">What to change</div>
            <textarea className="input h-24 resize-none" value={changes} onChange={(e) => setChanges(e.target.value)} placeholder="Describe what should be different from the reference" />
          </div>

          <div className="mt-4 grid gap-3">
            <div>
              <div className="text-xs text-muted mb-1.5">Style</div>
              <Segmented options={styles} value={style} onChange={(v) => setStyle(v as Style)} />
            </div>
            <div>
              <div className="text-xs text-muted mb-1.5">Type</div>
              <Segmented options={formats} value={format} onChange={(v) => setFormat(v as Format)} />
              <div className="text-[11px] text-muted mt-1">{format === 'Thumbnail' ? '1920 x 1080, shown on the game page and home menu' : format === 'Icon' ? '512 x 512, shown in search and the home menu' : 'SVG logo or badge for your UI and social posts'}</div>
            </div>
          </div>

          <button className="btn btn-primary mt-4 w-full justify-center" onClick={generate} disabled={busy || refs.length === 0}>
            {busy ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {busy ? 'Generating 4 variants' : 'Generate 4 variants'}
          </button>
          <p className="mt-2 text-center text-[11px] text-muted">Uses 4 credits</p>
        </Card>

        <Card title="Results" subtitle={done ? 'Download one, or test how it looks on the home menu' : 'Your variants will appear here'} className="lg:col-span-2">
          <div className={`grid gap-3 ${format === 'Thumbnail' ? 'sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
            {['#1f2d5c', '#2b1d4d', '#0f3b3a', '#4a2f12'].map((bg, i) => (
              <div key={i} className={`rounded-lg border border-line p-2 ${busy ? 'animate-pulse' : ''}`}>
                <Art bg={done ? bg : '#171e30'} ratio={ratio} label={done ? `Variant ${'ABCD'[i]}` : busy ? 'Rendering' : 'Empty'} />
                <div className="mt-2 flex items-center justify-between gap-1">
                  <span className="text-[11px] text-muted truncate">{style} · {format}</span>
                  <div className="flex gap-1 shrink-0">
                    <button className="btn px-2 py-1" title="Favorite"><Star size={12} /></button>
                    <button className="btn px-2 py-1" title="Download"><Download size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-bg p-3">
            <div className="text-sm">
              <div className="font-medium">Home menu test</div>
              <div className="text-xs text-muted">Hide the {format.toLowerCase()} between other games on a Roblox home page and see if it catches your eye.</div>
            </div>
            <button className="btn ml-auto" onClick={() => setTest(true)} disabled={format === 'Vector'}><Eye size={14} />{format === 'Vector' ? 'Not for vectors' : 'Run test'}</button>
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Previous generations">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {previous.map((h, i) => (
              <div key={i} className="rounded-lg border border-line p-2">
                <Art bg={h.bg} ratio={h.format === 'Thumbnail' ? 'aspect-video' : 'aspect-square'} label={h.format} />
                <div className="mt-2 text-xs truncate" title={h.prompt}>{h.prompt}</div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted"><span>{h.style}</span><span>{h.date}</span></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {test && <HomeMenuTest format={format} onClose={() => setTest(false)} />}
    </div>
  )
}
