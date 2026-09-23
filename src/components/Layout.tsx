import { useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import {
  LayoutDashboard, Users, Coins, TrendingUp, Image, MessageSquare, Upload,
  Settings, CreditCard, Menu, X, ChevronDown, LogOut, Plus,
} from 'lucide-react'
import logoUrl from '../assets/logo.png'
import { useAuth } from '../lib/auth'
import { loginUrl } from '../lib/api'
import { Spinner } from './data'
import { ThemeToggle } from '../lib/theme'

const nav = [
  { section: 'Analytics', items: [
    { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/app/players', label: 'Players', icon: Users },
    { to: '/app/monetization', label: 'Monetization', icon: Coins },
    { to: '/app/market', label: 'Market Trends', icon: TrendingUp },
    { to: '/app/data', label: 'Import data', icon: Upload },
  ]},
  { section: 'AI Tools', items: [
    { to: '/app/art', label: 'Art Generator', icon: Image },
    { to: '/app/chatbot', label: 'Chatbot', icon: MessageSquare },
  ]},
  { section: 'Account', items: [
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

export function RobloxButton({ className = '' }: { className?: string }) {
  return <a href={loginUrl()} className={`btn btn-primary justify-center ${className}`}>Sign in with Roblox</a>
}

function SignIn() {
  const { error } = useAuth()
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="card w-full max-w-sm p-8 text-center">
        <div className="flex justify-center"><Logo size={36} /></div>
        <h1 className="mt-6 text-xl font-semibold">Sign in to RoStats</h1>
        <p className="mt-2 text-sm text-muted">Use your Roblox account. We only read your public profile: name and avatar.</p>
        <RobloxButton className="mt-6 w-full" />
        {error && <p className="mt-4 text-xs text-bad">{error}</p>}
        <Link to="/" className="mt-6 inline-block text-xs text-muted hover:text-text">Back to home</Link>
      </div>
    </div>
  )
}

export default function Layout() {
  const { me, loading, signOut, gameId, setGameId } = useAuth()
  const [open, setOpen] = useState(false)
  const [pick, setPick] = useState(false)

  if (loading) return <div className="flex h-full items-center justify-center"><Spinner /></div>
  if (!me) return <SignIn />

  const game = me.games.find((g) => g.universe_id === gameId)
  const credits = me.credits.total

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
          <div className="text-xs text-muted">{me.plan === 'pro' ? 'Pro plan' : 'Free plan'}</div>
          <div className="text-sm font-medium mt-0.5">{me.plan === 'pro' ? `${credits} credits left` : 'AI tools locked'}</div>
          <Link to="/app/billing" className="text-xs text-accent mt-1 inline-block">{me.plan === 'pro' ? 'Manage plan' : 'Upgrade'}</Link>
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
              <span className={`h-2 w-2 rounded-full ${game ? 'bg-good' : 'bg-line'}`} />
              <span className="max-w-[180px] truncate">{game ? game.name : 'No game added'}</span>
              <ChevronDown size={14} className="text-muted" />
            </button>
            {pick && (
              <div className="absolute left-0 mt-2 w-64 card p-1 z-30">
                {me.games.map((g) => (
                  <button
                    key={g.universe_id}
                    onClick={() => { setGameId(g.universe_id); setPick(false) }}
                    className={`flex w-full items-center rounded-md px-3 py-2 text-left text-sm hover:bg-panel-2 ${g.universe_id === gameId ? 'text-accent' : ''}`}
                  >
                    <span className="truncate">{g.name}</span>
                  </button>
                ))}
                <Link to="/app/settings" onClick={() => setPick(false)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted hover:bg-panel-2 hover:text-text">
                  <Plus size={14} />Add a game
                </Link>
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden sm:block text-right">
              <div className="text-sm font-medium leading-tight">{me.display_name || me.name}</div>
              <div className="text-xs text-muted leading-tight">@{me.name}</div>
            </div>
            {me.picture
              ? <img src={me.picture} alt="" className="h-8 w-8 rounded-full bg-panel-2" />
              : <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-white">{me.name.slice(0, 2).toUpperCase()}</div>}
            <button className="btn px-2" title="Sign out" onClick={signOut}><LogOut size={14} /></button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
