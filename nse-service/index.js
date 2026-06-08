import express from 'express'
import { NseIndia } from 'stock-nse-india'

const app = express()
const PORT = process.env.NSE_PORT || 3001
const nse = new NseIndia()

// In-memory symbol→name map (symbol → company name)
// Built lazily: all symbols loaded at startup (just symbols, names fetched on-demand)
let allSymbols = []
const nameCache = {}   // symbol → company name, filled as searches happen

async function initSymbols() {
  try {
    allSymbols = await nse.getAllStockSymbols()
    console.log(`[NSE] Loaded ${allSymbols.length} NSE symbols`)
  } catch (e) {
    console.warn('[NSE] Could not load symbol list:', e.message)
  }
}

async function enrichNames(symbols) {
  const toFetch = symbols.filter((s) => !nameCache[s])
  if (toFetch.length === 0) return
  await Promise.allSettled(
    toFetch.map(async (s) => {
      try {
        const d = await nse.getEquityDetails(s)
        nameCache[s] = d?.info?.companyName || s
      } catch (_) {
        nameCache[s] = s
      }
    })
  )
}

const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res)
  } catch (e) {
    console.error(`[NSE] ${req.method} ${req.path} — ${e.message}`)
    res.status(500).json({ error: e.message })
  }
}

// ─── Health ──────────────────────────────────────────────────────────────────

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'nse-service' }))

// ─── Search ──────────────────────────────────────────────────────────────────

app.get('/search/autocomplete', wrap(async (req, res) => {
  const { q = '' } = req.query
  const query = q.trim().toUpperCase()
  if (!query) return res.json({ symbols: [] })

  // Prefix matches first, then contains
  const prefix   = allSymbols.filter((s) => s.startsWith(query))
  const contains = allSymbols.filter((s) => !s.startsWith(query) && s.includes(query))
  const top = [...prefix, ...contains].slice(0, 8)

  // Fetch company names for any we haven't seen yet (at most 8 parallel calls)
  await enrichNames(top)

  const symbols = top.map((s) => ({
    symbol: `${s}.NS`,
    name: nameCache[s] || s,
    exchange: 'NSE',
    type: 'Common Stock',
  }))

  res.json({ symbols })
}))

// ─── Equity details ───────────────────────────────────────────────────────────

app.get('/equity/:symbol', wrap(async (req, res) => {
  const symbol = req.params.symbol.toUpperCase()
  const data = await nse.getEquityDetails(symbol)
  res.json(data || {})
}))

app.get('/equity/:symbol/trade-info', wrap(async (req, res) => {
  const symbol = req.params.symbol.toUpperCase()
  const data = await nse.getEquityTradeInfo(symbol)
  res.json(data || {})
}))

app.get('/equity/:symbol/corporate-info', wrap(async (req, res) => {
  const symbol = req.params.symbol.toUpperCase()
  const raw = await nse.getEquityCorporateInfo(symbol)

  // Normalise shareholding patterns
  const spRaw = raw?.shareholdings_patterns?.data || {}
  const dates = Object.keys(spRaw).sort().reverse() // latest first
  let shareholding = {}
  if (dates.length > 0) {
    const latest = spRaw[dates[0]] || []
    const find = (key) => {
      const item = latest.find((x) => Object.keys(x)[0]?.includes(key))
      return item ? parseFloat(Object.values(item)[0]) : null
    }
    shareholding = {
      date: dates[0],
      promoter: find('Promoter'),
      public: find('Public'),
      employee_trust: find('Employee'),
    }
  }

  // Normalise announcements
  const annRaw = raw?.latest_announcements?.data || []
  const announcements = annRaw.map((a) => ({
    subject: a.subject || a.desc || 'Announcement',
    date: a.broadcastdate || a.an_dt || '',
    attachment: a.attchmntFile || null,
  }))

  // Corporate actions (dividends, splits, etc.)
  const actionsRaw = raw?.corporate_actions?.data || []

  res.json({ shareholding, announcements, corporate_actions: actionsRaw })
}))

// Full OHLCV history from listing date to today (chunked by year)
app.get('/equity/:symbol/full-history', wrap(async (req, res) => {
  const symbol = req.params.symbol.toUpperCase()

  // Get listing date
  const details = await nse.getEquityDetails(symbol)
  const rawDate = details?.info?.listingDate
  const startDate = parseNSEDate(rawDate) || fallbackStartDate(10)
  const endDate = todayDDMMYYYY()

  const allRows = []
  let cursor = parseDDMMYYYY(startDate)
  const todayObj = new Date()

  while (cursor <= todayObj) {
    const chunkEnd = new Date(cursor)
    chunkEnd.setFullYear(chunkEnd.getFullYear() + 1)
    const end = chunkEnd > todayObj ? todayObj : chunkEnd

    try {
      const chunk = await nse.getEquityHistoricalData(symbol, {
        start: toDDMMYYYY(cursor),
        end: toDDMMYYYY(end),
      })
      allRows.push(...normaliseHistorical(chunk?.data || []))
    } catch (e) {
      console.warn(`[NSE] history chunk error for ${symbol}: ${e.message}`)
    }

    cursor = new Date(end)
    cursor.setDate(cursor.getDate() + 1)
    if (allRows.length > 0) await sleep(150)
  }

  // Sort oldest→newest, deduplicate
  const seen = new Set()
  const deduped = allRows
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter((r) => { if (seen.has(r.date)) return false; seen.add(r.date); return true })

  res.json({ symbol, count: deduped.length, data: deduped })
}))

// ─── Market-level ─────────────────────────────────────────────────────────────

app.get('/fii-dii', wrap(async (req, res) => {
  const raw = await nse.getDataByEndpoint('/api/fiidiiTradeReact')
  if (!Array.isArray(raw)) return res.json([])

  // Group by date: {date, fii_net, fii_buy, fii_sell, dii_net, dii_buy, dii_sell}
  const byDate = {}
  for (const row of raw) {
    const date = row.date || ''
    if (!byDate[date]) byDate[date] = { date }
    const cat = (row.category || '').toLowerCase()
    const net = parseFloat(row.netValue || 0)
    const buy = parseFloat(row.buyValue || 0)
    const sell = parseFloat(row.sellValue || 0)
    if (cat.includes('fii') || cat.includes('fpi')) {
      byDate[date].fii_net = net
      byDate[date].fii_buy = buy
      byDate[date].fii_sell = sell
    } else if (cat.includes('dii')) {
      byDate[date].dii_net = net
      byDate[date].dii_buy = buy
      byDate[date].dii_sell = sell
    }
  }

  const result = Object.values(byDate)
    .filter((d) => d.fii_net !== undefined || d.dii_net !== undefined)
    .sort((a, b) => parseNSEDateToTs(a.date) - parseNSEDateToTs(b.date))

  res.json(result)
}))

app.get('/market-status', wrap(async (req, res) => {
  const data = await nse.getMarketStatus()
  res.json(data || {})
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_MAP = {
  Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',
  Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12',
}

function parseNSEDate(raw) {
  if (!raw) return null
  const parts = raw.split('-')
  if (parts.length !== 3) return null
  if (MONTH_MAP[parts[1]]) return `${parts[0].padStart(2,'0')}-${MONTH_MAP[parts[1]]}-${parts[2]}`
  return raw
}

function parseNSEDateToTs(s) {
  if (!s) return 0
  const monthAbbr = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 }
  const p = s.split('-')
  if (p.length === 3 && monthAbbr[p[1]] !== undefined)
    return new Date(Number(p[2]), monthAbbr[p[1]], Number(p[0])).getTime()
  return new Date(s).getTime() || 0
}

function fallbackStartDate(years) {
  const d = new Date()
  d.setFullYear(d.getFullYear() - years)
  return toDDMMYYYY(d)
}

function todayDDMMYYYY() { return toDDMMYYYY(new Date()) }

function toDDMMYYYY(d) {
  return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`
}

function parseDDMMYYYY(s) {
  const [dd, mm, yyyy] = s.split('-')
  return new Date(Number(yyyy), Number(mm)-1, Number(dd))
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

function normaliseHistorical(rows) {
  return rows.map((r) => ({
    date: toISO(r.mTimestamp || r.CH_TIMESTAMP || r.chTimestamp || ''),
    open:   toNum(r.chOpeningPrice  || r.CH_OPENING_PRICE  || 0),
    high:   toNum(r.chTradeHighPrice || r.CH_TRADE_HIGH_PRICE || 0),
    low:    toNum(r.chTradeLowPrice  || r.CH_TRADE_LOW_PRICE  || 0),
    close:  toNum(r.chClosingPrice   || r.CH_CLOSING_PRICE   || 0),
    volume: toInt(r.chTotTradedQty  || r.CH_TOT_TRADED_QTY  || 0),
  })).filter((r) => r.close > 0 && r.date)
}

function toISO(raw) {
  const s = String(raw || '')
  if (s.includes('T')) return s.slice(0, 10)
  if (s.match(/^\d{2}-\d{2}-\d{4}$/)) { const [d,m,y]=s.split('-'); return `${y}-${m}-${d}` }
  if (s.match(/^\d{4}-\d{2}-\d{2}/)) return s.slice(0, 10)
  return s
}

function toNum(v) { return Math.round(parseFloat(v)*100)/100 }
function toInt(v) { return parseInt(v)||0 }

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n  NSE Service running on http://localhost:${PORT}`)
  initSymbols().catch(() => {})
})
