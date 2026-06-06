import { fmt, fmtPct } from '../utils/format'

function Badge({ label, color }) {
  const colors = {
    positive: 'bg-green-900/60 text-green-400 border-green-700',
    negative: 'bg-red-900/60 text-red-400 border-red-700',
    neutral: 'bg-slate-700 text-slate-300 border-slate-600',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors[color] || colors.neutral}`}>
      {label}
    </span>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-slate-900 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  )
}

function AnalystBar({ label, count, total, color }) {
  const pct = total ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="text-slate-400 text-sm w-24">{label}</span>
      <div className="flex-1 bg-slate-700 rounded-full h-2">
        <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-slate-300 text-sm w-6 text-right">{count}</span>
    </div>
  )
}

export default function SentimentTab({ data }) {
  const { news_sentiment: ns, analyst_recommendations: ar, yf_analyst_summary: ya, recent_headlines } = data

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* News Sentiment */}
        <Section title="News Sentiment (Finnhub)">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Company News Score', val: ns?.company_news_score != null ? fmt(ns.company_news_score, 3) : '—' },
              { label: 'Buzz Score', val: ns?.buzz_score != null ? fmt(ns.buzz_score, 2) : '—' },
              { label: 'Articles (7 days)', val: ns?.articles_weekly ?? '—' },
              { label: 'Weekly Average', val: ns?.weekly_average != null ? fmt(ns.weekly_average, 1) : '—' },
              { label: 'Bullish %', val: ns?.bullish_pct != null ? fmtPct(ns.bullish_pct * 100) : '—' },
              { label: 'Bearish %', val: ns?.bearish_pct != null ? fmtPct(ns.bearish_pct * 100) : '—' },
            ].map(({ label, val }) => (
              <div key={label} className="bg-slate-800 rounded-lg p-3">
                <p className="text-slate-500 text-xs mb-1">{label}</p>
                <p className="text-white font-semibold">{val}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Analyst Recommendations */}
        <Section title="Analyst Recommendations">
          {ar?.total ? (
            <>
              <div className="mb-4">
                <span className="text-xl font-bold text-white">{ar.consensus}</span>
                <span className="text-slate-400 text-sm ml-2">· {ar.total} analysts · {ar.period}</span>
              </div>
              <AnalystBar label="Strong Buy" count={ar.strong_buy} total={ar.total} color="#16a34a" />
              <AnalystBar label="Buy" count={ar.buy} total={ar.total} color="#22c55e" />
              <AnalystBar label="Hold" count={ar.hold} total={ar.total} color="#f59e0b" />
              <AnalystBar label="Sell" count={ar.sell} total={ar.total} color="#ef4444" />
              <AnalystBar label="Strong Sell" count={ar.strong_sell} total={ar.total} color="#b91c1c" />
              <div className="flex gap-4 mt-3 pt-3 border-t border-slate-700">
                <p className="text-green-400 text-sm">Bullish: {ar.bullish_pct}%</p>
                <p className="text-red-400 text-sm">Bearish: {ar.bearish_pct}%</p>
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-sm">No recommendation data available</p>
          )}
        </Section>

        {/* Yahoo Analyst Summary */}
        <Section title="Yahoo Finance Analyst Summary">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Recommendation', val: ya?.recommendation?.toUpperCase() ?? '—' },
              { label: 'Rating Mean (1-5)', val: ya?.recommendation_mean != null ? fmt(ya.recommendation_mean, 2) : '—' },
              { label: 'Price Target', val: ya?.target_price_mean != null ? `$${fmt(ya.target_price_mean)}` : '—' },
              { label: 'Analyst Count', val: ya?.analyst_count ?? '—' },
            ].map(({ label, val }) => (
              <div key={label} className="bg-slate-800 rounded-lg p-3">
                <p className="text-slate-500 text-xs mb-1">{label}</p>
                <p className="text-white font-semibold">{val}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Recent Headlines */}
      <Section title="Recent Headlines (7 Days)">
        {recent_headlines?.length ? (
          <div className="space-y-3">
            {recent_headlines.map((h, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-slate-800 rounded-lg">
                <Badge
                  label={h.sentiment}
                  color={h.sentiment === 'positive' ? 'positive' : h.sentiment === 'negative' ? 'negative' : 'neutral'}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-sm leading-snug">{h.headline}</p>
                  <p className="text-slate-500 text-xs mt-1">{h.source}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">No recent headlines available</p>
        )}
      </Section>
    </div>
  )
}
