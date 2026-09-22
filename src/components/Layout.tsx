import { useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import {
  LayoutDashboard, Users, Activity, Coins, TrendingUp, Image, MessageSquare,
  Settings, CreditCard, FileText, Route, Search, Bell, Menu, X, ChevronDown,
} from 'lucide-react'
import { games } from '../data/mock'
import logoUrl from '../assets/logo.png'

const nav = [
  { section: 'Analytics', items: [
    { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/app/players', label: 'Player Analytics', icon: Users },
    { to: '/app/performance', label: 'Game Performance', icon: Activity },
    { to: '/app/monetization', label: 'Monetization', icon: Coins },
    { to: '/app/market', label: 'Market Trends', icon: TrendingUp },
    { to: '/app/journey', label: 'User Journey', icon: Route },
  ]},
  { section: 'AI Tools', items: [
    { to: '/app/art', label: 'Art Generator', icon: Image },
    { to: '/app/chatbot', label: 'Chatbot', icon: MessageSquare },
  ]},
  { section: 'Account', items: [
    { to: '/app/reports', label: 'Reports & Export', icon: FileText },
    { to: '/app/billing', label: 'Subscription', icon: CreditCard },
    { to: '/app/settings', label: 'Settings', icon: Settings },
  ]},
]

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold">
      <img src={logoUrl} width={size} height={size} alt="" />
      RoStats
    </span>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  const [game, setGame] = useState(games[0])
  const [pick, setPick] = useState(false)

  const sidebar = (
    <aside className="flex h-full w-64 flex-col border-r border-line bg-panel">
      <div className="flex items-center justify-between px-5 h-16 border-b border-line">
        <Link to="/"><Logo /></Link>
        <button className="lg:hidden text-muted" onClick={() => setOpen(false)}><X size={18} /></button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {nav.map((g) => (
          <div key={g.section}>
            <div className="px-3 mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">{g.section}</div>
            <div className="space-y-0.5">
              {g.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-panel-2 hover:text-text'
                    }`
                  }
                >
                  <it.icon size={16} />
                  {it.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-line p-4">
        <div className="card p-3 bg-panel-2">
          <div className="text-xs text-muted">Pro plan</div>
          <div className="text-sm font-medium mt-0.5">62 credits left</div>
          <Link to="/app/billing" className="text-xs text-accent mt-1 inline-block">Manage plan</Link>
        </div>
      </div>
    </aside>
  )

  return (
    <div className="flex h-full">
      <div className="hidden lg:block">{sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-line bg-panel px-4 lg:px-6">
          <button className="lg:hidden text-muted" onClick={() => setOpen(true)}><Menu size={20} /></button>

          <div className="relative">
            <button className="btn" onClick={() => setPick((p) => !p)}>
              <span className="h-2 w-2 rounded-full bg-good" />
              <span className="max-w-[160px] truncate">{game.name}</span>
              <ChevronDown size={14} className="text-muted" />
            </button>
            {pick && (
              <div className="absolute left-0 mt-2 w-64 card p-1 z-30">
                {games.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => { setGame(g); setPick(false) }}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-panel-2"
                  >
                    <span>{g.name}</span>
                    <span className="text-xs text-muted">{g.players.toLocaleString()} CCU</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="ml-auto hidden md:flex items-center gap-2 rounded-lg border border-line bg-bg px-3 py-2 w-72">
            <Search size={14} className="text-muted" />
            <input className="bg-transparent text-sm outline-none flex-1 placeholder:text-muted" placeholder="Search metrics, players, servers" />
          </div>
          <button className="btn relative"><Bell size={16} /><span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-bad" /></button>
          <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold">MA</div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
