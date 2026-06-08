import { useEffect, useState } from 'react'
import { api } from '../utils/api'
import { FileText } from 'lucide-react'

const SEC_FORM_COLORS = {
  '10-K': 'bg-blue-900/60 text-blue-400 border-blue-700',
  '10-Q': 'bg-purple-900/60 text-purple-400 border-purple-700',
  '8-K': 'bg-amber-900/60 text-amber-400 border-amber-700',
}

function SecFilings({ filings }) {
  if (filings.length === 0) return <p className="text-slate-500 text-sm">No SEC filings found</p>
  return (
    <div className="space-y-3">
      {filings.map((f, i) => (
        <div key={i} className="flex items-center gap-4 p-3 bg-slate-800 rounded-lg">
          <FileText className="w-5 h-5 text-slate-500 shrink-0" />
          <span className={`px-2 py-0.5 rounded text-xs font-bold border ${SEC_FORM_COLORS[f.form] || 'bg-slate-700 text-slate-300 border-slate-600'}`}>
            {f.form}
          </span>
          <span className="text-slate-300 text-sm flex-1">{f.document || '—'}</span>
          <span className="text-slate-500 text-xs">{f.date}</span>
        </div>
      ))}
    </div>
  )
}

function NseFilings({ filings }) {
  if (filings.length === 0) return <p className="text-slate-500 text-sm">No announcements found</p>
  return (
    <div className="space-y-2">
      {filings.map((a, i) => (
        <div key={i} className="flex items-start gap-3 p-3 bg-slate-800 rounded-lg">
          <FileText className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-slate-300 text-sm font-medium">
              {a.subject || a.subjects || a.desc || 'Corporate Announcement'}
            </p>
            <p className="text-slate-500 text-xs mt-0.5">{a.an_dt || a.date || ''}</p>
          </div>
          {a.attchmntFile && (
            <a
              href={a.attchmntFile}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-xs shrink-0 mt-0.5"
            >
              View ↗
            </a>
          )}
        </div>
      ))}
    </div>
  )
}

export default function FilingsTab({ ticker }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    api.filings(ticker)
      .then(setResult)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [ticker])

  if (loading) return <p className="text-slate-400 p-4">Loading filings…</p>
  if (error) return <p className="text-red-400 p-4">{error}</p>

  const isIndian = result?.market === 'IN'
  const filings = result?.filings || []

  return (
    <div className="bg-slate-900 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
        {isIndian ? 'NSE Corporate Announcements' : 'Recent SEC Filings (EDGAR)'}
      </h3>
      {isIndian ? <NseFilings filings={filings} /> : <SecFilings filings={filings} />}
    </div>
  )
}
