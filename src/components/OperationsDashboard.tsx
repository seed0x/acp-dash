'use client'

import { useEffect, useMemo, useState } from 'react'

type KPI = { postAndBeam: number; activeBids: number; jobAccountsPending: number; openProblems: number }
type ProjectRow = { id: string; title: string; client?: string; location?: string; status?: string }
type ImprovementRow = { id: string; title: string; status?: string; projectId?: string }
type BoardItem = { id: string; title: string; status?: string; client?: string; location?: string }

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' })
  const txt = await res.text()
  let data: any = null
  try { data = txt ? JSON.parse(txt) : null } catch {}
  if (!res.ok) throw new Error((data?.error || data?.message) ?? `${res.status} ${res.statusText}`)
  return data as T
}

export default function OperationsDashboard() {
  // KPIs + sections
  const [kpis, setKpis] = useState<KPI | null>(null)
  const [pendingAcct, setPendingAcct] = useState<ProjectRow[]>([])
  const [problems, setProblems] = useState<ImprovementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Board / search
  const [boardItems, setBoardItems] = useState<BoardItem[]>([])
  const [statusOptions, setStatusOptions] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<string>('All')
  const [boardLoading, setBoardLoading] = useState(false)

  // Job Accounts local filter
  const [acctFilter, setAcctFilter] = useState('')

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const [k, p, pr] = await Promise.all([
        fetchJSON<{ kpis: KPI }>('/api/dashboard/summary').then(d => d.kpis),
        fetchJSON<{ rows: ProjectRow[] }>('/api/projects/job-account').then(d => d.rows),
        fetchJSON<{ rows: ImprovementRow[] }>('/api/improvements?openOnly=true').then(d => d.rows),
      ])
      setKpis(k); setPendingAcct(p); setProblems(pr)
    } catch (e: any) { setError(e?.message || String(e)) }
    finally { setLoading(false) }
  }

  const loadBoard = async () => {
    setBoardLoading(true); setError(null)
    const qs = new URLSearchParams()
    if (query.trim()) qs.set('q', query.trim())
    if (status && status !== 'All') qs.set('status', status)
    try {
      const data = await fetchJSON<{ items: BoardItem[]; statusOptions: string[] }>(`/api/projects/board?${qs}`)
      setBoardItems(data.items); setStatusOptions(['All', ...data.statusOptions])
    } catch (e: any) { setError(e?.message || String(e)) }
    finally { setBoardLoading(false) }
  }

  useEffect(() => { load(); }, [])
  useEffect(() => { loadBoard(); /* when query or status changes */ }, [query, status])

  // Group for Kanban
  const grouped = useMemo(() => {
    const map: Record<string, BoardItem[]> = {}
    for (const it of boardItems) {
      const col = it.status || 'Uncategorized'
      if (!map[col]) map[col] = []
      map[col].push(it)
    }
    return map
  }, [boardItems])

  const filteredPending = useMemo(() => {
    const q = acctFilter.trim().toLowerCase()
    if (!q) return pendingAcct
    return pendingAcct.filter(p =>
      [p.title, p.client, p.location].some(v => (v || '').toLowerCase().includes(q))
    )
  }, [acctFilter, pendingAcct])

  return (
    <div className="container-responsive p-4 sm:p-6 space-y-6 bg-[var(--bg)] text-white min-h-screen">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-bold">ACP — Operations</h1>
        <div className="text-sm text-[var(--muted)]">Post & Beam • Job Accounts • Upgrades • Bids • Problems</div>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-3 border-red-500/30 bg-red-900/20 text-sm">
          <div className="font-semibold">Something went wrong</div>
          <div className="mt-1">{error}</div>
          <div className="mt-1"><a className="underline" href="/api/health" target="_blank" rel="noreferrer">/api/health</a></div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <Kpi title="Post & Beam" value={kpis?.postAndBeam ?? 0} />
        <Kpi title="Active Bids" value={kpis?.activeBids ?? 0} />
        <Kpi title="Job Accounts Pending" value={kpis?.jobAccountsPending ?? 0} />
        <Kpi title="Open Problems" value={kpis?.openProblems ?? 0} />
      </div>

      {/* Job Accounts box (scrollable) */}
      <section className="card">
        <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
          <div className="font-semibold">Job Account Created — Checklist</div>
          <div className="flex items-center gap-2">
            <input
              value={acctFilter}
              onChange={e => setAcctFilter(e.target.value)}
              placeholder="Filter jobs…"
              className="px-3 py-1.5 rounded bg-black/30 border border-[var(--border)] text-sm"
            />
            <button onClick={load} className="btn">Refresh</button>
          </div>
        </div>
        <div className="p-3">
          {loading && <RowsSkeleton count={4} />}
          {!loading && filteredPending.length === 0 && <Empty text="All projects have job accounts created." />}
          <div className="grid gap-2 max-h-[420px] overflow-y-auto pr-1">
            {filteredPending.map(row => (
              <div key={row.id} className="flex items-center justify-between p-2 rounded bg-black/20 border border-[var(--border)]">
                <div className="min-w-0">
                  <div className="font-medium truncate">{row.title || 'Untitled'}</div>
                  <div className="text-xs text-[var(--muted)] truncate">
                    {[row.client, row.location].filter(Boolean).join(' • ')}
                  </div>
                </div>
                <button
                  className="btn btn-primary shrink-0"
                  onClick={async () => {
                    try {
                      await fetch('/api/projects/job-account', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: row.id, value: true })
                      })
                      await load()
                    } catch (e: any) { setError(e?.message || String(e)) }
                  }}
                >
                  Mark Created
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Search + mini-Kanban */}
      <section className="card">
        <div className="p-3 border-b border-[var(--border)]">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search jobs by name, client, or address…"
              className="px-3 py-2 rounded bg-black/30 border border-[var(--border)] flex-1"
            />
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="px-3 py-2 rounded bg-black/30 border border-[var(--border)] sm:w-60"
            >
              {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <button onClick={loadBoard} className="btn">Search</button>
          </div>
        </div>

        {/* Kanban */}
        <div className="p-3">
          {boardLoading && <ColumnsSkeleton cols={3} cardsPerCol={3} />}
          {!boardLoading && Object.keys(grouped).length === 0 && <Empty text="No jobs match your filters." />}

          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {Object.entries(grouped).map(([col, rows]) => (
              <div key={col} className="card p-3 bg-black/30">
                <div className="font-semibold mb-2">{col} <span className="text-xs text-[var(--muted)]">({rows.length})</span></div>
                <div className="grid gap-2 max-h-[360px] overflow-y-auto pr-1">
                  {rows.map(r => (
                    <div key={r.id} className="rounded bg-black/20 border border-[var(--border)] p-2">
                      <div className="font-medium truncate">{r.title}</div>
                      <div className="text-xs text-[var(--muted)] truncate">
                        {[r.client, r.location].filter(Boolean).join(' • ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problems */}
      <section className="card">
        <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
          <div className="font-semibold">Active Problems</div>
          <button onClick={load} className="btn">Refresh</button>
        </div>
        <div className="p-3">
          {loading && <RowsSkeleton count={3} />}
          {!loading && problems.length === 0 && <Empty text="No open problems. Nice!" />}
          <div className="grid gap-2">
            {problems.map(p => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded bg-black/20 border border-[var(--border)]">
                <div className="min-w-0">
                  <div className="font-medium truncate">{p.title}</div>
                  <div className="text-xs text-[var(--muted)] truncate">{p.status || 'Open'}</div>
                </div>
                <button
                  className="btn btn-primary shrink-0"
                  onClick={async () => {
                    try {
                      await fetch('/api/improvements', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: p.id, status: 'Done' })
                      })
                      await load()
                    } catch (e: any) { setError(e?.message || String(e)) }
                  }}
                >
                  Mark Done
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

/* ---- UI bits ---- */
function Kpi({ title, value }: { title: string; value: number }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-[var(--muted)]">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  )
}
function Empty({ text }: { text: string }) {
  return <div className="text-sm text-[var(--muted)]">{text}</div>
}
function RowsSkeleton({ count = 3 }: { count?: number }) {
  return <div className="grid gap-2">{Array.from({ length: count }).map((_,i) => <div key={i} className="h-[52px] rounded skeleton" />)}</div>
}
function ColumnsSkeleton({ cols=3, cardsPerCol=2 }:{ cols?: number; cardsPerCol?: number }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(260px, 1fr))` }}>
      {Array.from({ length: cols }).map((_,c) => (
        <div key={c} className="card p-3">
          <div className="h-4 w-36 skeleton rounded mb-3" />
          <div className="grid gap-2">
            {Array.from({ length: cardsPerCol }).map((__,i) => <div key={i} className="h-[64px] rounded skeleton" />)}
          </div>
        </div>
      ))}
    </div>
  )
}
