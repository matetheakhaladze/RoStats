import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Sparkles, Download, RefreshCw, Image as ImageIcon, Upload, X, Eye, Play, ThumbsUp, Users } from 'lucide-react'
import { PageHeader, Card, Badge, Segmented } from '../components/ui'
import { ProGate, Spinner } from '../components/data'
import { api, fileToDataUrl, fmt, type Generation, type HomeGame } from '../lib/api'
import { useAuth } from '../lib/auth'

type Format = 'Thumbnail' | 'Icon' | 'Vector'
type Style = 'Cartoon' | 'Anime'

const formats: Format[] = ['Thumbnail', 'Icon', 'Vector']
const styles: Style[] = ['Cartoon', 'Anime']

function Tile({ ratio, children }: { ratio: string; children?: ReactNode }) {
  return <div className={`${ratio} w-full rounded-lg bg-panel-2 flex items-center justify-center relative overflow-hidden`}>{children}</div>
}

function HomeMenuTest({ format, image, onClose }: { format: Format; image: string; onClose: () => void }) {
  const [games, setGames] = useState<HomeGame[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)
  const isIcon = format !== 'Thumbnail'
  const { me, gameId } = useAuth()
  const myName = me?.games.find((g) => g.universe_id === gameId)?.name ?? 'Your game'

  useEffect(() => {
    api.homeSample(isIcon ? 'icon' : 'thumbnail').then((r) => setGames(r.data)).catch((e) => setError(e.message))
  }, [isIcon])

  const [yourIndex] = useState(() => 3 + Math.floor(Math.random() * 6))
  const tiles = games
    ? [...games.slice(0, yourIndex).map((g) => ({ ...g, yours: false })),
       { universe_id: 'yours', place_id: '', name: myName, playing: 0, likes: 0, dislikes: 0, rating: null, image, yours: true },
       ...games.slice(yourIndex, 11).map((g) => ({ ...g, yours: false }))]
    : []
  const found = picked != null && tiles[picked]?.yours

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="card w-full max-w-5xl max-h-full overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold">Home menu test</h3>
            <p className="text-xs text-muted mt-0.5">Your {format.toLowerCase()} is hidden between games trending on Roblox right now. Start, find it, then reveal.</p>
          </div>
          <button className="btn px-2 py-1" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="mt-4 rounded-xl border border-line bg-[#0e0f12] p-4">
          <div className="text-sm font-semibold text-white/90 mb-3">Recommended for you</div>
          {error && <p className="text-sm text-bad">{error}</p>}
          {!games && !error && <Spinner label="Loading trending games" />}
          {games && (
            <div className={`grid gap-3 ${isIcon ? 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>
              {tiles.map((t, i) => (
                <button
                  key={i}
                  onClick={() => { if (started && picked === null) { setPicked(i); setRevealed(true) } }}
                  className={`text-left rounded-lg transition-all ${revealed && t.yours ? 'ring-2 ring-accent' : ''} ${revealed && !t.yours ? 'opacity-40' : ''} ${picked === i && !t.yours ? 'ring-2 ring-bad' : ''}`}
                >
                  <Tile ratio={isIcon ? 'aspect-square' : 'aspect-video'}>
                    {started ? <img src={t.image} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <span className="text-white/20 text-xs">?</span>}
                  </Tile>
                  <div className="mt-1.5 px-0.5">
                    <div className="text-xs font-medium text-white/90 truncate">{started ? t.name : ' '}</div>
                    {!t.yours && started && (
                      <div className="flex items-center gap-2 text-[10px] text-white/50">
                        {t.rating != null && <span className="inline-flex items-center gap-0.5"><ThumbsUp size={9} />{t.rating}%</span>}
                        <span className="inline-flex items-center gap-0.5"><Users size={9} />{fmt(t.playing)}</span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!started && <button className="btn btn-primary" onClick={() => setStarted(true)} disabled={!games}><Play size={14} />Start test</button>}
          {started && !revealed && <span className="text-sm text-muted">Click the tile you think is yours.</span>}
          {started && !revealed && <button className="btn" onClick={() => setRevealed(true)}><Eye size={14} />Reveal</button>}
          {revealed && (
            <span className={`ml-auto text-sm ${found ? 'text-good' : picked === null ? 'text-muted' : 'text-warn'}`}>
              {found ? 'Found it on the first try. It stands out.' : picked === null ? 'Revealed without guessing.' : 'Another game caught your eye first. Try brighter colors, a bigger subject or more contrast.'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ArtGenerator() {
  const { me, refresh } = useAuth()
  const [format, setFormat] = useState<Format>('Thumbnail')
  const [style, setStyle] = useState<Style>('Cartoon')
  const [changes, setChanges] = useState('')
  const [refs, setRefs] = useState<{ name: string; dataUrl: string }[]>([])
  const [count, setCount] = useState(1)
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [testImage, setTestImage] = useState<string | null>(null)
  const [history, setHistory] = useState<Generation[] | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const loadHistory = () => { api.artHistory().then((r) => setHistory(r.data)).catch(() => setHistory([])) }
  useEffect(loadHistory, [])

  if (me?.plan !== 'pro') return (<div><PageHeader title="Art Generator" /><ProGate feature="The Art Generator" /></div>)

  const credits = me.credits.total
  const ratio = format === 'Thumbnail' ? 'aspect-video' : 'aspect-square'

  const addFiles = async (files: FileList | null) => {
    if (!files) return
    const next = [...refs]
    for (const f of Array.from(files).slice(0, 4 - refs.length)) next.push({ name: f.name, dataUrl: await fileToDataUrl(f) })
    setRefs(next)
    if (fileInput.current) fileInput.current.value = ''
  }

  const generate = async () => {
    setBusy(true); setError(null); setResults([])
    const n = Math.min(count, credits)
    try {
      for (let i = 0; i < n; i++) {
        const r = await api.art({ changes, style, kind: format, images: refs.map((x) => x.dataUrl) })
        setResults((prev) => [...prev, r.image])
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
      refresh()
      loadHistory()
    }
  }

  return (
    <div>
      <PageHeader title="Art Generator" subtitle="Thumbnails, icons and vector art from your own reference images" actions={<Badge tone={credits ? 'accent' : 'warn'}>{credits} credits left</Badge>} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Reference images" subtitle="Screenshots from Studio, old thumbnails, sketches">
          <div className="space-y-2">
            {refs.map((r) => (
              <div key={r.name} className="flex items-center gap-3 rounded-lg border border-line bg-bg p-2">
                <img src={r.dataUrl} alt="" className="h-10 w-14 rounded-md object-cover" />
                <span className="text-xs flex-1 truncate">{r.name}</span>
                <button className="text-muted hover:text-text" onClick={() => setRefs(refs.filter((x) => x !== r))}><X size={14} /></button>
              </div>
            ))}
            <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
            {refs.length < 4 && (
              <button className="w-full rounded-lg border border-dashed border-line p-4 text-center text-xs text-muted hover:text-text" onClick={() => fileInput.current?.click()}>
                <Upload size={16} className="mx-auto mb-1" />Add image (up to 4, optional)
              </button>
            )}
          </div>

          <div className="mt-4">
            <div className="text-xs text-muted mb-1.5">{refs.length ? 'What to change' : 'Describe the image'}</div>
            <textarea className="input h-24 resize-none" value={changes} onChange={(e) => setChanges(e.target.value)} placeholder={refs.length ? 'Example: make the tower taller, add lava at the bottom, avatar jumping in the center' : 'Example: neon obby tower over lava, excited avatar jumping, bright sky'} />
          </div>

          <div className="mt-4 grid gap-3">
            <div>
              <div className="text-xs text-muted mb-1.5">Style</div>
              <Segmented options={styles} value={style} onChange={(v) => setStyle(v as Style)} />
            </div>
            <div>
              <div className="text-xs text-muted mb-1.5">Type</div>
              <Segmented options={formats} value={format} onChange={(v) => setFormat(v as Format)} />
            </div>
            <div>
              <div className="text-xs text-muted mb-1.5">Variants</div>
              <Segmented options={['1', '2', '4']} value={String(count)} onChange={(v) => setCount(Number(v))} />
            </div>
          </div>

          <button className="btn btn-primary mt-4 w-full justify-center" onClick={generate} disabled={busy || !changes.trim() || !credits}>
            {busy ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {busy ? `Generating ${results.length + 1} of ${Math.min(count, credits)}` : `Generate (${Math.min(count, credits)} ${Math.min(count, credits) === 1 ? 'credit' : 'credits'})`}
          </button>
          {!credits && <p className="mt-2 text-center text-xs text-warn">No credits left this month.</p>}
          {error && <p className="mt-2 text-center text-xs text-bad">{error}</p>}
        </Card>

        <Card title="Results" subtitle={results.length ? 'Download one, or test how it looks on the Roblox home menu' : 'Your images will appear here'} className="lg:col-span-2">
          <div className={`grid gap-3 ${format === 'Thumbnail' ? 'sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
            {Array.from({ length: Math.max(results.length, busy ? Math.min(count, credits) : 1) }).map((_, i) => (
              <div key={i} className="rounded-lg border border-line p-2">
                {results[i]
                  ? <img src={results[i]} alt="" className={`${ratio} w-full rounded-lg object-cover`} />
                  : <Tile ratio={ratio}><div className={`flex flex-col items-center gap-1.5 text-muted ${busy ? 'animate-pulse' : ''}`}><ImageIcon size={20} /><span className="text-[11px]">{busy ? 'Rendering' : 'Empty'}</span></div></Tile>}
                {results[i] && (
                  <div className="mt-2 flex items-center justify-end gap-1">
                    {format !== 'Vector' && <button className="btn px-2 py-1 text-xs" onClick={() => setTestImage(results[i])}><Eye size={12} />Home menu test</button>}
                    <a className="btn px-2 py-1" href={results[i]} download={`rostats-${format.toLowerCase()}-${i + 1}.png`}><Download size={12} /></a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Previous generations" subtitle="Your last 12 images">
          {!history && <Spinner />}
          {history && !history.length && <p className="text-sm text-muted">Nothing generated yet.</p>}
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {history?.map((h) => (
              <a key={h.id} href={api.artImageUrl(h.id)} target="_blank" rel="noreferrer" className="rounded-lg border border-line p-2 hover:bg-panel-2">
                <img src={api.artImageUrl(h.id)} alt="" loading="lazy" className={`${h.kind === 'Thumbnail' ? 'aspect-video' : 'aspect-square'} w-full rounded-lg object-cover bg-panel-2`} />
                <div className="mt-2 text-xs truncate" title={h.prompt}>{h.prompt}</div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted"><span>{h.style} · {h.kind}</span><span>{new Date(h.created_at).toLocaleDateString()}</span></div>
              </a>
            ))}
          </div>
        </Card>
      </div>

      {testImage && <HomeMenuTest format={format} image={testImage} onClose={() => setTestImage(null)} />}
    </div>
  )
}
