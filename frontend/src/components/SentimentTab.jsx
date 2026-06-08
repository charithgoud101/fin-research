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

function Section({ title, subtitle, children }) {
  return (
    <div className="bg-slate-900 rounded-xl p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{title}</h3>
        {subtitle && <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p>}
      </div>
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

function SentimentGauge({ score, label }) {
  const clamp = Math.max(0, Math.min(100, score ?? 50))
  const color = clamp >= 60 ? '#22c55e' : clamp <= 40 ? '#ef4444' : '#f59e0b'
  const textColor = clamp >= 60 ? 'text-green-400' : clamp <= 40 ? 'text-red-400' : 'text-amber-400'
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className={`text-3xl font-bold ${textColor}`}>{clamp}</span>
        <span className={`text-sm font-medium ${textColor}`}>{label}</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-3">
        <div
          className="h-3 rounded-full transition-all duration-500"
          style={{ width: `${clamp}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-600">
        <span>Bearish 0</span>
        <span>Neutral 50</span>
        <span>100 Bullish</span>
      </div>
    </div>
  )
}

function SentimentPill({ pct, label, color }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-slate-400 text-sm">{label}</span>
      <span className="text-white font-semibold ml-auto">{pct?.toFixed(1)}%</span>
    </div>
  )
}

function HeadlineCard({ item }) {
  const sentiment = item.sentiment || 'neutral'
  const isReddit = item.source_type === 'social'
  return (
    <div className="flex items-start gap-3 p-3 bg-slate-800 rounded-lg">
      <Badge label={sentiment} color={sentiment} />
      <div className="flex-1 min-w-0">
        <p className="text-slate-200 text-sm leading-snug">
          {item.url ? (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
               className="hover:text-blue-400 transition-colors">
              {item.text || item.headline}
            </a>
          ) : (
            item.text || item.headline
          )}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-slate-500 text-xs">{item.source}</span>
          {item.published && (
            <span className="text-slate-600 text-xs">· {item.published}</span>
          )}
          {isReddit && item.upvotes != null && (
            <span className="text-slate-500 text-xs">· ↑{item.upvotes} · {item.comments} comments</span>
          )}
          {item.score != null && item.score !== 0 && (
            <span className={`text-xs font-medium ml-auto ${
              item.score > 0.05 ? 'text-green-500' : item.score < -0.05 ? 'text-red-500' : 'text-slate-500'
            }`}>
              {item.score > 0 ? '+' : ''}{item.score.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── India-specific view ──────────────────────────────────────────────────────

function IndiaSentimentView({ data }) {
  const iws = data.india_web_sentiment
  const ya = data.yf_analyst_summary
  const headlines = data.recent_headlines || []

  const scoreLabel = () => {
    const r = iws?.score?.raw ?? 50
    if (r >= 70) return 'Strongly Bullish'
    if (r >= 60) return 'Bullish'
    if (r <= 30) return 'Strongly Bearish'
    if (r <= 40) return 'Bearish'
    return 'Neutral'
  }

  const totalItems = iws?.total_items ?? 0
  const sourceBreakdown = [
    { label: 'Google News (IN)', count: iws?.google_news_count ?? 0, score: iws?.news_avg_compound },
    { label: 'LiveMint / BusinessLine', count: iws?.supplementary_count ?? 0, score: iws?.supplementary_avg_compound },
  ].filter(s => s.count > 0)

  return (
    <div className="space-y-4">
      {/* Score + breakdown row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Overall Web Sentiment" subtitle={`Based on ${totalItems} sources scraped live`}>
          <SentimentGauge score={iws?.score?.raw} label={scoreLabel()} />
          <div className="mt-4 space-y-2">
            <SentimentPill pct={iws?.bullish_pct} label="Bullish" color="#22c55e" />
            <SentimentPill pct={iws?.neutral_pct} label="Neutral" color="#f59e0b" />
            <SentimentPill pct={iws?.bearish_pct} label="Bearish" color="#ef4444" />
          </div>
          {totalItems === 0 && (
            <p className="text-slate-500 text-sm mt-2">No articles found — try again in a few seconds</p>
          )}
        </Section>

        <div className="space-y-4">
          {/* Source breakdown */}
          <Section title="Source Breakdown">
            {sourceBreakdown.length ? (
              <div className="space-y-3">
                {sourceBreakdown.map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-300 text-sm font-medium">{s.label}</span>
                      <span className="text-slate-500 text-xs ml-2">{s.count} items</span>
                    </div>
                    {s.score != null && (
                      <span className={`text-sm font-semibold ${
                        s.score > 0.05 ? 'text-green-400' : s.score < -0.05 ? 'text-red-400' : 'text-slate-400'
                      }`}>
                        {s.score > 0 ? '+' : ''}{s.score.toFixed(3)}
                      </span>
                    )}
                  </div>
                ))}
                <p className="text-slate-600 text-xs mt-1">Compound score: −1 (very negative) → +1 (very positive)</p>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No sources returned data yet</p>
            )}
          </Section>

          {/* Yahoo analyst summary */}
          <Section title="Analyst Consensus (Yahoo Finance)">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Recommendation', val: ya?.recommendation?.toUpperCase() ?? '—' },
                { label: 'Rating (1–5)', val: ya?.recommendation_mean != null ? fmt(ya.recommendation_mean, 2) : '—' },
                { label: 'Price Target', val: ya?.target_price_mean != null ? `₹${fmt(ya.target_price_mean)}` : '—' },
                { label: 'No. of Analysts', val: ya?.analyst_count ?? '—' },
              ].map(({ label, val }) => (
                <div key={label} className="bg-slate-800 rounded-lg p-3">
                  <p className="text-slate-500 text-xs mb-1">{label}</p>
                  <p className="text-white font-semibold text-sm">{val}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>

      {/* Headlines */}
      <Section
        title="Top Headlines & Reddit Buzz"
        subtitle="Sorted by sentiment strength — click to open original source"
      >
        {headlines.length ? (
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {headlines.map((h, i) => (
              <HeadlineCard key={i} item={h} />
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">No headlines available</p>
        )}
      </Section>
    </div>
  )
}

// ── US view (original) ───────────────────────────────────────────────────────

function USSentimentView({ data }) {
  const { news_sentiment: ns, analyst_recommendations: ar, yf_analyst_summary: ya, recent_headlines } = data

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      <Section title="Recent Headlines (7 Days)">
        {recent_headlines?.length ? (
          <div className="space-y-3">
            {recent_headlines.map((h, i) => (
              <HeadlineCard key={i} item={h} />
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">No recent headlines available</p>
        )}
      </Section>
    </div>
  )
}

// ── Default export ───────────────────────────────────────────────────────────

export default function SentimentTab({ data }) {
  if (!data) return null
  const isIndia = !!data.india_web_sentiment
  return isIndia ? <IndiaSentimentView data={data} /> : <USSentimentView data={data} />
}
