import { Link } from 'react-router-dom'
import { BarChart3, Coins, Image, MessageSquare, Route, Server, Check } from 'lucide-react'
import { Logo } from '../components/Layout'

const features = [
  { icon: BarChart3, title: 'Player analytics', text: 'Retention cohorts, session length, demographics and device split for every experience you own.' },
  { icon: Server, title: 'Live server health', text: 'CPU, memory, ping and FPS per server with crash logs pulled straight from your scripts.' },
  { icon: Coins, title: 'Monetization insights', text: 'Revenue by product, purchase funnels, ARPPU and LTV so you know exactly what sells.' },
  { icon: Route, title: 'User journey maps', text: 'See where players drop off between the tutorial, the lobby and the first purchase.' },
  { icon: Image, title: 'AI thumbnail generator', text: 'Generate and A/B test thumbnails and icons that match the styles trending on the platform.' },
  { icon: MessageSquare, title: 'In-game chatbot analytics', text: 'Track what players ask your support bot, sentiment, and resolution rate.' },
]

const plans = [
  { name: 'Free', price: '$0', desc: 'For your first experience', items: ['1 game', '7-day data history', 'Basic dashboards'] },
  { name: 'Pro', price: '$29', desc: 'For growing studios', items: ['10 games', '1-year history', 'AI tools', 'Scheduled reports'], featured: true },
  { name: 'Studio', price: '$99', desc: 'For teams shipping at scale', items: ['Unlimited games', 'Unlimited history', 'Team seats', 'API access'] },
]

export default function Landing() {
  return (
    <div className="min-h-full">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 h-16">
        <Logo />
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted">
          <a href="#features" className="hover:text-text">Features</a>
          <a href="#pricing" className="hover:text-text">Pricing</a>
          <a href="https://github.com/matetheakhaladze/RoStats" className="hover:text-text">GitHub</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/app" className="btn">Sign in</Link>
          <Link to="/app" className="btn btn-primary">Open dashboard</Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
        <span className="inline-block rounded-full border border-line bg-panel px-3 py-1 text-xs text-muted">Now in public preview</span>
        <h1 className="mt-6 text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
          Analytics built for<br />Roblox developers
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
          RoStats turns your experience data into decisions. Player retention, server health, monetization and AI creative tools in one dashboard.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/app" className="btn btn-primary px-5 py-2.5 text-sm">Try the live demo</Link>
          <a href="#features" className="btn px-5 py-2.5 text-sm">See features</a>
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
        <p className="mt-2 text-muted">Replace spreadsheets and guesswork with a dashboard that understands Roblox.</p>
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
        <p className="mt-2 text-muted">Start free. Upgrade when your experience does.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
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
          <span>Built for the Roblox developer community. Not affiliated with Roblox Corporation.</span>
        </div>
      </footer>
    </div>
  )
}
