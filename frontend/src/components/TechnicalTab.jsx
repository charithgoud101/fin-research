import { fmt, fmtPrice, fmtLarge, currencySymbol } from '../utils/format'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

// e.g. "2002-08-12" → "Aug 2002"
function shortDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function Signal({ label, value, sub, positive, negative }) {
  let bg = 'bg-slate-700 text-slate-300'
  if (positive) bg = 'bg-green-900/60 text-green-400 border border-green-700'
  if (negative) bg = 'bg-red-900/60 text-red-400 border border-red-700'
  return (
    <div className={`flex justify-between items-start px-3 py-2 rounded-lg text-sm ${bg}`}>
      <div>
        <span>{label}</span>
        {sub && <div className="text-xs opacity-60 mt-0.5">{sub}</div>}
      </div>
      <span className="font-semibold ml-2 shrink-0">{value}</span>
    </div>
  )
}

function Section({ title, subtitle, children }) {
  return (
    <div className="bg-slate-900 rounded-xl p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{title}</h3>
        {subtitle && <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p>}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

export default function TechnicalTab({ data, currency }) {
  const { indicators: ind, signals, chart_data } = data
  const all = chart_data || []
  const rsi = ind?.rsi
  const sym = currencySymbol(currency)

  // ── Calculation-start dates (0-indexed lookback) ──────────────────────────
  const dateAt = (n) => shortDate(all[n]?.date)
  const sma20Start   = dateAt(19)    // 20-period
  const sma50Start   = dateAt(49)    // 50-period
  const sma200Start  = dateAt(199)   // 200-period
  const rsiStart     = dateAt(13)    // 14-period
  const macdStart    = dateAt(34)    // EMA26 + Signal9 − 1 = 34
  const bbStart      = dateAt(19)    // 20-period (same as sma20)
  const atrStart     = dateAt(13)    // 14-period
  const oldest       = shortDate(all[0]?.date)
  const latest       = shortDate(all[all.length - 1]?.date)

  // ── Sub-charts (last 60 sessions) ────────────────────────────────────────
  const rsiData = all
    .filter((d) => d.rsi != null)
    .slice(-60)
    .map((d) => ({ date: d.date.slice(5), rsi: d.rsi }))

  const macdData = all
    .filter((d) => d.macd != null)
    .slice(-60)
    .map((d) => ({ date: d.date.slice(5), macd: d.macd, signal: d.macd_signal }))

  const rsiChartFrom  = shortDate(all.filter(d => d.rsi != null).slice(-60)[0]?.date)
  const macdChartFrom = shortDate(all.filter(d => d.macd != null).slice(-60)[0]?.date)

  // ── Volume value (price × shares = traded value in local currency) ────────
  const tradedValue   = ind?.volume && ind?.price ? ind.volume * ind.price : null
  const avgTradedVal  = ind?.avg_volume_20 && ind?.price ? ind.avg_volume_20 * ind.price : null

  return (
    <div className="space-y-4">
      {/* Data range banner */}
      {oldest && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-slate-500">
          <span>All indicators computed from full history</span>
          <span className="text-slate-400 font-medium">{oldest} → {latest} &nbsp;·&nbsp; {all.length} trading days</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* ── Trend ── */}
        <Section
          title="Trend"
          subtitle={sma200Start ? `SMA 200 valid since ${sma200Start}` : undefined}
        >
          <Signal
            label="vs SMA 20" sub={sma20Start ? `since ${sma20Start}` : undefined}
            value={signals?.above_sma20 ? 'Above ▲' : 'Below ▼'}
            positive={signals?.above_sma20} negative={signals?.above_sma20 === false}
          />
          <Signal
            label="vs SMA 50" sub={sma50Start ? `since ${sma50Start}` : undefined}
            value={signals?.above_sma50 ? 'Above ▲' : 'Below ▼'}
            positive={signals?.above_sma50} negative={signals?.above_sma50 === false}
          />
          <Signal
            label="vs SMA 200" sub={sma200Start ? `since ${sma200Start}` : undefined}
            value={signals?.above_sma200 ? 'Above ▲' : 'Below ▼'}
            positive={signals?.above_sma200} negative={signals?.above_sma200 === false}
          />
          <Signal
            label="Cross"
            value={signals?.golden_cross ? 'Golden Cross' : 'Death Cross'}
            positive={signals?.golden_cross} negative={signals?.death_cross}
          />
        </Section>

        {/* ── Momentum ── */}
        <Section
          title="Momentum"
          subtitle={rsiStart ? `RSI valid since ${rsiStart} · MACD since ${macdStart}` : undefined}
        >
          <Signal
            label="RSI (14)" sub={rsiStart ? `since ${rsiStart}` : undefined}
            value={rsi != null ? fmt(rsi) : '—'}
            positive={rsi && rsi < 40} negative={rsi && rsi > 70}
          />
          <Signal
            label="RSI Zone"
            value={rsi ? (rsi < 30 ? 'Oversold' : rsi > 70 ? 'Overbought' : 'Neutral') : '—'}
            positive={signals?.rsi_oversold} negative={signals?.rsi_overbought}
          />
          <Signal
            label="MACD (12,26,9)" sub={macdStart ? `since ${macdStart}` : undefined}
            value={signals?.macd_bullish ? 'Bullish' : 'Bearish'}
            positive={signals?.macd_bullish} negative={signals?.macd_bearish}
          />
        </Section>

        {/* ── Price Levels ── */}
        <Section
          title="Price Levels"
          subtitle={oldest ? `Calculated from ${oldest}` : undefined}
        >
          <Signal
            label="SMA 20" sub={sma20Start ? `since ${sma20Start}` : undefined}
            value={fmtPrice(ind?.sma20, currency)}
          />
          <Signal
            label="SMA 50" sub={sma50Start ? `since ${sma50Start}` : undefined}
            value={fmtPrice(ind?.sma50, currency)}
          />
          <Signal
            label="SMA 200" sub={sma200Start ? `since ${sma200Start}` : undefined}
            value={fmtPrice(ind?.sma200, currency)}
          />
          <Signal
            label="Support (20d)" sub="20-day rolling low"
            value={fmtPrice(ind?.support, currency)}
          />
          <Signal
            label="Resistance (20d)" sub="20-day rolling high"
            value={fmtPrice(ind?.resistance, currency)}
          />
        </Section>

        {/* ── Volatility & Volume ── */}
        <Section
          title="Volatility & Volume"
          subtitle={bbStart ? `BB & ATR calculated from ${bbStart}` : undefined}
        >
          <Signal
            label="BB Upper (20)" sub={bbStart ? `since ${bbStart}` : undefined}
            value={fmtPrice(ind?.bb_upper, currency)}
          />
          <Signal
            label="BB Mid (20)"
            value={fmtPrice(ind?.bb_mid, currency)}
          />
          <Signal
            label="BB Lower (20)"
            value={fmtPrice(ind?.bb_lower, currency)}
          />
          <Signal
            label="BB Position"
            value={signals?.bb_position != null ? `${(signals.bb_position * 100).toFixed(0)}%` : '—'}
            positive={signals?.bb_position && signals.bb_position < 0.4}
            negative={signals?.bb_position && signals.bb_position > 0.8}
          />
          <Signal
            label="ATR (14)" sub={atrStart ? `since ${atrStart}` : undefined}
            value={fmtPrice(ind?.atr, currency)}
          />
          <Signal
            label="Today's Volume"
            sub={tradedValue ? `Traded value: ${fmtLarge(tradedValue, currency)}` : 'shares traded today'}
            value={ind?.volume != null ? ind.volume.toLocaleString() : '—'}
            positive={signals?.volume_spike}
          />
          <Signal
            label="Avg Volume (20d)"
            sub={avgTradedVal ? `Avg value: ${fmtLarge(avgTradedVal, currency)}` : '20-day average'}
            value={ind?.avg_volume_20 != null ? ind.avg_volume_20.toLocaleString() : '—'}
          />
        </Section>
      </div>

      {/* ── RSI Chart ── */}
      <div className="bg-slate-900 rounded-xl p-4">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">RSI (14) — Last 60 Sessions</h3>
          {rsiChartFrom && <span className="text-xs text-slate-600">from {rsiChartFrom}</span>}
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={rsiData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} interval={9} />
            <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} width={30} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'OB 70', fill: '#ef4444', fontSize: 9, position: 'right' }} />
            <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'OS 30', fill: '#22c55e', fontSize: 9, position: 'right' }} />
            <ReferenceLine y={50} stroke="#64748b" strokeDasharray="2 4" />
            <Line type="monotone" dataKey="rsi" stroke="#f59e0b" strokeWidth={2} dot={false} name="RSI" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── MACD Chart ── */}
      <div className="bg-slate-900 rounded-xl p-4">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">MACD (12, 26, 9) — Last 60 Sessions</h3>
          {macdChartFrom && <span className="text-xs text-slate-600">from {macdChartFrom}</span>}
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={macdData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} interval={9} />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 10 }} width={50}
              tickFormatter={(v) => `${sym}${Math.abs(v) >= 1 ? v.toFixed(1) : v.toFixed(3)}`}
            />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(v, name) => [`${sym}${Number(v).toFixed(4)}`, name]}
            />
            <ReferenceLine y={0} stroke="#64748b" />
            <Line type="monotone" dataKey="macd"   stroke="#3b82f6" strokeWidth={2}   dot={false} name="MACD" />
            <Line type="monotone" dataKey="signal" stroke="#f87171" strokeWidth={1.5} dot={false} name="Signal" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
