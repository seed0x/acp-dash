'use client'
import { useState } from 'react'

export type TopBarProps = {
  onSearch: (q: string) => void
  onTypeChange: (t: string) => void
  selectedCount: number
  onBulkMove: (stage: string) => void
  stages: string[]
  refreshing?: boolean
  onRefresh?: () => void
}

export default function TopBar({
  onSearch, onTypeChange, selectedCount, onBulkMove, stages, refreshing, onRefresh
}: TopBarProps) {
  const [q, setQ] = useState('')
  const [t, setT] = useState('All')
  const [dest, setDest] = useState(stages[0] || '')

  return (
    <div className="flex flex-col lg:flex-row gap-3 items-center justify-between p-3 rounded-xl bg-[var(--card)]">
      <div className="flex gap-2 w-full lg:w-auto">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSearch(q)}
          placeholder="Search by title, customer, address…"
          className="px-3 py-2 rounded-lg bg-black/30 border border-white/10 w-full lg:w-72 outline-none"
        />
        <button onClick={() => onSearch(q)} className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 hover:bg-black/60">
          Search
        </button>
      </div>
      <div className="flex items-center gap-3">
        <select
          value={t}
          onChange={e => { setT(e.target.value); onTypeChange(e.target.value) }}
          className="px-3 py-2 rounded-lg bg-black/30 border border-white/10"
        >
          <option>All</option>
          <option>Bid</option>
          <option>Job</option>
          <option>Invoice</option>
        </select>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--muted)]">Selected: {selectedCount}</span>
          <select
            value={dest}
            onChange={e => setDest(e.target.value)}
            className="px-2 py-2 rounded-lg bg-black/30 border border-white/10"
          >
            {stages.map(s => <option key={s}>{s}</option>)}
          </select>
          <button
            disabled={!selectedCount}
            onClick={() => onBulkMove(dest)}
            className="px-3 py-2 rounded-lg bg-emerald-600 disabled:opacity-50 hover:bg-emerald-500"
          >
            Move Selected
          </button>
          <button onClick={onRefresh} className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600">
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>
    </div>
  )
}
