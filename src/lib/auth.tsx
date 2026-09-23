import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, getToken, setToken, type Me } from './api'

type AuthState = {
  me: Me | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  signOut: () => void
  gameId: string | null
  setGameId: (id: string | null) => void
}

const Ctx = createContext<AuthState | null>(null)
const GAME_KEY = 'rostats_game'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gameId, setGameIdState] = useState<string | null>(() => {
    try { return localStorage.getItem(GAME_KEY) } catch { return null }
  })

  const setGameId = (id: string | null) => {
    setGameIdState(id)
    try { if (id) localStorage.setItem(GAME_KEY, id); else localStorage.removeItem(GAME_KEY) } catch { /* ignore */ }
  }

  const refresh = useCallback(async () => {
    if (!getToken()) { setMe(null); setLoading(false); return }
    try {
      const m = await api.me()
      setMe(m)
      setError(null)
    } catch (e) {
      setMe(null)
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // Keep the selected game valid.
  useEffect(() => {
    if (!me) return
    if (!me.games.length) { if (gameId) setGameId(null); return }
    if (!gameId || !me.games.some((g) => g.universe_id === gameId)) setGameId(me.games[0].universe_id)
  }, [me, gameId])

  const signOut = () => { setToken(null); setMe(null) }

  return <Ctx.Provider value={{ me, loading, error, refresh, signOut, gameId, setGameId }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}
