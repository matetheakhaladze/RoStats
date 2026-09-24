import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Sparkles, Download, RefreshCw, Image as ImageIcon, X, Eye, Play, ThumbsUp, Users, Plus } from 'lucide-react'
import { PageHeader } from '../components/ui'
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

const STYLE_INFO: Record<Style, string> = { Cartoon: 'Bold outlines, bright color', Anime: 'Cel shading, dynamic poses' }
const FORMAT_INFO: Record<Format, { sub: string; box: string }> = {
  Thumbnail: { sub: '16:9', box: 'h-3.5 w-6' },
  Icon: { sub: '1:1', box: 'h-5 w-5' },
  Vector: { sub: 'clear bg', box: 'h-5 w-5 border-dashed' },
}
const CHIPS = ['Big bold title space', 'Shocked face', 'Before and after', 'Bright sky', 'Close-up character']

function OptionCard({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-w-0 flex-1 flex-col rounded-xl border p-3 text-left transition-colors ${on ? 'border-accent bg-accent-soft/60' : 'border-line bg-bg hover:border-line-strong'}`}
    >
      {children}
    </button>
  )
}

export default function ArtGenerator() {
  const { me, refresh, gameId } = useAuth()
  const [format, setFormat] = useState<Format>('Thumbnail')
  const [style, setStyle] = useState<Style>('Cartoon')
  const [changes, setChanges] = useState('')
  const [refs, setRefs] = useState<{ name: string; dataUrl: string }[]>([])
  const [count, setCount] = useState(2)
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<string[]>([])
  const [selected, setSelected] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [testImage, setTestImage] = useState<string | null>(null)
  const [history, setHistory] = useState<Generation[] | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const loadHistory = () => { api.artHistory().then((r) => setHistory(r.data)).catch(() => setHistory([])) }
  useEffect(loadHistory, [])

  if (me?.plan !== 'pro') return (<div><PageHeader title="Art Generator" subtitle="Thumbnails, icons and vectors for your game" /><ProGate feature="The Art Generator" /></div>)

  const credits = me.credits.total
  const n = Math.min(count, credits)
  const ratio = format === 'Thumbnail' ? 'aspect-video' : 'aspect-square'
  const current = results[selected]
  const game = me.games.find((g) => g.universe_id === gameId)?.name

  const addFiles = async (files: FileList | null) => {
    if (!files) return
    const next = [...refs]
    for (const f of Array.from(files).slice(0, 4 - refs.length)) next.push({ name: f.name, dataUrl: await fileToDataUrl(f) })
    setRefs(next)
    if (fileInput.current) fileInput.current.value = ''
  }

  const generate = async () => {
    setBusy(true); setError(null); setResults([]); setSelected(0)
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

  const addChip = (c: string) => setChanges((t) => (t.trim() ? `${t.trim().replace(/[,.]$/, '')}, ${c.toLowerCase()}` : c))

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:grid-rows-[auto_1fr]">
      <PageHeader
        title="Art Generator"
        subtitle={`Thumbnails, icons and vectors${game ? ` for ${game}` : ''}`}
        actions={<>
          {current && format !== 'Vector' && <button className="btn" onClick={() => setTestImage(current)}><Eye size={14} />Home menu test</button>}
          {current && <a className="btn" href={current} download={`rostats-${format.toLowerCase()}-${selected + 1}.png`}><Download size={14} />Download</a>}
        </>}
      />

      <div className="min-w-0 space-y-5">
        <div className={`${ratio} ${format === 'Thumbnail' ? 'w-full' : 'mx-auto w-full max-w-[560px]'} relative overflow-hidden rounded-2xl border border-line bg-panel dot-bg`}>
          {current
            ? <img src={current} alt="Generated image" className="absolute inset-0 h-full w-full object-cover" />
            : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
                {busy ? <RefreshCw size={24} className="animate-spin text-accent" /> : <ImageIcon size={26} className="text-faint" />}
                <div className="text-sm font-semibold">{busy ? `Rendering ${results.length + 1} of ${n}` : 'Your image appears here'}</div>
                {!busy && <div className="max-w-sm text-[13px] text-muted">Describe what you want on the right, pick a style and a format, then generate. Each image uses 1 credit.</div>}
              </div>
            )}
          {current && <span className="absolute bottom-3 left-3 rounded-lg bg-black/70 px-2.5 py-1 text-xs font-semibold text-white">{style} · {format}</span>}
        </div>

        {(results.length > 1 || (busy && n > 1)) && (
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: Math.max(results.length, busy ? n : 0) }).map((_, i) => (
              <button
                key={i}
                onClick={() => results[i] && setSelected(i)}
                className={`${format === 'Thumbnail' ? 'w-44' : 'w-28'} rounded-xl border p-1 ${i === selected ? 'border-accent' : 'border-line hover:border-line-strong'}`}
              >
                {results[i]
                  ? <img src={results[i]} alt="" className={`${ratio} w-full rounded-lg object-cover`} />
                  : <div className={`${ratio} w-full animate-pulse rounded-lg bg-panel-2`} />}
              </button>
            ))}
          </div>
        )}

        {current && format !== 'Vector' && (
          <button onClick={() => setTestImage(current)} className="flex w-full items-start gap-3 rounded-xl border border-line bg-panel p-4 text-left hover:border-line-strong">
            <Eye size={16} className="mt-0.5 shrink-0 text-accent" />
            <span>
              <span className="block text-sm font-semibold">Will it stand out on the home menu?</span>
              <span className="block text-[13px] text-muted">Hide it between games trending on Roblox right now and see if you can spot it first.</span>
            </span>
          </button>
        )}

      </div>

      <aside className="card flex h-fit flex-col xl:sticky xl:top-0 xl:row-span-2">
        <div className="space-y-5 p-5">
          <div>
            <div className="label mb-2">Prompt</div>
            <textarea
              className="input h-28 resize-none text-sm leading-relaxed"
              value={changes}
              onChange={(e) => setChanges(e.target.value)}
              placeholder={refs.length ? 'What to change. Example: make the tower taller, add lava at the bottom' : 'Example: a noob at level 1 next to a buff pro at level 99, bright sky'}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CHIPS.map((c) => (
                <button key={c} onClick={() => addChip(c)} className="rounded-full border border-line px-2.5 py-1 text-xs text-muted hover:border-line-strong hover:text-text">+ {c}</button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between"><span className="label">Reference images</span><span className="text-xs text-faint">{refs.length} of 4</span></div>
            <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
            <div className="grid grid-cols-4 gap-2">
              {refs.map((r) => (
                <div key={r.name} className="relative">
                  <img src={r.dataUrl} alt={r.name} className="aspect-square w-full rounded-lg object-cover" />
                  <button onClick={() => setRefs(refs.filter((x) => x !== r))} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-panel text-muted hover:text-text" aria-label="Remove image"><X size={11} /></button>
                </div>
              ))}
              {refs.length < 4 && (
                <button onClick={() => fileInput.current?.click()} className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-line-strong text-muted hover:text-text" aria-label="Add reference image"><Plus size={18} /></button>
              )}
            </div>
            {!refs.length && <p className="mt-2 text-xs text-faint">Optional. Studio screenshots or an old thumbnail work best.</p>}
          </div>

          <div>
            <div className="label mb-2">Style</div>
            <div className="flex gap-2">
              {styles.map((st) => (
                <OptionCard key={st} on={style === st} onClick={() => setStyle(st)}>
                  <span className="text-sm font-semibold">{st}</span>
                  <span className="mt-0.5 text-xs text-muted">{STYLE_INFO[st]}</span>
                </OptionCard>
              ))}
            </div>
          </div>

          <div>
            <div className="label mb-2">Format</div>
            <div className="flex gap-2">
              {formats.map((f) => (
                <OptionCard key={f} on={format === f} onClick={() => { setFormat(f); setResults([]) }}>
                  <span className="flex h-6 items-center"><span className={`${FORMAT_INFO[f].box} rounded-[4px] border-[1.5px] ${format === f ? 'border-accent' : 'border-muted'}`} /></span>
                  <span className="mt-1.5 text-sm font-semibold">{f}</span>
                  <span className="text-xs text-muted">{FORMAT_INFO[f].sub}</span>
                </OptionCard>
              ))}
            </div>
          </div>

          <div>
            <div className="label mb-2">Variants</div>
            <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-bg p-1">
              {[1, 2, 4].map((v) => (
                <button key={v} onClick={() => setCount(v)} className={`rounded-lg py-1.5 text-sm font-semibold ${count === v ? 'bg-panel-2 text-text' : 'text-muted hover:text-text'}`}>{v}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-line p-5">
          <button className="btn btn-primary w-full justify-center py-3 text-sm" onClick={generate} disabled={busy || !changes.trim() || !credits}>
            {busy ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {busy ? `Generating ${results.length + 1} of ${n}` : `Generate ${n} ${n === 1 ? 'image' : 'images'}`}
          </button>
          <div className="mt-2 flex justify-between text-xs text-muted">
            <span>Uses {n} {n === 1 ? 'credit' : 'credits'}</span>
            <span className="num">{credits} left</span>
          </div>
          {!credits && <p className="mt-2 text-xs text-warn">No credits left this month. Buy a credit pack on the Subscription page.</p>}
          {error && <p className="mt-2 text-xs text-bad">{error}</p>}
        </div>
      </aside>

      <section className="min-w-0">
        <div className="mb-3 flex items-baseline gap-2">
          <h2 className="text-[15px] font-semibold tracking-tight">History</h2>
          <span className="text-xs text-muted">Last 12 images</span>
        </div>
        {!history && <Spinner />}
        {history && !history.length && <p className="text-sm text-muted">Nothing generated yet.</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6">
          {history?.map((h) => (
            <a key={h.id} href={api.artImageUrl(h.id)} target="_blank" rel="noreferrer" className="group min-w-0">
              <img src={api.artImageUrl(h.id)} alt="" loading="lazy" className={`${h.kind === 'Thumbnail' ? 'aspect-video' : 'aspect-square'} w-full rounded-xl border border-line bg-panel-2 object-cover group-hover:border-line-strong`} />
              <div className="mt-1.5 truncate text-xs text-muted" title={h.prompt}>{h.prompt}</div>
            </a>
          ))}
        </div>
      </section>

      {testImage && <HomeMenuTest format={format} image={testImage} onClose={() => setTestImage(null)} />}
    </div>
  )
}
