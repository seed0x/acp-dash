// src/components/ProjectsBoard.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import ProjectCard from './ProjectCard'

type Item = {
  id: string
  title: string
  status?: string
  client?: string
  location?: string
  deadline?: string | null
  budget?: number | null
  spent?: number | null
  url?: string
}

export default function ProjectsBoard() {
  const [items, setItems] = useState<Item[]>([])
  const [statuses, setStatuses] = useState<string[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('All')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async (opts?: { q?: string; status?: string }) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/list?q=${encodeURIComponent(opts?.q ?? q)}&status=${encodeURIComponent(opts?.status ?? status)}`, { cache: 'no-store' })
      const data = await res.json()
      setItems(data.items || [])
      setStatuses(data.statusOptions || [])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const grouped = useMemo(() => {
    const allStatuses = statuses.length ? statuses : Array.from(new Set(items.map(i => i.status).filter(Boolean))) as string[]
    const buckets: Record<string, Item[]> = {}
    for (const s of allStatuses) buckets[s] = []
    // unknown status bucket
    if (!buckets['(No Status)']) buckets['(No Status)'] = []
    for (const it of items) {
      const key = it.status || '(No Status)'
      if (!buckets[key]) buckets[key] = []
      buckets[key].push(it)
    }
    return buckets
  }, [items, statuses])

  const toggle = (id: string) => setSelected(s => ({ ...s, [id]: !s[id] }))
  const selectedCount = Object.values(selected).filter(Boolean).length

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col lg:flex-row gap-3 items-center justify-between p-3 rounded-xl bg-[var(--card)]">
        <div className="flex gap-2 w-full lg:w-auto">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load({ q })}
            placeholder="Search by project, client, location…"
            className="px-3 py-2 rounded-lg bg-black/30 border border-white/10 w-full lg:w-80 outline-none"
          />
          <button onClick={() => load({ q })} className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 hover:bg-black/60">Search</button>
        </div>
        <div className="flex items-center gap-3">
          <select value={status} onChange={e => { setStatus(e.target.value); load({ status: e.target.value }) }} className="px-3 py-2 rounded-lg bg-black/30 border border-white/10">
            <option>All</option>
            {statuses.map(s => <option key={s}>{s}</option>)}
            {!statuses.length && <option>(No Status)</option>}
          </select>
          <span className="text-xs text-[var(--muted)]">Selected: {selectedCount}</span>
          <button onClick={() => load()} className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600">{refreshing ? 'Refreshing…' : 'Refresh'}</button>
        </div>
      </div>

      {/* Empty hint */}
      {!loading && items.length === 0 && (
        <div className="text-sm p-3 rounded-lg bg-black/30 border border-white/10">
          No projects found. Check your <code>NOTION_PROJECTS_DB_ID</code>, or try clearing the Status filter.
        </div>
      )}

      {/* Columns */}
      <div className="flex gap-3 overflow-x-auto">
        {Object.entries(grouped).map(([col, arr]) => (
          <div key={col} className="min-w-[320px] w-full">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">
                {col} <span className="text-xs text-[var(--muted)]">({arr.length})</span>
              </h2>
            </div>
            <div className="grid gap-2">
              {arr.map(it => (
                <ProjectCard
                  key={it.id}
                  {...it}
                  selected={!!selected[it.id]}
                  onSelect={() => toggle(it.id)}
                />
              ))}
              {loading && <div className="text-sm text-[var(--muted)]">Loading…</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
