import { useState } from 'react'
import { Search } from 'lucide-react'

export default function SearchBar({ onSearch, loading, market, onMarketChange }) {
  const [query, setQuery] = useState('')

  const submit = (e) => {
    e.preventDefault()
    let t = query.trim().toUpperCase()
    if (!t) return
    // Auto-append .NS for India market if no exchange suffix present
    if (market === 'IN' && !t.includes('.')) {
      t = `${t}.NS`
    }
    onSearch(t)
  }

  const placeholder =
    market === 'IN'
      ? 'Enter NSE symbol (e.g. RELIANCE, TCS, INFY)'
      : 'Enter ticker symbol (e.g. AAPL, MSFT, TSLA)'

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3">
      {/* Market toggle */}
      <div className="flex items-center justify-center gap-1 bg-slate-800 p-1 rounded-xl w-fit mx-auto">
        <button
          type="button"
          onClick={() => onMarketChange('US')}
          className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
            market === 'US'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          🇺🇸 US Markets
        </button>
        <button
          type="button"
          onClick={() => onMarketChange('IN')}
          className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
            market === 'IN'
              ? 'bg-orange-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          🇮🇳 India (NSE)
        </button>
      </div>

      {/* Search form */}
      <form onSubmit={submit} className="flex gap-3 w-full">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-12 pr-4 py-3.5 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-lg"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className={`px-8 py-3.5 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-lg ${
            market === 'IN'
              ? 'bg-orange-600 hover:bg-orange-500'
              : 'bg-blue-600 hover:bg-blue-500'
          }`}
        >
          {loading ? 'Analyzing…' : 'Analyze'}
        </button>
      </form>
    </div>
  )
}
