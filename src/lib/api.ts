// Thin client for the RoStats backend (backend/ folder, deployed on Vercel).
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://rostats-api.vercel.app'

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((data as { detail?: string }).detail || `Request failed (${r.status})`)
  return data as T
}

export type ChatMsg = { role: 'user' | 'assistant'; content: string }

export function chat(messages: ChatMsg[], context?: string) {
  return post<{ reply: string }>('/api/chat', { messages, context })
}

export function generateArt(input: {
  changes: string
  style: 'Cartoon' | 'Anime'
  kind: 'Thumbnail' | 'Icon' | 'Vector'
  images: string[]
  count: number
}) {
  return post<{ images: string[] }>('/api/art', input)
}

export async function robloxGames(universeIds: (number | string)[]) {
  const r = await fetch(`${API_URL}/api/roblox/games?universeIds=${universeIds.join(',')}`)
  if (!r.ok) throw new Error(`Request failed (${r.status})`)
  return (await r.json()) as { data: { universeId: number; name: string; playing: number; visits: number; favorites: number; rating: number | null }[] }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader()
    fr.onload = () => res(fr.result as string)
    fr.onerror = rej
    fr.readAsDataURL(file)
  })
}
