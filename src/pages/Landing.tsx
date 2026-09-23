import { Link } from 'react-router-dom'
import { BarChart3, Coins, Image, MessageSquare, TrendingUp, Upload, Check } from 'lucide-react'
import { Logo, RobloxButton } from '../components/Layout'
import { useAuth } from '../lib/auth'

const features = [
  { icon: Upload, title: 'Creator Dashboard import', text: 'Export CSVs from the Roblox Creator Dashboard and drop them in. RoStats charts them and points out what matters.' },
  { icon: BarChart3, title: 'Players and retention', text: 'Visits, concurrents, retention and session time from your own exports, with week over week changes.' },
  { icon: Coins, title: 'Monetization', text: 'Robux revenue, game passes and developer products side by side, with AI notes on what is selling.' },
  { icon: TrendingUp, title: 'Market trends', text: 'Live charts from the Roblox home page: what is trending and what is up and coming right now.' },
  { icon: Image, title: 'Art generator', text: 'Cartoon or anime thumbnails, icons and vectors from your references, then see how they look between real games on the home menu.' },
  { icon: MessageSquare, title: 'Chatbot', text: 'Ask about your data, plan updates, or have it write your next Discord announcement.' },
]

const plans = [
  { name: 'Free', price: '$0', desc: 'For your first experience', items: ['1 game', '7-day data history', 'Basic dashboards', 'No AI tools'] },
  { name: 'Pro', price: '$29', desc: 'Full access to everything', items: ['Unlimited games', 'Full data history', 'Art Generator and Chatbot', '100 image credits every month', '50 AI messages per day'], featured: true },
]

const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

export default function Landing() {
  const { me } = useAuth()
  const cta = me
    ? <Link to="/app" className="btn btn-primary">Open dashboard</Link>
    : <RobloxButton />
  return (
    <div className="min-h-full">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 h-16">
        <Logo />
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted">
          <button onClick={() => jump('features')} className="hover:text-text">Features</button>
          <button onClick={() => jump('pricing')} className="hover:text-text">Pricing</button>
          <a href="https://github.com/matetheakhaladze/RoStats" className="hover:text-text">GitHub</a>
        </nav>
        <div className="flex items-center gap-2">{cta}</div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
        <span className="inline-block rounded-full border border-line bg-panel px-3 py-1 text-xs text-muted">Now in public preview</span>
        <h1 className="mt-6 text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
          Analytics built for<br />Roblox developers
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
          Upload your Creator Dashboard exports and get clear charts, plain-language insights, market trends and AI art tools in one place.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          {cta}
          <button onClick={() => jump('features')} className="btn px-5 py-2.5 text-sm">See features</button>
        </div>

        <div className="mt-16 card overflow-hidden text-left">
          <div className="flex items-center gap-1.5 border-b border-line px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-line" /><span className="h-2.5 w-2.5 rounded-full bg-line" /><span className="h-2.5 w-2.5 rounded-full bg-line" />
            <span className="ml-3 text-xs text-muted">rostats.app / overview</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line">
            {[
              ['Daily visits', '12,450', '+8.3%'],
              ['Revenue (30d)', 'R$ 452,300', '+12.5%'],
              ['D1 retention', '51%', '+3.1%'],
              ['Avg session', '42 min', '+5.2%'],
            ].map(([l, v, c]) => (
              <div key={l} className="bg-panel p-5">
                <div className="text-xs text-muted">{l}</div>
                <div className="text-2xl font-semibold mt-1">{v}</div>
                <div className="text-xs text-good mt-1">{c}</div>
              </div>
            ))}
          </div>
          <div className="p-5">
            <div className="flex items-end gap-1.5 h-32">
              {[42, 48, 45, 52, 58, 55, 61, 66, 63, 70, 74, 71, 78, 82, 80, 86, 90, 88, 94, 100].map((h, i) => (
                <div key={i} className="flex-1 rounded-sm bg-accent" style={{ height: `${h}%`, opacity: 0.45 + (i / 20) * 0.55 }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold">Everything you need to grow an experience</h2>
        <p className="mt-2 text-muted">No plugins or scripts in your game. Sign in with Roblox and upload your exports.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card p-6">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent"><f.icon size={18} /></div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold">Simple pricing</h2>
        <p className="mt-2 text-muted">Start free. Upgrade when your experience does. Extra image credits can be bought any time, from $5 for 50.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-2 max-w-3xl">
          {plans.map((p) => (
            <div key={p.name} className={`card p-6 ${p.featured ? 'border-accent' : ''}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{p.name}</h3>
                {p.featured && <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs text-accent">Popular</span>}
              </div>
              <div className="mt-4 text-3xl font-semibold">{p.price}<span className="text-sm font-normal text-muted">/mo</span></div>
              <p className="mt-1 text-sm text-muted">{p.desc}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {p.items.map((i) => <li key={i} className="flex items-center gap-2"><Check size={14} className="text-good" />{i}</li>)}
              </ul>
              <Link to="/app/billing" className={`btn mt-6 w-full justify-center ${p.featured ? 'btn-primary' : ''}`}>Choose {p.name}</Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-muted">
          <Logo size={22} />
          <span className="flex flex-wrap gap-4"><a href="privacy.html" className="hover:text-text">Privacy</a><a href="terms.html" className="hover:text-text">Terms</a><span>Not affiliated with Roblox Corporation.</span></span>
        </div>
      </footer>
    </div>
  )
}
