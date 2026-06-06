import { fmtPrice, fmtLarge } from '../utils/format'

function ScoreRing({ score, size = 120 }) {
  const r = 45
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color =
    score >= 70 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={color} strokeWidth="10"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x="50" y="46" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">
        {score}
      </text>
      <text x="50" y="62" textAnchor="middle" fill="#94a3b8" fontSize="9">
        /100
      </text>
    </svg>
  )
}

export default function ScoreCard({ data }) {
  const { ticker, name, exchange, sector, currency, score, fundamental } = data
  const composite = score.composite_score
  const bd = score.breakdown
  const price = fundamental?.current_price
  const marketCap = fundamental?.market_cap

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-white">{ticker}</h1>
            <span className="px-2.5 py-0.5 bg-slate-700 text-slate-300 text-sm rounded-full">
              {exchange}
            </span>
          </div>
          <p className="text-slate-300 text-lg">{name}</p>
          <p className="text-slate-500 text-sm mt-0.5">{sector}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-white">{fmtPrice(price)}</p>
          <p className="text-slate-400 text-sm">{currency} · {fmtLarge(marketCap)} mkt cap</p>
        </div>
      </div>

      {/* Score row */}
      <div className="flex items-center gap-8 bg-slate-900 rounded-xl p-5">
        <div className="flex flex-col items-center">
          <ScoreRing score={composite} size={110} />
          <p className="text-slate-400 text-xs mt-1">Overall Score</p>
        </div>

        <div className="flex-1">
          <div
            className="text-2xl font-bold mb-1"
            style={{ color: score.verdict_color }}
          >
            {score.verdict}
          </div>
          <p className="text-slate-400 text-sm mb-4">
            Confidence: <span className="text-slate-200">{score.confidence}</span>
          </p>

          <div className="space-y-2">
            {[
              { label: 'Fundamental', val: bd.fundamental, weight: '40%' },
              { label: 'Technical', val: bd.technical, weight: '35%' },
              { label: 'Sentiment', val: bd.sentiment, weight: '25%' },
            ].map(({ label, val, weight }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-slate-400 text-sm w-24">{label}</span>
                <div className="flex-1 bg-slate-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-700"
                    style={{
                      width: `${val}%`,
                      backgroundColor: val >= 70 ? '#22c55e' : val >= 50 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
                <span className="text-slate-200 text-sm w-8 text-right">{val}</span>
                <span className="text-slate-500 text-xs w-8">{weight}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
