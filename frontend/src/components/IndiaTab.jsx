import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, Cell,
} from 'recharts'
import { api } from '../utils/api'
import { fmtPrice, fmtPct } from '../utils/format'
import { TrendingUp, TrendingDown, Activity, Shield } from 'lucide-react'

function InfoCard({ label, value, sub, icon: Icon, color = 'text-white' }) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 flex items-start gap-3">
      {Icon && <Icon className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />}
      <div>
        <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">{label}</p>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
        {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function HoldingBar({ label, pct, color }) {
  if (pct == null) return null
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-400 text-sm w-28 shrink-0">{label}</span>
      <div className="flex-1 bg-slate-700 rounded-full h-2.5">
        <div
          className="h-2.5 rounded-full transition-all duration-700"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-slate-200 text-sm w-14 text-right">{pct.toFixed(1)}%</span>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm">
      <p className="text-slate-300 font-medium mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: ₹{Number(p.value).toFixed(2)}Cr
        </p>
      ))}
    </div>
  )
}

export default function IndiaTab({ ticker }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api.indiaData(ticker)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [ticker])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        Loading India market data…
      </div>
    )
  }
  if (error) {
    return <p className="text-red-400 p-4">{error}</p>
  }
  if (!data) return null

  const { fii_dii_flows = [], delivery = {}, circuit_limits = {}, shareholding = {}, announcements = [] } = data

  // FII/DII is already sorted oldest→newest from nse-service
  const chartData = fii_dii_flows.map((d) => ({
    date: d.date || '',
    fii: parseFloat(d.fii_net ?? 0),
    dii: parseFloat(d.dii_net ?? 0),
  }))

  const deliveryPct = parseFloat(delivery.delivery_pct ?? 0)
  const deliveryColor =
    deliveryPct >= 60 ? '#22c55e' : deliveryPct >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div className="space-y-5">
      {/* Stock-level indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InfoCard
          label="Delivery %"
          value={delivery.delivery_pct != null ? `${delivery.delivery_pct}%` : '—'}
          sub="Today's delivery volume"
          icon={Activity}
          color={delivery.delivery_pct != null ? (deliveryPct >= 50 ? 'text-green-400' : 'text-red-400') : 'text-slate-400'}
        />
        <InfoCard
          label="Upper Circuit"
          value={circuit_limits.upper_circuit ? `₹${Number(circuit_limits.upper_circuit).toFixed(2)}` : '—'}
          sub={circuit_limits.price_band ? `Band: ${circuit_limits.price_band}` : undefined}
          icon={TrendingUp}
          color="text-green-400"
        />
        <InfoCard
          label="Lower Circuit"
          value={circuit_limits.lower_circuit ? `₹${Number(circuit_limits.lower_circuit).toFixed(2)}` : '—'}
          sub="Price floor today"
          icon={TrendingDown}
          color="text-red-400"
        />
        <InfoCard
          label="52W High / Low"
          value={
            circuit_limits.week_high_52 && circuit_limits.week_low_52
              ? `₹${Number(circuit_limits.week_high_52).toFixed(0)} / ₹${Number(circuit_limits.week_low_52).toFixed(0)}`
              : '—'
          }
          sub="52-week range"
          icon={Shield}
        />
      </div>

      {/* Shareholding Pattern */}
      {shareholding && Object.keys(shareholding).length > 0 && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Shareholding Pattern
            {shareholding.date && (
              <span className="ml-2 text-slate-600 font-normal normal-case">
                (as of {shareholding.date})
              </span>
            )}
          </h3>
          <div className="space-y-3">
            <HoldingBar label="Promoters" pct={shareholding.promoter} color="#3b82f6" />
            <HoldingBar label="Public" pct={shareholding.public} color="#6b7280" />
            {shareholding.fii != null && <HoldingBar label="FII / FPI" pct={shareholding.fii} color="#8b5cf6" />}
            {shareholding.dii != null && <HoldingBar label="DII / MF" pct={shareholding.dii} color="#f59e0b" />}
          </div>
          <p className="text-slate-600 text-xs mt-3">
            High promoter holding (&gt; 50%) indicates strong founder confidence.
          </p>
        </div>
      )}

      {/* FII / DII Flows */}
      {chartData.length > 0 ? (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">
            FII / DII Net Flows — Last 30 Days (₹ Crore)
          </h3>
          <p className="text-slate-600 text-xs mb-4">
            FII = Foreign Institutional Investors · DII = Domestic Institutional Investors
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={2} barCategoryGap="20%">
              <XAxis
                dataKey="date"
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#334155" strokeWidth={1} />
              <Bar dataKey="fii" name="FII Net" radius={[2, 2, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.fii >= 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
              <Bar dataKey="dii" name="DII Net" radius={[2, 2, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.dii >= 0 ? '#3b82f6' : '#f97316'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> FII Buy</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> FII Sell</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> DII Buy</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-500 inline-block" /> DII Sell</span>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
            FII / DII Flows
          </h3>
          <p className="text-slate-500 text-sm">
            FII/DII flow data unavailable — NSE may be blocking the request. Try again later.
          </p>
        </div>
      )}

      {/* Delivery % Explanation */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Delivery Volume Analysis
        </h3>
        <div className="flex items-center gap-4 mb-3">
          <div className="relative w-24 h-24 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="12" />
              <circle
                cx="50" cy="50" r="40"
                fill="none"
                stroke={deliveryColor}
                strokeWidth="12"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - Math.min(deliveryPct, 100) / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {delivery.delivery_pct != null ? `${deliveryPct.toFixed(0)}%` : '—'}
              </span>
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-slate-300">
              <span className="font-semibold" style={{ color: deliveryColor }}>
                {deliveryPct >= 60 ? 'High' : deliveryPct >= 40 ? 'Moderate' : 'Low'} Delivery
              </span>{' '}
              — {deliveryPct >= 60
                ? 'Genuine buying interest. Investors are holding positions.'
                : deliveryPct >= 40
                ? 'Mixed intraday and delivery trades.'
                : 'Mostly intraday activity. Lower conviction.'}
            </p>
            {delivery.total_traded_qty && (
              <p className="text-slate-500">
                Total traded: {Number(delivery.total_traded_qty).toLocaleString()} shares
              </p>
            )}
          </div>
        </div>
      </div>

      {/* NSE Announcements */}
      {announcements.length > 0 && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            NSE Corporate Announcements (Last 90 Days)
          </h3>
          <div className="space-y-2">
            {announcements.map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-slate-800 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-300 text-sm font-medium truncate">
                    {a.subject || a.subjects || a.desc || 'Corporate Announcement'}
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5">{a.an_dt || a.date || ''}</p>
                </div>
                {a.attchmntFile && (
                  <a
                    href={a.attchmntFile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-xs shrink-0 mt-0.5"
                  >
                    View ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
