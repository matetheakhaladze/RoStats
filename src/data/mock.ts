// Deterministic mock data so the demo looks the same on every load.

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const games = [
  { id: 'g1', name: 'Tower Escape Simulator', genre: 'Obby', players: 4820, rating: 92 },
  { id: 'g2', name: 'Blox Kingdom Tycoon', genre: 'Tycoon', players: 3110, rating: 88 },
  { id: 'g3', name: 'Neon Racers', genre: 'Racing', players: 2640, rating: 85 },
  { id: 'g4', name: 'Doom Evolution', genre: 'Combat', players: 1880, rating: 90 },
]

export const overviewSeries = (() => {
  const r = seeded(7)
  const out = []
  for (let i = 0; i < 30; i++) {
    const base = 9000 + i * 120
    out.push({
      day: `Day ${i + 1}`,
      visits: Math.round(base + r() * 2500),
      players: Math.round((base + r() * 2500) * 0.42),
      revenue: Math.round(900 + i * 25 + r() * 400),
    })
  }
  return out
})()

export const weeklyActivity = days.map((d, i) => ({
  day: d,
  active: [8200, 8650, 8100, 9300, 11200, 14100, 13400][i],
  newPlayers: [1200, 1350, 1100, 1500, 2100, 2900, 2600][i],
}))

export const retentionCohorts = [
  { cohort: 'Aug 25', d1: 46, d3: 31, d7: 22, d14: 15, d30: 9 },
  { cohort: 'Sep 1', d1: 48, d3: 33, d7: 24, d14: 17, d30: 10 },
  { cohort: 'Sep 8', d1: 51, d3: 35, d7: 26, d14: 18, d30: 0 },
  { cohort: 'Sep 15', d1: 53, d3: 37, d7: 27, d14: 0, d30: 0 },
]

export const retentionCurve = [
  { day: 'D0', rate: 100 },
  { day: 'D1', rate: 51 },
  { day: 'D3', rate: 35 },
  { day: 'D7', rate: 26 },
  { day: 'D14', rate: 18 },
  { day: 'D30', rate: 10 },
]

export const ageBuckets = [
  { name: '<9', value: 18 },
  { name: '9-12', value: 34 },
  { name: '13-16', value: 29 },
  { name: '17+', value: 19 },
]

export const regions = [
  { name: 'United States', share: 38, players: 4730 },
  { name: 'Brazil', share: 12, players: 1490 },
  { name: 'United Kingdom', share: 9, players: 1120 },
  { name: 'Philippines', share: 8, players: 995 },
  { name: 'Germany', share: 6, players: 745 },
  { name: 'Other', share: 27, players: 3360 },
]

export const devices = [
  { name: 'Mobile', value: 56 },
  { name: 'Desktop', value: 33 },
  { name: 'Console', value: 8 },
  { name: 'VR', value: 3 },
]

export const serverHealth = (() => {
  const r = seeded(21)
  const out = []
  for (let i = 0; i < 24; i++) {
    out.push({
      hour: `${String(i).padStart(2, '0')}:00`,
      cpu: Math.round(35 + Math.sin(i / 3) * 15 + r() * 10),
      memory: Math.round(48 + Math.cos(i / 4) * 10 + r() * 8),
      ping: Math.round(60 + Math.sin(i / 2) * 20 + r() * 25),
      fps: Math.round(58 - Math.max(0, Math.sin(i / 3)) * 8 - r() * 4),
    })
  }
  return out
})()

export const servers = [
  { id: 'srv-4f21', region: 'US East', players: 42, max: 50, ping: 48, fps: 60, uptime: '3h 12m', status: 'healthy' },
  { id: 'srv-9a03', region: 'US West', players: 38, max: 50, ping: 61, fps: 59, uptime: '1h 44m', status: 'healthy' },
  { id: 'srv-1c77', region: 'EU', players: 50, max: 50, ping: 89, fps: 54, uptime: '5h 02m', status: 'warning' },
  { id: 'srv-77b2', region: 'Asia', players: 21, max: 50, ping: 142, fps: 47, uptime: '0h 23m', status: 'critical' },
  { id: 'srv-e510', region: 'Brazil', players: 33, max: 50, ping: 74, fps: 58, uptime: '2h 38m', status: 'healthy' },
]

export const crashLog = [
  { time: '14:02', server: 'srv-77b2', error: 'Script timeout: EnemySpawner.lua:118', count: 6 },
  { time: '13:41', server: 'srv-1c77', error: 'Memory limit exceeded (Workspace parts)', count: 2 },
  { time: '12:15', server: 'srv-9a03', error: 'DataStore request throttled', count: 11 },
  { time: '10:57', server: 'srv-4f21', error: 'Remote event queue exhausted', count: 1 },
]

export const revenueByProduct = [
  { name: 'Game passes', value: 18400 },
  { name: 'Dev products', value: 14200 },
  { name: 'Private servers', value: 6100 },
  { name: 'Premium payouts', value: 4900 },
  { name: 'UGC items', value: 1630 },
]

export const topProducts = [
  { name: '2x Coins Boost', type: 'Dev product', price: 99, sales: 4820, revenue: 477180 },
  { name: 'VIP Pass', type: 'Game pass', price: 399, sales: 1140, revenue: 454860 },
  { name: 'Speed Potion x10', type: 'Dev product', price: 49, sales: 6210, revenue: 304290 },
  { name: 'Neon Trail', type: 'Game pass', price: 149, sales: 1660, revenue: 247340 },
  { name: 'Starter Pack', type: 'Dev product', price: 199, sales: 980, revenue: 195020 },
]

export const funnel = [
  { stage: 'Visited', value: 128400 },
  { stage: 'Played 5+ min', value: 61300 },
  { stage: 'Opened shop', value: 22800 },
  { stage: 'Added to cart', value: 9400 },
  { stage: 'Purchased', value: 3590 },
]

export const marketGenres = [
  { genre: 'Simulator', ccu: 412000, growth: 12.4, games: 1840 },
  { genre: 'Obby', ccu: 288000, growth: 4.1, games: 3120 },
  { genre: 'Tycoon', ccu: 251000, growth: 9.8, games: 1490 },
  { genre: 'Horror', ccu: 176000, growth: 21.7, games: 920 },
  { genre: 'Roleplay', ccu: 590000, growth: 2.3, games: 2210 },
  { genre: 'Fighting', ccu: 203000, growth: 15.2, games: 780 },
  { genre: 'Racing', ccu: 88000, growth: -3.4, games: 640 },
]

export const marketTrend = (() => {
  const r = seeded(3)
  const out = []
  for (let i = 0; i < 12; i++) {
    out.push({
      week: `W${i + 1}`,
      simulator: Math.round(380 + i * 4 + r() * 20),
      horror: Math.round(120 + i * 6 + r() * 15),
      tycoon: Math.round(230 + i * 2 + r() * 12),
      racing: Math.round(95 - i * 0.6 + r() * 8),
    })
  }
  return out
})()

export const trendingKeywords = [
  { keyword: 'anime fighting', volume: 92, change: 34 },
  { keyword: 'backrooms', volume: 78, change: 22 },
  { keyword: 'pet simulator', volume: 85, change: -6 },
  { keyword: 'restaurant tycoon', volume: 64, change: 18 },
  { keyword: 'escape room', volume: 57, change: 11 },
  { keyword: 'grow a garden', volume: 96, change: 41 },
]

// Games that have not launched yet but are already picking up attention
// (wishlists, Discord members, teaser views, creator followers).
export const upcomingGames = [
  { name: 'Skyline Heist', studio: 'Vantage Games', genre: 'Heist', launch: 'Oct 3, 2026', signals: 96, discord: '48K', teaserViews: '2.1M', trend: 38 },
  { name: 'Grow a Kingdom', studio: 'Sprout Labs', genre: 'Simulator', launch: 'Oct 10, 2026', signals: 91, discord: '61K', teaserViews: '1.7M', trend: 29 },
  { name: 'Backrooms: Level 0', studio: 'Nullspace', genre: 'Horror', launch: 'Oct 17, 2026', signals: 84, discord: '22K', teaserViews: '940K', trend: 44 },
  { name: 'Anime Clash Arena', studio: 'Kaiju Works', genre: 'Fighting', launch: 'Oct 24, 2026', signals: 82, discord: '35K', teaserViews: '1.2M', trend: 17 },
  { name: 'Pet Planet', studio: 'Bloom Studio', genre: 'Simulator', launch: 'Nov 2026', signals: 74, discord: '19K', teaserViews: '610K', trend: 12 },
  { name: 'Ghost Ship Tycoon', studio: 'Driftwood', genre: 'Tycoon', launch: 'Nov 2026', signals: 68, discord: '11K', teaserViews: '380K', trend: 21 },
  { name: 'Neon Drift 2', studio: 'Redline', genre: 'Racing', launch: 'Dec 2026', signals: 55, discord: '8K', teaserViews: '210K', trend: -4 },
]

export const invoices = [
  { id: 'INV-2026-091', date: 'Sep 1, 2026', amount: '$29.00', plan: 'Pro', status: 'Paid' },
  { id: 'INV-2026-081', date: 'Aug 1, 2026', amount: '$29.00', plan: 'Pro', status: 'Paid' },
  { id: 'INV-2026-071', date: 'Jul 1, 2026', amount: '$29.00', plan: 'Pro', status: 'Paid' },
  { id: 'INV-2026-061', date: 'Jun 1, 2026', amount: '$0.00', plan: 'Free', status: 'Paid' },
]

export const reports = [
  { name: 'Weekly performance digest', schedule: 'Every Monday', format: 'PDF', last: 'Sep 15, 2026', status: 'Sent' },
  { name: 'Monetization deep dive', schedule: 'Monthly', format: 'XLSX', last: 'Sep 1, 2026', status: 'Sent' },
  { name: 'Server incidents', schedule: 'Daily', format: 'CSV', last: 'Today', status: 'Sent' },
  { name: 'Investor summary', schedule: 'Quarterly', format: 'PDF', last: 'Jul 1, 2026', status: 'Draft' },
]

export const journeySteps = [
  { step: 'Game page', users: 100000, drop: 0 },
  { step: 'Joined server', users: 71000, drop: 29 },
  { step: 'Finished tutorial', users: 52000, drop: 27 },
  { step: 'Reached level 5', users: 31000, drop: 40 },
  { step: 'Opened shop', users: 18500, drop: 40 },
  { step: 'First purchase', users: 3400, drop: 82 },
  { step: 'Returned D7', users: 2600, drop: 24 },
]

export const journeyPaths = [
  { path: 'Tutorial > Lobby > Obby 1 > Shop', users: 8400, conversion: 6.1 },
  { path: 'Tutorial > Lobby > Trade hub > Shop', users: 5100, conversion: 9.4 },
  { path: 'Lobby > Daily reward > Obby 2', users: 4700, conversion: 2.8 },
  { path: 'Lobby > Boss arena > Shop', users: 3900, conversion: 11.2 },
  { path: 'Tutorial > Left game', users: 19000, conversion: 0 },
]
