import { useState } from 'react'
import { TrendingUp, AlertCircle, Loader2 } from 'lucide-react'
import SearchBar from './components/SearchBar'
import ScoreCard from './components/ScoreCard'
import PriceChart from './components/PriceChart'
import FundamentalTab from './components/FundamentalTab'
import TechnicalTab from './components/TechnicalTab'
import SentimentTab from './components/SentimentTab'
import FilingsTab from './components/FilingsTab'
import IndiaTab from './components/IndiaTab'
import { api } from './utils/api'

const US_EXAMPLES = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'AMZN']
const IN_EXAMPLES = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'WIPRO', 'ICICIBANK']

function isIndianTicker(ticker) {
  return ticker?.endsWith('.NS') || ticker?.endsWith('.BO')
}

function getTabs(ticker) {
  const base = ['Fundamental', 'Technical', 'Sentiment']
  if (isIndianTicker(ticker)) {
    return [...base, 'India Markets', 'Filings']
  }
  return [...base, 'SEC Filings']
}

export default function App() {
  const [ticker, setTicker] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('Fundamental')
  const [market, setMarket] = useState('US')

  const handleSearch = async (symbol) => {
    setLoading(true)
    setError(null)
    setData(null)
    setTicker(symbol)
    try {
      const result = await api.analyze(symbol)
      setData(result)
      setActiveTab('Fundamental')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExampleClick = (t) => {
    const resolved = market === 'IN' && !t.includes('.') ? `${t}.NS` : t
    handleSearch(resolved)
  }

  const handleMarketChange = (m) => {
    setMarket(m)
    setData(null)
    setError(null)
    setTicker(null)
  }

  const tabs = getTabs(ticker)
  const indian = isIndianTicker(ticker)

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <TrendingUp className="w-7 h-7 text-blue-500" />
          <span className="text-xl font-bold text-white">FinResearch</span>
          <span className="text-slate-500 text-sm ml-1">— Stock Analysis Tool</span>
          {indian && (
            <span className="ml-auto text-xs px-2.5 py-1 rounded-full bg-orange-900/50 border border-orange-700 text-orange-400 font-medium">
              🇮🇳 NSE / BSE
            </span>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Search */}
        <SearchBar
          onSearch={handleSearch}
          loading={loading}
          market={market}
          onMarketChange={handleMarketChange}
        />

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <p className="text-slate-400 text-lg">Analyzing {ticker}…</p>
            <p className="text-slate-600 text-sm">Fetching fundamental, technical & sentiment data</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-center gap-3 bg-red-950 border border-red-800 rounded-xl p-4">
            <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
            <div>
              <p className="text-red-300 font-medium">Analysis failed for {ticker}</p>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {data && !loading && (
          <>
            <ScoreCard data={data} />
            <PriceChart chartData={data.technical?.chart_data || []} currency={data.currency} />

            {/* Tabs */}
            <div>
              <div className="flex gap-1 bg-slate-800 p-1 rounded-xl w-fit mb-4 flex-wrap">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? indian ? 'bg-orange-600 text-white' : 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === 'Fundamental' && <FundamentalTab data={data.fundamental} currency={data.currency} />}
              {activeTab === 'Technical' && <TechnicalTab data={data.technical} currency={data.currency} />}
              {activeTab === 'Sentiment' && <SentimentTab data={data.sentiment} />}
              {activeTab === 'India Markets' && <IndiaTab ticker={data.ticker} />}
              {(activeTab === 'SEC Filings' || activeTab === 'Filings') && (
                <FilingsTab ticker={data.ticker} />
              )}
            </div>

            {/* Description */}
            {data.description && (
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  About {data.name}
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed line-clamp-4">
                  {data.description}
                </p>
                <p className="text-slate-500 text-xs mt-2">
                  {data.employees?.toLocaleString()} employees · {data.sector} · {data.industry}
                </p>
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!data && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <TrendingUp className="w-16 h-16 text-slate-700" />
            <h2 className="text-slate-400 text-xl font-medium">Enter a ticker to begin</h2>
            <p className="text-slate-600 text-sm max-w-md">
              {market === 'IN'
                ? 'Get full analysis for NSE-listed stocks — fundamental ratios, technical indicators, FII/DII flows, delivery %, shareholding pattern, and NSE announcements.'
                : 'Get a full analysis — fundamental ratios, technical indicators, sentiment scores, DCF valuation, and analyst recommendations — all in one report.'}
            </p>
            <div className="flex gap-2 mt-2 flex-wrap justify-center">
              {(market === 'IN' ? IN_EXAMPLES : US_EXAMPLES).map((t) => (
                <button
                  key={t}
                  onClick={() => handleExampleClick(t)}
                  className={`px-4 py-1.5 border text-slate-300 text-sm rounded-full transition-colors ${
                    market === 'IN'
                      ? 'bg-orange-900/20 hover:bg-orange-900/40 border-orange-800'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
