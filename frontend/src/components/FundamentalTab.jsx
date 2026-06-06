import { fmt, fmtPct, fmtLarge, fmtPrice, colorForChange } from '../utils/format'

function MetricRow({ label, value, good, neutral }) {
  let color = 'text-slate-300'
  if (good !== undefined && value !== null && value !== undefined) {
    color = good ? 'text-green-400' : neutral ? 'text-yellow-400' : 'text-red-400'
  }
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-700/50 last:border-0">
      <span className="text-slate-400 text-sm">{label}</span>
      <span className={`font-medium text-sm ${color}`}>{value}</span>
    </div>
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

export default function FundamentalTab({ data }) {
  const { valuation, profitability, liquidity_leverage: ll, growth, dcf, price_target } = data

  const pe = valuation?.pe_trailing
  const forwardPe = valuation?.pe_forward
  const pb = valuation?.price_to_book
  const evEbitda = valuation?.ev_to_ebitda

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <Section title="Valuation">
        <MetricRow label="P/E (Trailing)" value={fmt(pe)} good={pe && pe < 25} neutral={pe && pe < 35} />
        <MetricRow label="P/E (Forward)" value={fmt(forwardPe)} good={forwardPe && forwardPe < 20} neutral={forwardPe && forwardPe < 30} />
        <MetricRow label="Price / Book" value={fmt(pb)} good={pb && pb < 3} neutral={pb && pb < 6} />
        <MetricRow label="Price / Sales" value={fmt(valuation?.price_to_sales)} />
        <MetricRow label="EV / EBITDA" value={fmt(evEbitda)} good={evEbitda && evEbitda < 15} neutral={evEbitda && evEbitda < 25} />
        <MetricRow label="PEG Ratio" value={fmt(valuation?.peg_ratio)} good={valuation?.peg_ratio && valuation.peg_ratio < 1} neutral={valuation?.peg_ratio && valuation.peg_ratio < 2} />
      </Section>

      <Section title="Profitability">
        <MetricRow label="Gross Margin" value={fmtPct(profitability?.gross_margin)} good={profitability?.gross_margin > 30} neutral={profitability?.gross_margin > 15} />
        <MetricRow label="Operating Margin" value={fmtPct(profitability?.operating_margin)} good={profitability?.operating_margin > 15} neutral={profitability?.operating_margin > 5} />
        <MetricRow label="Net Margin" value={fmtPct(profitability?.net_margin)} good={profitability?.net_margin > 10} neutral={profitability?.net_margin > 3} />
        <MetricRow label="ROE" value={fmtPct(profitability?.roe)} good={profitability?.roe > 15} neutral={profitability?.roe > 8} />
        <MetricRow label="ROA" value={fmtPct(profitability?.roa)} good={profitability?.roa > 5} neutral={profitability?.roa > 2} />
      </Section>

      <Section title="Liquidity & Leverage">
        <MetricRow label="Current Ratio" value={fmt(ll?.current_ratio)} good={ll?.current_ratio > 1.5} neutral={ll?.current_ratio > 1} />
        <MetricRow label="Quick Ratio" value={fmt(ll?.quick_ratio)} good={ll?.quick_ratio > 1} neutral={ll?.quick_ratio > 0.7} />
        <MetricRow label="Debt / Equity" value={fmt(ll?.debt_to_equity)} good={ll?.debt_to_equity < 50} neutral={ll?.debt_to_equity < 100} />
        <MetricRow label="Total Debt" value={fmtLarge(ll?.total_debt)} />
        <MetricRow label="Total Cash" value={fmtLarge(ll?.total_cash)} />
        <MetricRow label="Free Cash Flow" value={fmtLarge(ll?.free_cash_flow)} good={ll?.free_cash_flow > 0} />
      </Section>

      <Section title="Growth">
        <MetricRow
          label="Revenue Growth (YoY)"
          value={fmtPct(growth?.revenue_growth_yoy)}
          good={growth?.revenue_growth_yoy > 10}
          neutral={growth?.revenue_growth_yoy > 0}
        />
        <MetricRow
          label="Earnings Growth (YoY)"
          value={fmtPct(growth?.earnings_growth_yoy)}
          good={growth?.earnings_growth_yoy > 10}
          neutral={growth?.earnings_growth_yoy > 0}
        />
        <MetricRow label="EPS (Trailing)" value={fmt(growth?.eps_trailing)} />
        <MetricRow label="EPS (Forward)" value={fmt(growth?.eps_forward)} />
      </Section>

      <Section title="DCF Valuation">
        <MetricRow label="Intrinsic Value (DCF)" value={fmtPrice(dcf?.intrinsic_value)} />
        <MetricRow
          label="Upside / Downside"
          value={dcf?.upside_pct != null ? fmtPct(dcf.upside_pct) : '—'}
          good={dcf?.upside_pct > 10}
          neutral={dcf?.upside_pct > -5}
        />
      </Section>

      <Section title="Analyst Targets">
        <MetricRow label="Mean Price Target" value={fmtPrice(price_target?.mean)} />
        <MetricRow
          label="Target Upside"
          value={price_target?.upside_pct != null ? fmtPct(price_target.upside_pct) : '—'}
          good={price_target?.upside_pct > 10}
          neutral={price_target?.upside_pct > 0}
        />
        <MetricRow label="Analyst Count" value={price_target?.analyst_count ?? '—'} />
        <MetricRow label="Consensus" value={price_target?.recommendation?.toUpperCase() ?? '—'} />
      </Section>
    </div>
  )
}
