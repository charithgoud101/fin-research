import { useState } from 'react'
import { TrendingUp, AlertCircle, Loader2 } from 'lucide-react'
import SearchBar from './components/SearchBar'
import ScoreCard from './components/ScoreCard'
import PriceChart from './components/PriceChart'
import FundamentalTab from './components/FundamentalTab'
import TechnicalTab from './components/TechnicalTab'
import SentimentTab from './components/SentimentTab'
import FilingsTab from './components/FilingsTab'
import { api } from './utils/api'

const TABS = ['Fundamental', 'Technical', 'Sentiment', 'SEC Filings']

export default function App() {
  const [ticker, setTicker] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('Fundamental')

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

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <TrendingUp className="w-7 h-7 text-blue-500" />
          <span className="text-xl font-bold text-white">FinResearch</span>
          <span className="text-slate-500 text-sm ml-1">— Stock Analysis Tool</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Search */}
        <SearchBar onSearch={handleSearch} loading={loading} />

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
            <PriceChart chartData={data.technical?.chart_data || []} />

            {/* Tabs */}
            <div>
              <div className="flex gap-1 bg-slate-800 p-1 rounded-xl w-fit mb-4">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === 'Fundamental' && (
                <FundamentalTab data={data.fundamental} />
              )}
              {activeTab === 'Technical' && (
                <TechnicalTab data={data.technical} />
              )}
              {activeTab === 'Sentiment' && (
                <SentimentTab data={data.sentiment} />
              )}
              {activeTab === 'SEC Filings' && (
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
              Get a full analysis — fundamental ratios, technical indicators, sentiment scores,
              DCF valuation, and analyst recommendations — all in one report.
            </p>
            <div className="flex gap-2 mt-2 flex-wrap justify-center">
              {['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'AMZN'].map((t) => (
                <button
                  key={t}
                  onClick={() => handleSearch(t)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm rounded-full transition-colors"
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
