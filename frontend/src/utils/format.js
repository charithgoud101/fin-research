export function fmt(val, decimals = 2, suffix = '') {
  if (val === null || val === undefined) return '—'
  return `${Number(val).toFixed(decimals)}${suffix}`
}

export function fmtPct(val) {
  if (val === null || val === undefined) return '—'
  return `${Number(val).toFixed(2)}%`
}

export function fmtLarge(val) {
  if (val === null || val === undefined) return '—'
  const n = Number(val)
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toFixed(0)}`
}

export function fmtPrice(val) {
  if (val === null || val === undefined) return '—'
  return `$${Number(val).toFixed(2)}`
}

export function colorForChange(val) {
  if (val === null || val === undefined) return 'text-slate-400'
  return Number(val) >= 0 ? 'text-green-400' : 'text-red-400'
}

export function colorForScore(score) {
  if (score >= 70) return 'text-green-400'
  if (score >= 50) return 'text-yellow-400'
  return 'text-red-400'
}
