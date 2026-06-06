const BASE = '/api'

async function request(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export const api = {
  analyze: (ticker) => request(`/analyze/${ticker}`),
  fundamental: (ticker) => request(`/fundamental/${ticker}`),
  technical: (ticker) => request(`/technical/${ticker}`),
  sentiment: (ticker) => request(`/sentiment/${ticker}`),
  news: (ticker) => request(`/news/${ticker}`),
  filings: (ticker) => request(`/filings/${ticker}`),
  search: (query) => request(`/search/${query}`),
}
