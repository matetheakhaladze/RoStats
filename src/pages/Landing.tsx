import { Link } from 'react-router-dom'
import {
  BarChart3, Coins, Image, TrendingUp, Upload, Check, ArrowRight, Trophy, Sparkles, LineChart,
} from 'lucide-react'
import { Logo, RobloxButton } from '../components/Layout'
import { useAuth } from '../lib/auth'
import { ThemeToggle } from '../lib/theme'

const features = [
  { icon: Upload, title: 'Creator Dashboard import', text: 'Export CSVs from the Roblox Creator Dashboard and drop them in. RoStats charts them and points out what matters.' },
  { icon: BarChart3, title: 'Players and retention', text: 'Visits, concurrents, retention and session time from your own exports, with week over week changes.' },
  { icon: Coins, title: 'Monetization', text: 'Robux revenue, game passes and developer products side by side, with AI notes on what is selling.' },
  { icon: TrendingUp, title: 'Rising games', text: 'Games gaining players fast right now, with an AI breakdown of why they grow and what you can copy.' },
  { icon: Trophy, title: 'Genre leaderboards', text: 'Top +1, brainrot, tsunami, obby, tycoon and more by live players, or search any keyword.' },
  { icon: Image, title: 'Art generator', text: 'Cartoon or anime thumbnails, icons and vectors from your references, then see them between real games on the home menu.' },
]

const steps = [
  { n: '1', title: 'Sign in with Roblox', text: 'One click. We only read your public profile, never your Robux or inventory.' },
  { n: '2', title: 'Add your game', text: 'Paste the game link. Live players, visits and rating show up right away.' },
  { n: '3', title: 'Upload and ask', text: 'Drop your Creator Dashboard exports, then read the insights or ask the chatbot.' },
]

const plans = [
  { name: 'Free', price: '$0', desc: 'For your first experience', items: ['1 game', 'Last 7 days of uploaded data', 'Dashboards, market trends and leaderboards', 'No AI tools'] },
  { name: 'Pro', price: '$29', desc: 'Everything, for serious studios', items: ['Unlimited games', 'Full data history', 'Art Generator, Chatbot and AI insights', '100 image credits every month', '50 AI messages per day'], featured: true },
]

const sampleBoard = [
  { name: '+1 Speed Escape', playing: '118.2K', change: '+12%' },
  { name: '+1 Loot To Forge', playing: '28.5K', change: '+31%' },
  { name: '+1 Tongue Escape', playing: '22.0K', change: '+48%' },
  { name: '+1 Monkey Escape', playing: '14.3K', change: '+6%' },
  { name: '+1 Mog Evolution', playing: '13.3K', change: '+22%' },
]

const bars = [38, 44, 41, 49, 55, 52, 58, 63, 60, 67, 72, 69, 76, 81, 78, 85, 90, 87, 93, 100]

const wrap = 'mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10'

function Preview() {
  return (
    <div className="card overflow-hidden text-left shadow-xl shadow-black/10">
      <div className="flex items-center gap-1.5 border-b border-line px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-line" /><span className="h-2.5 w-2.5 rounded-full bg-line" /><span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="ml-3 text-xs text-muted">Example dashboard</span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
        {[
          ['Daily visits', '12,450', '+8.3%'],
          ['Robux (30d)', '452,300', '+12.5%'],
          ['D1 retention', '31%', '+3.1%'],
          ['Avg session', '14 min', '+5.2%'],
        ].map(([l, v, c]) => (
          <div key={l} className="bg-panel p-4">
            <div className="text-xs text-muted">{l}</div>
            <div className="mt-1 text-xl font-semibold">{v}</div>
            <div className="mt-0.5 text-xs text-good">{c}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-px bg-line lg:grid-cols-5">
        <div className="bg-panel p-4 lg:col-span-3">
          <div className="text-xs text-muted">Concurrent players, last 20 days</div>
          <div className="mt-3 flex h-32 items-end gap-1">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 rounded-sm bg-accent" style={{ height: `${h}%`, opacity: 0.35 + (i / bars.length) * 0.65 }} />
            ))}
          </div>
        </div>
        <div className="bg-panel p-4 lg:col-span-2">
          <div className="flex items-center gap-1.5 text-xs text-muted"><Sparkles size={12} className="text-accent" />AI insight</div>
          <p className="mt-2 text-sm leading-relaxed">
            Players who finish the tutorial stay 3x longer. Day 1 retention rose after the last update, so the new starter quest is working.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  const { me } = useAuth()
  const cta = me
    ? <Link to="/app" className="btn btn-primary">Open dashboard <ArrowRight size={14} /></Link>
    : <RobloxButton />

  return (
    <div className="min-h-full bg-bg">
      {/* header */}
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
        <div className={`${wrap} flex h-16 items-center justify-between`}>
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
            <button onClick={() => jump('features')} className="hover:text-text">Features</button>
            <button onClick={() => jump('market')} className="hover:text-text">Market</button>
            <button onClick={() => jump('pricing')} className="hover:text-text">Pricing</button>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {cta}
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="dot-bg border-b border-line">
        <div className={`${wrap} grid items-center gap-12 py-16 lg:grid-cols-[1fr_1.15fr] lg:py-24`}>
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-xs text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-good" />Live Roblox data, updated every 15 minutes
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl xl:text-6xl">
              Analytics built for Roblox developers
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted">
              Upload your Creator Dashboard exports and get clear charts and plain-language insights. See which games are taking off and why, and make thumbnails that stand out.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {cta}
              <button onClick={() => jump('features')} className="btn">See features</button>
            </div>
            <ul className="mt-8 grid gap-2 text-sm text-muted sm:grid-cols-2">
              {['Free plan, no card needed', 'No scripts in your game', 'Sign in with your Roblox account', 'Delete your data any time'].map((t) => (
                <li key={t} className="flex items-center gap-2"><Check size={14} className="text-good" />{t}</li>
              ))}
            </ul>
          </div>
          <Preview />
        </div>
      </section>

      {/* strip */}
      <section className="border-b border-line bg-panel">
        <div className={`${wrap} grid grid-cols-2 gap-6 py-8 md:grid-cols-4`}>
          {[
            ['Every 15 min', 'Player counts tracked across Roblox'],
            ['12 genres', 'Leaderboards from +1 to tower defense'],
            ['CSV import', 'Straight from the Creator Dashboard'],
            ['AI analysis', 'On every fast rising game'],
          ].map(([a, b]) => (
            <div key={a}>
              <div className="text-lg font-semibold">{a}</div>
              <div className="text-sm text-muted">{b}</div>
            </div>
          ))}
        </div>
      </section>

      {/* features */}
      <section id="features" className="scroll-mt-16">
        <div className={`${wrap} py-20`}>
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight">Everything you need to grow an experience</h2>
            <p className="mt-3 text-muted">No plugins or scripts in your game. Sign in with Roblox, add your game and upload your exports.</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="card p-6">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent"><f.icon size={18} /></div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* market */}
      <section id="market" className="scroll-mt-16 border-y border-line bg-panel">
        <div className={`${wrap} grid items-center gap-12 py-20 lg:grid-cols-2`}>
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-accent"><LineChart size={16} />Market Trends</span>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Know what is taking off before everyone copies it</h2>
            <p className="mt-4 text-muted">
              RoStats watches player counts across Roblox and flags games that are climbing fast. For each one, the AI explains the hook, the trend it rides and how its title and icon win clicks, then lists what you can take from it.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {['Rising games with 24 hour player change', 'Leaderboards for +1, brainrot, tsunami, obby and more', 'Search any keyword, like "evolve" or "fishing"'].map((t) => (
                <li key={t} className="flex items-start gap-2"><Check size={16} className="mt-0.5 shrink-0 text-good" />{t}</li>
              ))}
            </ul>
          </div>
          <div className="card overflow-hidden bg-bg">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <span className="text-sm font-medium">Top "+1" games</span>
              <span className="text-xs text-muted">Example</span>
            </div>
            <table className="table w-full">
              <thead><tr><th className="w-8">#</th><th>Game</th><th className="text-right">Players</th><th className="text-right">24h</th></tr></thead>
              <tbody>
                {sampleBoard.map((g, i) => (
                  <tr key={g.name}>
                    <td className="text-muted">{i + 1}</td>
                    <td><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-md bg-panel-2" /><span className="font-medium">{g.name}</span></div></td>
                    <td className="text-right">{g.playing}</td>
                    <td className="text-right text-good">{g.change}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* how it works */}
      <section>
        <div className={`${wrap} py-20`}>
          <h2 className="text-3xl font-semibold tracking-tight">Set up in two minutes</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="card p-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">{s.n}</div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* pricing */}
      <section id="pricing" className="scroll-mt-16 border-t border-line bg-panel">
        <div className={`${wrap} grid gap-12 py-20 lg:grid-cols-[1fr_2fr]`}>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Simple pricing</h2>
            <p className="mt-3 text-muted">Start free. Upgrade when your experience does. Extra image credits can be bought any time, from $5 for 50.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {plans.map((p) => (
              <div key={p.name} className={`card flex flex-col bg-bg p-6 ${p.featured ? 'border-accent' : ''}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{p.name}</h3>
                  {p.featured && <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs text-accent">Popular</span>}
                </div>
                <div className="mt-4 text-4xl font-semibold">{p.price}<span className="text-sm font-normal text-muted">/mo</span></div>
                <p className="mt-1 text-sm text-muted">{p.desc}</p>
                <ul className="mt-6 flex-1 space-y-2 text-sm">
                  {p.items.map((i) => <li key={i} className="flex items-start gap-2"><Check size={14} className="mt-0.5 shrink-0 text-good" />{i}</li>)}
                </ul>
                <Link to="/app/billing" className={`btn mt-6 w-full justify-center ${p.featured ? 'btn-primary' : ''}`}>Choose {p.name}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* final cta */}
      <section className="border-t border-line bg-accent-soft">
        <div className={`${wrap} flex flex-col items-start justify-between gap-6 py-14 md:flex-row md:items-center`}>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Ready to see what your players do?</h2>
            <p className="mt-2 text-muted">Free to start. Takes two minutes.</p>
          </div>
          {cta}
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-line bg-bg">
        <div className={`${wrap} grid gap-8 py-10 text-sm md:grid-cols-4`}>
          <div className="md:col-span-2">
            <Logo size={24} />
            <p className="mt-3 max-w-sm text-muted">Analytics, market trends and AI tools for Roblox developers. Not affiliated with Roblox Corporation.</p>
          </div>
          <div className="space-y-2">
            <div className="font-medium">Product</div>
            <button onClick={() => jump('features')} className="block text-muted hover:text-text">Features</button>
            <button onClick={() => jump('market')} className="block text-muted hover:text-text">Market Trends</button>
            <button onClick={() => jump('pricing')} className="block text-muted hover:text-text">Pricing</button>
          </div>
          <div className="space-y-2">
            <div className="font-medium">Legal</div>
            <a href="privacy.html" className="block text-muted hover:text-text">Privacy</a>
            <a href="terms.html" className="block text-muted hover:text-text">Terms</a>
            <a href="mailto:hepakain@gmail.com" className="block text-muted hover:text-text">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function jump(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}
