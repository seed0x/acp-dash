'use client'

import { useEffect, useMemo, useState } from 'react'

type KPI = { postAndBeam: number; activeBids: number; jobAccountsPending: number; openProblems: number }
type ProjectRow = { id: string; title: string; client?: string; location?: string; status?: string; url?: string }
type ImprovementRow = { id: string; title: string; status?: string; url?: string }
type BidRow = ProjectRow

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' })
  const text = await res.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { /* not JSON */ }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `${res.status} ${res.statusText}`
    throw new Error(`${url} → ${msg}`)
  }
  return data as T
}

export default function OperationsDashboard() {
  const [kpis, setKpis] = useState<KPI | null>(null)
  const [pendingAcct, setPendingAcct] = useState<ProjectRow[]>([])
  const [bids, setBids] = useState<BidRow[]>([])
  const [problems, setProblems] = useState<ImprovementRow[]>([])
  const [projects, setProjects] = useState<Array<{ id: string; title: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // quick add upgrade form
  const [projectId, setProjectId] = useState('')
  const [upgradeTitle, setUpgradeTitle] = useState('')
  const [upgradeNotes, setUpgradeNotes] = useState('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [k, p, b, pr, opts] = await Promise.all([
        fetchJSON<{ kpis: KPI }>('/api/dashboard/summary').then(d => d.kpis),
        fetchJSON<{ rows: ProjectRow[] }>('/api/projects/job-account').then(d => d.rows),
        fetchJSON<{ rows: BidRow[] }>('/api/bids').then(d => d.rows),
        fetchJSON<{ rows: ImprovementRow[] }>('/api/improvements?openOnly=true').then(d => d.rows),
        fetchJSON<{ rows: Array<{ id: string; title: string }> }>('/api/projects/list').then(d => d.rows),
      ])
      setKpis(k); setPendingAcct(p); setBids(b); setProblems(pr); setProjects(opts)
      if (!projectId && opts[0]) setProjectId(opts[0].id)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const bidsGrouped = useMemo(() => {
    const map: Record<string, BidRow[]> = {}
    for (const r of bids) {
      const key = r.status || 'Open'
      map[key] = map[key] || []
      map[key].push(r)
    }
    return map
  }, [bids])

  const addUpgrade = async () => {
    setError(null)
    try {
      if (!projectId || !upgradeTitle.trim()) return
      await fetch('/api/improvements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: upgradeTitle, action: upgradeNotes })
      })
      setUpgradeTitle(''); setUpgradeNotes('')
      await load()
    } catch (e: any) {
      setError(e?.message || String(e))
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg border border-red-500/40 bg-red-950/40 text-sm">
          <div className="font-semibold">Something went wrong</div>
          <div className="mt-1">{error}</div>
          <div className="mt-1">
            Try <a className="underline" href="/api/health" target="_blank" rel="noreferrer">/api/health</a> to diagnose.
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi title="Post & Beam" value={kpis?.postAndBeam ?? 0} />
        <Kpi title="Active Bids" value={kpis?.activeBids ?? 0} />
        <Kpi title="Job Accounts Pending" value={kpis?.jobAccountsPending ?? 0} />
        <Kpi title="Open Problems" value={kpis?.openProblems ?? 0} />
      </div>

      {/* Job Account Created checklist */}
      <Section title="Job Account Created — Checklist" onRefresh={load}>
        {pendingAcct.length === 0 && <Empty text="All projects have job accounts created." />}
        <div className="grid gap-2">
          {pendingAcct.map(row => (
            <Row key={row.id}>
              <div className="min-w-0">
                <div className="font-medium truncate">{row.title}</div>
                <div className="text-xs text-[var(--muted)] truncate">
                  {[row.client, row.location].filter(Boolean).join(' • ')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {row.url && <a className="text-xs underline" href={row.url} target="_blank" rel="noreferrer">Open</a>}
                <button className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-sm"
                  onClick={async () => {
                    try {
                      await fetch('/api/projects/job-account', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: row.id, value: true })
                      })
                      await load()
                    } catch (e: any) { setError(e?.message || String(e)) }
                  }}>
                  Mark Created
                </button>
              </div>
            </Row>
          ))}
        </div>
      </Section>

      {/* Upgrades quick add */}
      <Section title="Add Upgrade to Lot">
        <div className="flex flex-col md:flex-row gap-2">
          <select value={projectId} onChange={e => setProjectId(e.target.value)}
            className="px-3 py-2 rounded-lg bg-black/30 border border-white/10 md:w-64">
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <input value={upgradeTitle} onChange={e => setUpgradeTitle(e.target.value)} placeholder="Upgrade title"
            className="px-3 py-2 rounded-lg bg-black/30 border border-white/10 flex-1" />
          <input value={upgradeNotes} onChange={e => setUpgradeNotes(e.target.value)} placeholder="Notes / Action"
            className="px-3 py-2 rounded-lg bg-black/30 border border-white/10 flex-1" />
          <button onClick={addUpgrade} className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500">Add</button>
        </div>
      </Section>

      {/* Active Bids board */}
      <Section title="Active Bids & Follow-ups" onRefresh={load}>
        {Object.keys(bidsGrouped).length === 0 && <Empty text="No bids currently." />}
        <div className="flex gap-3 overflow-x-auto">
          {Object.entries(bidsGrouped).map(([col, rows]) => (
            <div key={col} className="min-w-[320px] w-full">
              <div className="font-semibold mb-2">{col} <span className="text-xs text-[var(--muted)]">({rows.length})</span></div>
              <div className="grid gap-2">
                {rows.map(r => (
                  <Card key={r.id} title={r.title} subtitle={[r.client, r.location].filter(Boolean).join(' • ')} href={r.url} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Active Problems board */}
      <Section title="Active Problems" onRefresh={load}>
        {problems.length === 0 && <Empty text="No open problems. Nice!" />}
        <div className="grid gap-2">
          {problems.map(p => (
            <Row key={p.id}>
              <div className="min-w-0">
                <div className="font-medium truncate">{p.title}</div>
                <div className="text-xs text-[var(--muted)] truncate">{p.status || 'Open'}</div>
              </div>
              <div className="flex items-center gap-2">
                {p.url && <a className="text-xs underline" href={p.url} target="_blank" rel="noreferrer">Open</a>}
                <button className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-sm"
                  onClick={async () => {
                    try {
                      await fetch('/api/improvements', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: p.id, status: 'Done' })
                      })
                      await load()
                    } catch (e: any) { setError(e?.message || String(e)) }
                  }}>
                  Mark Done
                </button>
              </div>
            </Row>
          ))}
        </div>
      </Section>

      {loading && <div className="text-xs text-[var(--muted)]">Loading…</div>}
    </div>
  )
}

function Kpi({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl p-4 bg-[var(--card)] border border-white/10">
      <div className="text-sm text-[var(--muted)]">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  )
}

function Section({ title, children, onRefresh }: { title: string; children?: any; onRefresh?: () => void }) {
  return (
    <section className="rounded-xl border border-white/10 bg-[var(--card)]">
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="font-semibold">{title}</div>
        {onRefresh && <button onClick={onRefresh} className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-sm">Refresh</button>}
      </div>
      <div className="p-3">{children}</div>
    </section>
  )
}

function Row({ children }: { children: any }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-black/20 border border-white/10">
      {children}
    </div>
  )
}

function Card({ title, subtitle, href }: { title: string; subtitle?: string; href?: string }) {
  return (
    <div className="rounded-lg p-3 bg-black/20 border border-white/10">
      <div className="font-medium truncate">{title}</div>
      {subtitle && <div className="text-xs text-[var(--muted)] truncate">{subtitle}</div>}
      {href && <a className="text-xs underline mt-2 inline-block" href={href} target="_blank" rel="noreferrer">Open in Notion</a>}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="text-sm text-[var(--muted)]">{text}</div>
}
