import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { api } from '../utils/api'

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function SearchBar({ onSearch, loading, market, onMarketChange }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showDrop, setShowDrop] = useState(false)
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const [fetching, setFetching] = useState(false)
  const inputRef = useRef(null)
  const dropRef = useRef(null)
  const debouncedQuery = useDebounce(query, 300)

  // Fetch suggestions when debounced query changes
  useEffect(() => {
    const q = debouncedQuery.trim()
    if (q.length < 1) {
      setSuggestions([])
      setShowDrop(false)
      return
    }
    let cancelled = false
    setFetching(true)
    api.autocomplete(q, market)
      .then((d) => {
        if (!cancelled) {
          setSuggestions(d.results || [])
          setShowDrop((d.results || []).length > 0)
          setFocusedIdx(-1)
        }
      })
      .catch(() => { if (!cancelled) setSuggestions([]) })
      .finally(() => { if (!cancelled) setFetching(false) })
    return () => { cancelled = true }
  }, [debouncedQuery, market])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (!dropRef.current?.contains(e.target) && !inputRef.current?.contains(e.target)) {
        setShowDrop(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectSuggestion = useCallback((symbol) => {
    setQuery(symbol)
    setShowDrop(false)
    setSuggestions([])
    onSearch(symbol)
  }, [onSearch])

  const submit = (e) => {
    e.preventDefault()
    if (focusedIdx >= 0 && suggestions[focusedIdx]) {
      selectSuggestion(suggestions[focusedIdx].symbol)
      return
    }
    let t = query.trim().toUpperCase()
    if (!t) return
    if (market === 'IN' && !t.includes('.')) t = `${t}.NS`
    setShowDrop(false)
    onSearch(t)
  }

  const handleKeyDown = (e) => {
    if (!showDrop || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIdx((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIdx((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Escape') {
      setShowDrop(false)
      setFocusedIdx(-1)
    }
  }

  const handleMarketChange = (m) => {
    onMarketChange(m)
    setQuery('')
    setSuggestions([])
    setShowDrop(false)
  }

  const placeholder =
    market === 'IN'
      ? 'Search NSE stocks (e.g. Reliance, TCS, HDFC…)'
      : 'Search stocks (e.g. Apple, AAPL, Tesla…)'

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3">
      {/* Market toggle */}
      <div className="flex items-center justify-center gap-1 bg-slate-800 p-1 rounded-xl w-fit mx-auto">
        <button
          type="button"
          onClick={() => handleMarketChange('US')}
          className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
            market === 'US' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          🇺🇸 US Markets
        </button>
        <button
          type="button"
          onClick={() => handleMarketChange('IN')}
          className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
            market === 'IN' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          🇮🇳 India (NSE)
        </button>
      </div>

      {/* Search form + dropdown */}
      <form onSubmit={submit} className="flex gap-3 w-full relative">
        <div className="relative flex-1">
          {/* Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 z-10" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => suggestions.length > 0 && setShowDrop(true)}
              placeholder={placeholder}
              autoComplete="off"
              spellCheck={false}
              className="w-full pl-12 pr-10 py-3.5 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-lg"
              disabled={loading}
            />
            {fetching && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 animate-spin" />
            )}
          </div>

          {/* Dropdown */}
          {showDrop && suggestions.length > 0 && (
            <div
              ref={dropRef}
              className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              {suggestions.map((s, i) => (
                <button
                  key={`${s.symbol}-${i}`}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s.symbol) }}
                  onMouseEnter={() => setFocusedIdx(i)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-700/50 last:border-0 ${
                    i === focusedIdx ? 'bg-slate-700' : 'hover:bg-slate-750'
                  }`}
                >
                  {/* Symbol badge */}
                  <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded ${
                    market === 'IN'
                      ? 'bg-orange-900/60 text-orange-300'
                      : 'bg-blue-900/60 text-blue-300'
                  }`}>
                    {s.symbol.replace('.NS', '').replace('.BO', '')}
                  </span>

                  {/* Name */}
                  <span className="flex-1 text-sm text-slate-200 truncate">{s.name}</span>

                  {/* Exchange + type */}
                  <span className="shrink-0 text-xs text-slate-500">{s.exchange}</span>
                </button>
              ))}
              <div className="px-4 py-1.5 text-xs text-slate-600 bg-slate-900/50">
                ↑↓ navigate · Enter select · Esc close
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !query.trim()}
          className={`px-8 py-3.5 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-lg shrink-0 ${
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
