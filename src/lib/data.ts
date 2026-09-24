// CSV parsing and helpers for Creator Dashboard exports.
import type { Dataset } from './api'

export function parseCsv(text: string): { columns: string[]; rows: (string | number | null)[][] } {
  const clean = text.replace(/^﻿/, '')
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? ''
  const delim = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : firstLine.includes('\t') ? '\t' : ','
  const records: string[][] = []
  let field = ''
  let row: string[] = []
  let quoted = false
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === delim) { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some((c) => c.trim() !== '')) records.push(row)
      row = []
    } else field += ch
  }
  row.push(field)
  if (row.some((c) => c.trim() !== '')) records.push(row)
  if (records.length < 2) throw new Error('The file has no data rows')
  const columns = records[0].map((c, i) => c.trim() || `Column ${i + 1}`)
  const rows = records.slice(1).map((r) => columns.map((_, i) => toValue(r[i])))
  return { columns, rows }
}

function toValue(raw: string | undefined): string | number | null {
  if (raw == null) return null
  const s = raw.trim()
  if (s === '' || s === '-' || s.toLowerCase() === 'n/a') return null
  const n = toNumber(s)
  return n ?? s
}

export function toNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v !== 'string') return null
  const s = v.replace(/[,\s]/g, '').replace(/^R\$/, '').replace(/^\$/, '')
  if (!/^-?\d*\.?\d+%?$/.test(s)) return null
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

export type Series = { key: string; label: string; isPercent: boolean }

// Numeric columns of a dataset (everything except the first column, which is usually the date).
export function numericColumns(d: Dataset): Series[] {
  return d.columns
    .map((c, i) => ({ c, i }))
    .filter(({ i }) => i > 0 && d.rows.some((r) => toNumber(r[i]) != null))
    .map(({ c, i }) => ({
      key: String(i),
      label: c,
      isPercent: d.rows.some((r) => typeof r[i] === 'string' && String(r[i]).includes('%')) || /rate|retention|%|percent|conversion/i.test(c),
    }))
}

export function chartRows(d: Dataset) {
  const cols = numericColumns(d)
  return d.rows.map((r) => {
    const o: Record<string, string | number | null> = { x: String(r[0] ?? '') }
    for (const c of cols) o[c.key] = toNumber(r[Number(c.key)])
    return o
  })
}

// Latest value and change versus the previous period (7 days when there is enough data).
export function kpi(d: Dataset, colIndex: number) {
  const vals = d.rows.map((r) => toNumber(r[colIndex])).filter((v): v is number => v != null)
  if (!vals.length) return null
  const window = vals.length >= 14 ? 7 : Math.max(1, Math.floor(vals.length / 2))
  const recent = vals.slice(-window)
  const prev = vals.slice(-2 * window, -window)
  const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length
  const latest = vals[vals.length - 1]
  const change = prev.length && avg(prev) !== 0 ? ((avg(recent) - avg(prev)) / Math.abs(avg(prev))) * 100 : undefined
  return { latest, change: change == null ? undefined : Math.round(change * 10) / 10, window }
}

export const PLAYER_WORDS = /user|player|retention|session|visit|dau|mau|playtime|play time|engag|concurrent|ccu|new|return|d1|d7|d30|stick|acquisition|impression|join/i
export const MONEY_WORDS = /revenue|robux|payer|paying|arppu|arpdau|arpu|purchase|sale|conversion|pass|product|spend|monet|earning|premium|subscription/i

export function matches(d: Dataset, re: RegExp) {
  return re.test(d.name) || d.columns.some((c) => re.test(c))
}

export const SERIES_COLORS = ['var(--accent)', 'var(--orange)', 'var(--sky)', 'var(--pink)', 'var(--good)', 'var(--warn)']

// True when the first column holds dates, so the file is a daily or weekly series.
export function isTimeSeries(d: Dataset) {
  const vals = d.rows.slice(0, 20).map((r) => String(r[0] ?? '')).filter(Boolean)
  return vals.length > 0 && vals.filter((v) => /\d{1,4}[-/.]\d{1,2}([-/.]\d{1,4})?/.test(v) && !Number.isNaN(Date.parse(v.replace(/\./g, '-')))).length >= vals.length * 0.8
}

// Values of one column, in order, for sparklines.
export function columnValues(d: Dataset, colIndex: number, last = 30) {
  return d.rows.map((r) => toNumber(r[colIndex])).filter((v): v is number => v != null).slice(-last)
}

// Short date label: "Sep 12".
export function shortDate(v: string) {
  const t = Date.parse(v)
  return Number.isNaN(t) ? v : new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
