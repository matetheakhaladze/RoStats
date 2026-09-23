import { useEffect } from 'react'
import { HashRouter, Routes, Route, useNavigate, useSearchParams, Link } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Overview from './pages/Overview'
import Metrics from './pages/Metrics'
import ImportData from './pages/ImportData'
import Market from './pages/Market'
import ArtGenerator from './pages/ArtGenerator'
import Chatbot from './pages/Chatbot'
import SettingsPage from './pages/Settings'
import Billing from './pages/Billing'
import Reports from './pages/Reports'
import PublicReport from './pages/PublicReport'
import Teams from './pages/Teams'
import Tasks from './pages/Tasks'
import JoinTeam, { PENDING_JOIN } from './pages/JoinTeam'
import { AuthProvider, useAuth } from './lib/auth'
import { setToken } from './lib/api'

function AuthCallback() {
  const [params] = useSearchParams()
  const { refresh } = useAuth()
  const navigate = useNavigate()
  const token = params.get('token')
  const error = params.get('error')

  useEffect(() => {
    if (!token) return
    setToken(token)
    let pending: string | null = null
    try { pending = localStorage.getItem(PENDING_JOIN) } catch { /* ignore */ }
    refresh().then(() => navigate(pending ? `/join/${pending}` : '/app', { replace: true }))
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="card max-w-sm p-6 text-center">
        {error
          ? (<><p className="text-sm text-bad">Sign in failed: {error}</p><Link to="/" className="btn mt-4">Back</Link></>)
          : <p className="text-sm text-muted">Signing you in...</p>}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/join/:code" element={<JoinTeam />} />
          <Route path="/r/:token" element={<PublicReport />} />
          <Route path="*" element={<Landing />} />
          <Route path="/app" element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="players" element={<Metrics kind="players" />} />
            <Route path="monetization" element={<Metrics kind="monetization" />} />
            <Route path="market" element={<Market />} />
            <Route path="data" element={<ImportData />} />
            <Route path="art" element={<ArtGenerator />} />
            <Route path="chatbot" element={<Chatbot />} />
            <Route path="reports" element={<Reports />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="teams" element={<Teams />} />
            <Route path="billing" element={<Billing />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
