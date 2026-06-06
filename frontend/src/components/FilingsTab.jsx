import { useEffect, useState } from 'react'
import { api } from '../utils/api'
import { FileText, ExternalLink } from 'lucide-react'

const FORM_COLORS = {
  '10-K': 'bg-blue-900/60 text-blue-400 border-blue-700',
  '10-Q': 'bg-purple-900/60 text-purple-400 border-purple-700',
  '8-K': 'bg-amber-900/60 text-amber-400 border-amber-700',
}

export default function FilingsTab({ ticker }) {
  const [filings, setFilings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    api.filings(ticker)
      .then((d) => setFilings(d.filings || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [ticker])

  if (loading) return <p className="text-slate-400 p-4">Loading SEC filings…</p>
  if (error) return <p className="text-red-400 p-4">{error}</p>

  return (
    <div className="bg-slate-900 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
        Recent SEC Filings (EDGAR)
      </h3>
      {filings.length === 0 ? (
        <p className="text-slate-500 text-sm">No filings found</p>
      ) : (
        <div className="space-y-3">
          {filings.map((f, i) => (
            <div key={i} className="flex items-center gap-4 p-3 bg-slate-800 rounded-lg">
              <FileText className="w-5 h-5 text-slate-500 shrink-0" />
              <span className={`px-2 py-0.5 rounded text-xs font-bold border ${FORM_COLORS[f.form] || 'bg-slate-700 text-slate-300 border-slate-600'}`}>
                {f.form}
              </span>
              <span className="text-slate-300 text-sm flex-1">{f.document || '—'}</span>
              <span className="text-slate-500 text-xs">{f.date}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
