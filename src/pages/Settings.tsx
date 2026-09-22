import { useState } from 'react'
import { PageHeader, Card, Badge, Toggle } from '../components/ui'
import { games } from '../data/mock'

export default function SettingsPage() {
  const [notify, setNotify] = useState({ crashes: true, revenue: true, weekly: true, market: false })
  const [tab, setTab] = useState('General')
  const tabs = ['General', 'Games', 'Notifications', 'API keys', 'Team']

  return (
    <div>
      <PageHeader title="Settings" subtitle="Account, connected games, alerts and API access" />

      <div className="mb-4 flex gap-1 border-b border-line">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm border-b-2 -mb-px ${tab === t ? 'border-accent text-text' : 'border-transparent text-muted hover:text-text'}`}>{t}</button>
        ))}
      </div>

      {tab === 'General' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Profile">
            <div className="space-y-3">
              <div><div className="text-xs text-muted mb-1.5">Display name</div><input className="input" defaultValue="Mate Akhaladze" /></div>
              <div><div className="text-xs text-muted mb-1.5">Email</div><input className="input" defaultValue="mate@rostats.app" /></div>
              <div><div className="text-xs text-muted mb-1.5">Studio name</div><input className="input" defaultValue="Hepaka Studios" /></div>
              <div><div className="text-xs text-muted mb-1.5">Timezone</div><select className="input"><option>Asia/Tbilisi (GMT+4)</option><option>UTC</option><option>America/New_York</option></select></div>
              <button className="btn btn-primary">Save changes</button>
            </div>
          </Card>
          <Card title="Preferences">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><div><div className="text-sm">Currency display</div><div className="text-xs text-muted">Show revenue in Robux or estimated USD</div></div><select className="input w-32"><option>Robux</option><option>USD</option></select></div>
              <div className="flex items-center justify-between"><div><div className="text-sm">Default date range</div><div className="text-xs text-muted">Applied when opening a dashboard</div></div><select className="input w-32"><option>30 days</option><option>7 days</option><option>90 days</option></select></div>
              <div className="flex items-center justify-between"><div><div className="text-sm">Compact tables</div><div className="text-xs text-muted">Fit more rows on screen</div></div><Toggle checked={false} onChange={() => {}} /></div>
              <div className="flex items-center justify-between"><div><div className="text-sm">Anonymize player names</div><div className="text-xs text-muted">Hide usernames in transcripts and exports</div></div><Toggle checked={true} onChange={() => {}} /></div>
            </div>
          </Card>
        </div>
      )}

      {tab === 'Games' && (
        <Card title="Connected experiences" subtitle="Data is pulled through the Open Cloud API every 5 minutes" right={<button className="btn btn-primary">Connect a game</button>}>
          <table className="table w-full">
            <thead><tr><th>Experience</th><th>Universe ID</th><th>Genre</th><th>Last sync</th><th>Status</th></tr></thead>
            <tbody>
              {games.map((g, i) => (
                <tr key={g.id}>
                  <td className="font-medium">{g.name}</td>
                  <td className="font-mono text-xs text-muted">{4820000000 + i * 91237}</td>
                  <td>{g.genre}</td>
                  <td className="text-muted">{i === 3 ? '2 hours ago' : '3 min ago'}</td>
                  <td><Badge tone={i === 3 ? 'warn' : 'good'}>{i === 3 ? 'Sync delayed' : 'Connected'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'Notifications' && (
        <Card title="Alerts" subtitle="Delivered by email and to your Discord webhook">
          <div className="space-y-4">
            {[
              ['crashes', 'Crash spikes', 'When crash rate exceeds 1% in any 15-minute window'],
              ['revenue', 'Revenue drops', 'When daily revenue falls 25% below the 7-day average'],
              ['weekly', 'Weekly digest', 'Every Monday morning in your timezone'],
              ['market', 'Market opportunities', 'When a genre you track grows more than 15% in a week'],
            ].map(([k, t, d]) => (
              <div key={k} className="flex items-center justify-between">
                <div><div className="text-sm">{t}</div><div className="text-xs text-muted">{d}</div></div>
                <Toggle checked={notify[k as keyof typeof notify]} onChange={(v) => setNotify({ ...notify, [k]: v })} />
              </div>
            ))}
            <div><div className="text-xs text-muted mb-1.5">Discord webhook</div><input className="input" placeholder="https://discord.com/api/webhooks/..." /></div>
          </div>
        </Card>
      )}

      {tab === 'API keys' && (
        <Card title="API access" subtitle="Use the REST API to pull your metrics into Studio plugins or spreadsheets" right={<button className="btn">Create key</button>}>
          <table className="table w-full">
            <thead><tr><th>Name</th><th>Key</th><th>Created</th><th>Last used</th><th></th></tr></thead>
            <tbody>
              <tr><td>Studio plugin</td><td className="font-mono text-xs">rs_live_4f2a...9c1e</td><td className="text-muted">Aug 12, 2026</td><td className="text-muted">Today</td><td className="text-right"><button className="btn px-2 py-1 text-xs text-bad">Revoke</button></td></tr>
              <tr><td>Google Sheets sync</td><td className="font-mono text-xs">rs_live_b71d...02aa</td><td className="text-muted">Jul 3, 2026</td><td className="text-muted">Yesterday</td><td className="text-right"><button className="btn px-2 py-1 text-xs text-bad">Revoke</button></td></tr>
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'Team' && (
        <Card title="Team members" subtitle="Pro plan includes 3 seats" right={<button className="btn btn-primary">Invite</button>}>
          <table className="table w-full">
            <thead><tr><th>Member</th><th>Role</th><th>Games</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td>Mate Akhaladze</td><td><Badge tone="accent">Owner</Badge></td><td>All</td><td><Badge tone="good">Active</Badge></td></tr>
              <tr><td>scripter_luka</td><td>Editor</td><td>Tower Escape, Doom Evolution</td><td><Badge tone="good">Active</Badge></td></tr>
              <tr><td>nino.builds</td><td>Viewer</td><td>All</td><td><Badge tone="warn">Invited</Badge></td></tr>
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
