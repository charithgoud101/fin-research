import { fmt, fmtPrice } from '../utils/format'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

function Signal({ label, value, positive, negative }) {
  let bg = 'bg-slate-700 text-slate-300'
  if (positive) bg = 'bg-green-900/60 text-green-400 border border-green-700'
  if (negative) bg = 'bg-red-900/60 text-red-400 border border-red-700'
  return (
    <div className={`flex justify-between items-center px-3 py-2 rounded-lg text-sm ${bg}`}>
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-slate-900 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

export default function TechnicalTab({ data }) {
  const { indicators: ind, signals, chart_data } = data
  const rsi = ind?.rsi

  const rsiData = (chart_data || [])
    .filter((d) => d.rsi != null)
    .slice(-60)
    .map((d) => ({ date: d.date.slice(5), rsi: d.rsi }))

  const macdData = (chart_data || [])
    .filter((d) => d.macd != null)
    .slice(-60)
    .map((d) => ({ date: d.date.slice(5), macd: d.macd, signal: d.macd_signal }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Trend */}
        <Section title="Trend">
          <Signal label="vs SMA 20" value={signals?.above_sma20 ? 'Above ▲' : 'Below ▼'}
            positive={signals?.above_sma20} negative={signals?.above_sma20 === false} />
          <Signal label="vs SMA 50" value={signals?.above_sma50 ? 'Above ▲' : 'Below ▼'}
            positive={signals?.above_sma50} negative={signals?.above_sma50 === false} />
          <Signal label="vs SMA 200" value={signals?.above_sma200 ? 'Above ▲' : 'Below ▼'}
            positive={signals?.above_sma200} negative={signals?.above_sma200 === false} />
          <Signal label="Cross" value={signals?.golden_cross ? 'Golden Cross' : 'Death Cross'}
            positive={signals?.golden_cross} negative={signals?.death_cross} />
        </Section>

        {/* Momentum */}
        <Section title="Momentum">
          <Signal label="RSI (14)"
            value={rsi != null ? fmt(rsi) : '—'}
            positive={rsi && rsi < 40}
            negative={rsi && rsi > 70}
          />
          <Signal label="RSI Zone"
            value={rsi ? (rsi < 30 ? 'Oversold' : rsi > 70 ? 'Overbought' : 'Neutral') : '—'}
            positive={signals?.rsi_oversold}
            negative={signals?.rsi_overbought}
          />
          <Signal label="MACD"
            value={signals?.macd_bullish ? 'Bullish' : 'Bearish'}
            positive={signals?.macd_bullish}
            negative={signals?.macd_bearish}
          />
        </Section>

        {/* Price Levels */}
        <Section title="Price Levels">
          <Signal label="SMA 20" value={fmtPrice(ind?.sma20)} />
          <Signal label="SMA 50" value={fmtPrice(ind?.sma50)} />
          <Signal label="SMA 200" value={fmtPrice(ind?.sma200)} />
          <Signal label="Support" value={fmtPrice(ind?.support)} />
          <Signal label="Resistance" value={fmtPrice(ind?.resistance)} />
        </Section>

        {/* Volatility */}
        <Section title="Volatility & Volume">
          <Signal label="BB Upper" value={fmtPrice(ind?.bb_upper)} />
          <Signal label="BB Mid" value={fmtPrice(ind?.bb_mid)} />
          <Signal label="BB Lower" value={fmtPrice(ind?.bb_lower)} />
          <Signal label="BB Position"
            value={signals?.bb_position != null ? `${(signals.bb_position * 100).toFixed(0)}%` : '—'}
            positive={signals?.bb_position && signals.bb_position < 0.4}
            negative={signals?.bb_position && signals.bb_position > 0.8}
          />
          <Signal label="ATR (14)" value={fmtPrice(ind?.atr)} />
          <Signal label="Volume Spike"
            value={signals?.volume_spike ? 'Yes' : 'No'}
            positive={signals?.volume_spike}
          />
        </Section>
      </div>

      {/* RSI Chart */}
      <div className="bg-slate-900 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">RSI (14) — 60 Days</h3>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={rsiData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} interval={9} />
            <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} width={30} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
            <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" />
            <ReferenceLine y={50} stroke="#64748b" strokeDasharray="2 4" />
            <Line type="monotone" dataKey="rsi" stroke="#f59e0b" strokeWidth={2} dot={false} name="RSI" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* MACD Chart */}
      <div className="bg-slate-900 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">MACD — 60 Days</h3>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={macdData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} interval={9} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} width={45} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <ReferenceLine y={0} stroke="#64748b" />
            <Line type="monotone" dataKey="macd" stroke="#3b82f6" strokeWidth={2} dot={false} name="MACD" />
            <Line type="monotone" dataKey="signal" stroke="#f87171" strokeWidth={1.5} dot={false} name="Signal" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
