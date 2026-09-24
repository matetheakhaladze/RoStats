import { useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import {
  LayoutDashboard, Users, Coins, TrendingUp, Image, MessageSquare, Upload,
  Settings, CreditCard, Menu, X, ChevronDown, LogOut, Plus, FileText, Kanban, UsersRound, Sparkles,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { loginUrl } from '../lib/api'
import { Spinner } from './data'
import { ThemeToggle } from '../lib/theme'
import { HeaderSlot } from './ui'

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
  { section: 'Workspace', items: [
    { to: '/app/reports', label: 'Reports', icon: FileText },
    { to: '/app/tasks', label: 'Tasks', icon: Kanban },
    { to: '/app/teams', label: 'Teams', icon: UsersRound },
  ]},
]

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--accent-fill)" />
      <rect x="7" y="17" width="4" height="8" rx="1.2" fill="var(--on-accent)" />
      <rect x="14" y="12" width="4" height="13" rx="1.2" fill="var(--on-accent)" />
      <rect x="21" y="7" width="4" height="18" rx="1.2" fill="var(--on-accent)" />
    </svg>
  )
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold">
      <LogoMark size={size} />
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

function initials(name: string) {
  const w = name.replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/)
  return ((w[0]?.[0] ?? '?') + (w[1]?.[0] ?? w[0]?.[1] ?? '')).toUpperCase()
}

function GameSwitcher({ onPick }: { onPick: () => void }) {
  const { me, gameId, setGameId } = useAuth()
  const [open, setOpen] = useState(false)
  if (!me) return null
  const game = me.games.find((g) => g.universe_id === gameId)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-bg px-2.5 py-2 text-left hover:border-line-strong"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[11px] font-bold text-accent">
          {game ? initials(game.name) : <Plus size={14} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold">{game ? game.name : 'No game yet'}</span>
          <span className="block truncate text-[11px] text-muted">{game ? (game.shared_by ? `Shared by ${game.shared_by}` : 'Your game') : 'Add one to start'}</span>
        </span>
        <ChevronDown size={14} className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="card absolute left-0 right-0 z-30 mt-1.5 p-1 shadow-xl">
            {me.games.map((g) => (
              <button
                key={g.universe_id}
                onClick={() => { setGameId(g.universe_id); setOpen(false); onPick() }}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-panel-2 ${g.universe_id === gameId ? 'text-accent' : ''}`}
              >
                <span className="truncate">{g.name}</span>
                {g.shared_by && <span className="ml-auto shrink-0 rounded bg-panel-2 px-1.5 py-0.5 text-[10px] text-muted">team</span>}
              </button>
            ))}
            <Link to="/app/settings" onClick={() => { setOpen(false); onPick() }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-muted hover:bg-panel-2 hover:text-text">
              <Plus size={14} />Add a game
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

function PlanCard() {
  const { me } = useAuth()
  if (!me) return null
  if (me.plan !== 'pro') {
    return (
      <Link to="/app/billing" className="block rounded-xl border border-line bg-bg p-3.5 hover:border-line-strong">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">Free plan</div>
        <div className="mt-1 text-[13px] font-medium">Unlock AI art and chat</div>
        <div className="mt-1 text-xs font-semibold text-accent">Upgrade to Pro</div>
      </Link>
    )
  }
  const c = me.credits
  const pct = c.monthly_total ? Math.round((c.monthly_left / c.monthly_total) * 100) : 0
  const resets = new Date(c.resets + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return (
    <Link to="/app/billing" className="block rounded-xl border border-line bg-bg p-3.5 hover:border-line-strong">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">Pro</span>
        <span className="text-[11px] text-muted">resets {resets}</span>
      </div>
      <div className="mt-1.5 text-[13px]"><span className="num font-semibold">{c.total}</span><span className="text-muted"> image credits left</span></div>
      <div className="mt-2 h-1 rounded-full bg-panel-2"><div className="h-1 rounded-full bg-accent" style={{ width: `${pct}%` }} /></div>
    </Link>
  )
}

function UserMenu() {
  const { me, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  if (!me) return null
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center rounded-full" aria-label="Account menu">
        {me.picture
          ? <img src={me.picture} alt="" className="h-9 w-9 rounded-full border border-line bg-panel-2" />
          : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">{initials(me.name)}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="card absolute right-0 z-30 mt-2 w-56 p-1 shadow-xl">
            <div className="px-3 py-2.5">
              <div className="truncate text-sm font-semibold">{me.display_name || me.name}</div>
              <div className="truncate text-xs text-muted">@{me.name}</div>
            </div>
            <div className="my-1 h-px bg-line" />
            <Link to="/app/billing" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-muted hover:bg-panel-2 hover:text-text"><CreditCard size={14} />Subscription</Link>
            <Link to="/app/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-muted hover:bg-panel-2 hover:text-text"><Settings size={14} />Settings</Link>
            <button onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-muted hover:bg-panel-2 hover:text-bad"><LogOut size={14} />Sign out</button>
          </div>
        </>
      )}
    </div>
  )
}

export default function Layout() {
  const { me, loading } = useAuth()
  const [open, setOpen] = useState(false)
  const [slot, setSlot] = useState<HTMLElement | null>(null)

  if (loading) return <div className="flex h-full items-center justify-center"><Spinner /></div>
  if (!me) return <SignIn />

  const sidebar = (
    <aside className="no-print flex h-full w-60 flex-col gap-5 border-r border-line bg-panel px-3 py-5">
      <div className="flex items-center justify-between px-2">
        <Link to="/"><Logo size={26} /></Link>
        <button className="text-muted lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18} /></button>
      </div>
      <GameSwitcher onPick={() => setOpen(false)} />
      <nav className="-mx-1 flex-1 space-y-5 overflow-y-auto px-1">
        {nav.map((g) => (
          <div key={g.section}>
            <div className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">{g.section}</div>
            <div className="space-y-0.5">
              {g.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `relative flex h-[34px] items-center gap-3 rounded-lg px-2.5 text-[13.5px] transition-colors ${
                      isActive ? 'bg-panel-2 font-semibold text-text' : 'font-medium text-muted hover:bg-panel-2/60 hover:text-text'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute -left-3 top-2 h-[18px] w-[3px] rounded-full bg-accent" />}
                      <it.icon size={16} className={isActive ? 'text-accent' : ''} />
                      {it.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <PlanCard />
    </aside>
  )

  return (
    <div className="print-root flex h-full">
      <div className="hidden lg:block">{sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex min-h-[72px] items-center gap-3 border-b border-line px-4 py-3 lg:px-8">
          <button className="text-muted lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div ref={setSlot} className="flex min-w-0 flex-1" />
          <div className="flex shrink-0 items-center gap-2">
            {me.plan === 'pro' && (
              <Link to="/app/billing" className="hidden items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent sm:inline-flex">
                <Sparkles size={13} /><span className="num">{me.credits.total}</span> credits
              </Link>
            )}
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main className="print-main flex-1 overflow-y-auto px-4 py-6 lg:px-8">
          <HeaderSlot.Provider value={slot}>
            <Outlet />
          </HeaderSlot.Provider>
        </main>
      </div>
    </div>
  )
}
