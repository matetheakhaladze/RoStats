// Client for the RoStats backend (backend/ folder, deployed on Vercel).
export const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? 'https://rostats-api.vercel.app').replace(/\/$/, '')

const TOKEN_KEY = 'rostats_token'

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
export function setToken(t: string | null) {
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY) } catch { /* storage blocked */ }
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.status = status }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) }
  if (init.body && !headers['content-type']) headers['content-type'] = 'application/json'
  if (token) headers.authorization = `Bearer ${token}`
  let r: Response
  try {
    r = await fetch(`${API_URL}${path}`, { ...init, headers })
  } catch {
    throw new ApiError(0, 'Could not reach the RoStats server. Check your connection.')
  }
  const data = await r.json().catch(() => ({}))
  if (!r.ok) {
    if (r.status === 401) setToken(null)
    throw new ApiError(r.status, (data as { detail?: string }).detail || `Request failed (${r.status})`)
  }
  return data as T
}

const post = <T,>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) })
const del = <T,>(path: string) => request<T>(path, { method: 'DELETE' })

// ---------- types

export type Credits = { monthly_left: number; monthly_total: number; bought: number; total: number; resets: string }
export type MyGame = { universe_id: string; place_id: string; name: string; added_at: string; shared_by: string | null }
export type Me = {
  id: string
  name: string
  display_name: string | null
  picture: string | null
  plan: 'free' | 'pro'
  credits: Credits
  chats_today: number
  chats_per_day: number
  game_limit: number | null
  games: MyGame[]
}
export type GameStats = {
  universe_id: string
  place_id: string
  name: string
  playing: number
  visits: number
  favorites: number
  likes?: number
  dislikes?: number
  rating?: number | null
  icon?: string
  creator?: string
  genre?: string
  updated?: string
  created?: string
}
export type Dataset = {
  id: number
  universe_id: string | null
  name: string
  columns: string[]
  rows: (string | number | null)[][]
  uploaded_at: string
  mine?: boolean
  owner?: string
}
export type TeamMember = { id: string; name: string; display_name: string | null; picture: string | null; role: string }
export type TeamGame = { universe_id: string; place_id: string; name: string; added_by: string; added_by_name: string }
export type Team = { id: string; name: string; owner_id: string; role: string; invite_code: string; members: TeamMember[]; games: TeamGame[] }
export type TaskStatus = 'todo' | 'doing' | 'review' | 'done'
export type Task = {
  id: string; team_id: string | null; status: TaskStatus; title: string; notes: string
  assignee_id: string | null; due: string | null; universe_id: string | null; position: number; created_by: string | null; updated_at: string
}
export type Benchmark = { key: string; label: string; value: number | null; median: number | null; percentile: number | null; unit: string }
export type Report = {
  game: { universe_id: string; place_id: string; name: string; playing: number; visits: number; favorites: number; rating: number | null; genre?: string; created?: string; updated?: string; icon?: string; creator?: string }
  days: number
  generated_at: string
  datasets: Dataset[]
  benchmarks: Benchmark[]
  benchmark_pool: number
  expires?: number
}
export type MarketGame = { universe_id: string; place_id: string; name: string; playing: number; likes: number; dislikes: number; rating: number | null; icon?: string }
export type MarketSort = { id: string; title: string; games: MarketGame[] }
export type HomeGame = MarketGame & { image: string }
export type Growth = { playing: number; before: number | null; hours: number | null; change: number | null; change_pct: number | null }
export type RisingGame = {
  universe_id: string; place_id: string; name: string; playing: number; visits?: number; rating?: number | null
  icon?: string; genre?: string; created?: string; updated?: string; age_days: number | null; creator?: string; growth?: Growth | null
}
export type Rising = { mode: 'growth' | 'new'; history_hours: number; games: RisingGame[]; updated: number }
export type MarketAnalysis = { summary: string; games: { universe_id: string; why: string; copy: string[] }[]; updated: number }
export type BoardGame = { universe_id: string; place_id: string; name: string; playing: number; rating: number | null; icon?: string; growth?: Growth | null }
export type Board = { name: string; games: BoardGame[]; updated: number }
export type Generation = { id: number; prompt: string; style: string; kind: string; created_at: string }

// ---------- auth

export function loginUrl() {
  const back = `${window.location.origin}${window.location.pathname}`
  return `${API_URL}/api/auth/login?return_to=${encodeURIComponent(back)}`
}

export const api = {
  health: () => request<{ ok: boolean; database: boolean; roblox_login: boolean }>('/api/health'),
  me: () => request<Me>('/api/me'),
  deleteMe: () => del<{ deleted: boolean }>('/api/me'),

  addGame: (input: string) => post<GameStats>('/api/games', { input }),
  removeGame: (universeId: string) => del<{ deleted: boolean }>(`/api/games/${universeId}`),
  gameStats: () => request<{ data: GameStats[] }>('/api/games/stats'),

  datasets: (universeId?: string) => request<{ data: Dataset[] }>(`/api/datasets${universeId ? `?universe_id=${universeId}` : ''}`),
  addDataset: (d: { name: string; universe_id?: string; columns: string[]; rows: (string | number | null)[][] }) =>
    post<{ id: number; rows_saved: number; trimmed: boolean }>('/api/datasets', d),
  deleteDataset: (id: number) => del<{ deleted: boolean }>(`/api/datasets/${id}`),

  chat: (body: { messages: { role: 'user' | 'assistant'; content: string }[]; universe_id?: string; include_data: boolean; notes?: string }) =>
    post<{ reply: string }>('/api/chat', body),
  insights: (body: { universe_id?: string; focus: 'overview' | 'players' | 'monetization'; dataset_ids?: number[] }) =>
    post<{ text: string }>('/api/insights', body),

  art: (body: { changes: string; style: 'Cartoon' | 'Anime'; kind: 'Thumbnail' | 'Icon' | 'Vector'; images: string[] }) =>
    post<{ id: number; image: string; credits: Credits }>('/api/art', body),
  artHistory: () => request<{ data: Generation[] }>('/api/art/history'),
  artImageUrl: (id: number) => `${API_URL}/api/art/image/${id}?t=${encodeURIComponent(getToken() ?? '')}`,

  market: () => request<{ sorts: MarketSort[]; updated: number }>('/api/market'),
  teams: () => request<{ data: Team[] }>('/api/teams'),
  createTeam: (name: string) => post<{ id: string }>('/api/teams', { name }),
  joinTeam: (code: string) => post<{ id: string; name: string }>('/api/teams/join', { code }),
  renameTeam: (id: string, name: string) => request<{ ok: boolean }>(`/api/teams/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
  resetInvite: (id: string) => post<{ invite_code: string }>(`/api/teams/${id}/invite`, {}),
  deleteTeam: (id: string) => del<{ deleted: boolean }>(`/api/teams/${id}`),
  removeMember: (id: string, uid: string) => del<{ removed: boolean }>(`/api/teams/${id}/members/${uid}`),
  shareGame: (id: string, universe_id: string) => post<{ ok: boolean }>(`/api/teams/${id}/games`, { universe_id }),
  unshareGame: (id: string, universe_id: string) => del<{ ok: boolean }>(`/api/teams/${id}/games/${universe_id}`),
  tasks: (teamId: string | null) => request<{ data: Task[] }>(`/api/tasks${teamId ? `?team_id=${teamId}` : ''}`),
  createTask: (t: Partial<Task> & { title: string }) => post<Task>('/api/tasks', t),
  updateTask: (id: string, patch: Partial<Task> & { clear?: string[] }) => request<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteTask: (id: string) => del<{ deleted: boolean }>(`/api/tasks/${id}`),
  report: (universeId: string, days: number) => request<Report>(`/api/report?universe_id=${universeId}&days=${days}`),
  shareReport: (universe_id: string, days: number) => post<{ token: string; expires: number }>('/api/report/share', { universe_id, days }),
  publicReport: (t: string) => request<Report>(`/api/report/public?t=${encodeURIComponent(t)}`),
  rising: () => request<Rising>('/api/market/rising'),
  marketAnalysis: () => request<MarketAnalysis>('/api/market/analysis'),
  categories: () => request<{ categories: string[] }>('/api/market/categories'),
  board: (p: { name?: string; q?: string }) =>
    request<Board>(`/api/market/category?${new URLSearchParams(p.q ? { q: p.q } : { name: p.name || '' })}`),
  homeSample: (kind: 'thumbnail' | 'icon') => request<{ data: HomeGame[] }>(`/api/roblox/home-sample?kind=${kind}`),
}

// Shrinks an image file to a JPEG data URL so uploads stay small.
export function fileToDataUrl(file: File, maxSide = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = reject
    img.src = url
  })
}

export const fmt = (n: number | null | undefined) =>
  n == null ? '-' : Math.abs(n) >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : Math.abs(n) >= 1e4 ? `${(n / 1e3).toFixed(1)}K` : n.toLocaleString(undefined, { maximumFractionDigits: 2 })
