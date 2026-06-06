import {
  ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { useState } from 'react'

const PERIODS = ['1M', '3M', '6M', '1Y']

function filterData(data, period) {
  const now = new Date()
  const cutoff = new Date(now)
  if (period === '1M') cutoff.setMonth(now.getMonth() - 1)
  else if (period === '3M') cutoff.setMonth(now.getMonth() - 3)
  else if (period === '6M') cutoff.setMonth(now.getMonth() - 6)
  else cutoff.setFullYear(now.getFullYear() - 1)
  return data.filter((d) => new Date(d.date) >= cutoff)
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 text-sm shadow-xl">
      <p className="text-slate-300 font-medium mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="mb-0.5">
          {p.name}: {p.value != null ? Number(p.value).toFixed(2) : '—'}
        </p>
      ))}
    </div>
  )
}

export default function PriceChart({ chartData }) {
  const [period, setPeriod] = useState('1Y')
  const [overlay, setOverlay] = useState('sma')
  const data = filterData(chartData, period)

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-white">Price Chart</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1">
            {['sma', 'bb'].map((o) => (
              <button
                key={o}
                onClick={() => setOverlay(o)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                  overlay === o ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {o === 'sma' ? 'Moving Averages' : 'Bollinger Bands'}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                  period === p ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickFormatter={(d) => d.slice(5)}
            interval={Math.floor(data.length / 6)}
          />
          <YAxis
            yAxisId="price"
            domain={['auto', 'auto']}
            tick={{ fill: '#64748b', fontSize: 11 }}
            width={65}
            tickFormatter={(v) => `$${v.toFixed(0)}`}
          />
          <YAxis
            yAxisId="vol"
            orientation="right"
            tick={{ fill: '#64748b', fontSize: 10 }}
            width={55}
            tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: 12, fontSize: 12, color: '#94a3b8' }}
          />

          <Bar yAxisId="vol" dataKey="volume" name="Volume" fill="#1e40af" opacity={0.35} />
          <Area
            yAxisId="price" type="monotone" dataKey="close" name="Price"
            stroke="#3b82f6" fill="#1d4ed820" strokeWidth={2} dot={false}
          />

          {overlay === 'sma' && (
            <>
              <Line yAxisId="price" type="monotone" dataKey="sma20" name="SMA 20"
                stroke="#f59e0b" strokeWidth={1.5} dot={false} />
              <Line yAxisId="price" type="monotone" dataKey="sma50" name="SMA 50"
                stroke="#a78bfa" strokeWidth={1.5} dot={false} />
              <Line yAxisId="price" type="monotone" dataKey="sma200" name="SMA 200"
                stroke="#f87171" strokeWidth={1.5} dot={false} />
            </>
          )}
          {overlay === 'bb' && (
            <>
              <Line yAxisId="price" type="monotone" dataKey="bb_upper" name="BB Upper"
                stroke="#22c55e" strokeWidth={1} strokeDasharray="4 2" dot={false} />
              <Line yAxisId="price" type="monotone" dataKey="bb_lower" name="BB Lower"
                stroke="#ef4444" strokeWidth={1} strokeDasharray="4 2" dot={false} />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
