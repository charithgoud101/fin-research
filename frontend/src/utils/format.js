export function fmt(val, decimals = 2, suffix = '') {
  if (val === null || val === undefined) return '—'
  return `${Number(val).toFixed(decimals)}${suffix}`
}

export function fmtPct(val) {
  if (val === null || val === undefined) return '—'
  return `${Number(val).toFixed(2)}%`
}

export function fmtLarge(val, currency = 'USD') {
  if (val === null || val === undefined) return '—'
  const n = Number(val)
  const sym = currency === 'INR' ? '₹' : '$'
  if (currency === 'INR') {
    if (Math.abs(n) >= 1e12) return `${sym}${(n / 1e12).toFixed(2)}T`
    if (Math.abs(n) >= 1e7) return `${sym}${(n / 1e7).toFixed(2)}Cr`
    if (Math.abs(n) >= 1e5) return `${sym}${(n / 1e5).toFixed(2)}L`
    return `${sym}${n.toFixed(0)}`
  }
  if (Math.abs(n) >= 1e12) return `${sym}${(n / 1e12).toFixed(2)}T`
  if (Math.abs(n) >= 1e9) return `${sym}${(n / 1e9).toFixed(2)}B`
  if (Math.abs(n) >= 1e6) return `${sym}${(n / 1e6).toFixed(2)}M`
  return `${sym}${n.toFixed(0)}`
}

export function fmtPrice(val, currency = 'USD') {
  if (val === null || val === undefined) return '—'
  const sym = currency === 'INR' ? '₹' : '$'
  return `${sym}${Number(val).toFixed(2)}`
}

export function currencySymbol(currency) {
  return currency === 'INR' ? '₹' : '$'
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
