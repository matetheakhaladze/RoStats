import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Logo, RobloxButton } from '../components/Layout'
import { Spinner } from '../components/data'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

export const PENDING_JOIN = 'rostats_pending_join'

export default function JoinTeam() {
  const { code = '' } = useParams()
  const { me, loading, refresh } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return
    if (!me) {
      try { localStorage.setItem(PENDING_JOIN, code) } catch { /* ignore */ }
      return
    }
    try { localStorage.removeItem(PENDING_JOIN) } catch { /* ignore */ }
    api.joinTeam(code)
      .then(async () => { await refresh(); navigate('/app/teams', { replace: true }) })
      .catch((e) => setError(e.message))
  }, [me, loading, code]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="card w-full max-w-sm p-8 text-center">
        <div className="flex justify-center"><Logo size={32} /></div>
        {error ? (
          <>
            <p className="mt-6 text-sm text-bad">{error}</p>
            <Link to="/app/teams" className="btn mt-4">Go to teams</Link>
          </>
        ) : me || loading ? (
          <div className="mt-6 flex justify-center"><Spinner label="Joining team" /></div>
        ) : (
          <>
            <h1 className="mt-6 text-lg font-semibold">You were invited to a team</h1>
            <p className="mt-2 text-sm text-muted">Sign in with Roblox to join. You will land back here automatically.</p>
            <RobloxButton className="mt-6 w-full" />
          </>
        )}
      </div>
    </div>
  )
}
