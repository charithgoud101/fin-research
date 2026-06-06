import { useState } from 'react'
import { Search } from 'lucide-react'

export default function SearchBar({ onSearch, loading }) {
  const [query, setQuery] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const t = query.trim().toUpperCase()
    if (t) onSearch(t)
  }

  return (
    <form onSubmit={submit} className="flex gap-3 w-full max-w-2xl mx-auto">
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter ticker symbol (e.g. AAPL, MSFT, TSLA)"
          className="w-full pl-12 pr-4 py-3.5 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-lg"
          disabled={loading}
        />
      </div>
      <button
        type="submit"
        disabled={loading || !query.trim()}
        className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-lg"
      >
        {loading ? 'Analyzing…' : 'Analyze'}
      </button>
    </form>
  )
}
