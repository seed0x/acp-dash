'use client'

import { useEffect, useMemo, useState } from 'react'

type KPI = { postAndBeam: number; activeBids: number; jobAccountsPending: number; openProblems: number }
type ProjectRow = { id: string; title: string; client?: string; location?: string; status?: string; url?: string }
type ImprovementRow = { id: string; title: string; status?: string; url?: string; projectId?: string }
type BidRow = ProjectRow

type ProjectFull = {
  project: {
    id: string
    title: string
    status?: string
    client?: string
    location?: string
    deadline?: string | null
    jobAccount?: boolean | null
    followUp?: boolean | null
    budget?: number | null
    spent?: number | null
  }
  improvements: Array<{ id: string; title: string; status?: string }>
  tasks: Array<{ id: string; title: string; status?: string; due?: string|null; assignee?: string }>
  expenses: Array<{ id: string; name: string; category?: string; value?: number|null }>
  time: Array<{ id: string; name: string; date?: string|null; hours?: number|null; person?: string }>
  notes: Array<{ id: string; title: string; created?: string|null }>
  docs: Array<{ id: string; title: string; description?: string }>
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' })
  const text = await res.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch {}
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

  // details modal
  const [openId, setOpenId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ProjectFull | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [tab, setTab] = useState<'Overview'|'Upgrades'|'Tasks'|'Expenses'|'Time'|'Notes'|'Docs'>('Overview')

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
    } catch (e: any) { setError(e?.message || String(e)) }
    finally { setLoading(false) }
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
    } catch (e: any) { setError(e?.message || String(e)) }
  }

  const openProject = async (id: string | undefined | null) => {
    if (!id) return
    setOpenId(id); setDetail(null); setDetailLoading(true); setError(null); setTab('Overview')
    try {
      const data = await fetchJSON<ProjectFull>(`/api/projects/${id}/full`)
      setDetail(data)
    } catch (e: any) { setError(e?.message || String(e)) }
    finally { setDetailLoading(false) }
  }

  return (
    <div className="container-responsive p-4 sm:p-6 space-y-6">
      {/* Error banner */}
      {error && (
        <div className="card p-3 border-red-500/30 bg-red-900/20">
          <div className="font-semibold">Something went wrong</div>
          <div className="mt-1 text-sm">{error}</div>
          <div className="mt-1 text-sm">
            Try <a className="underline" href="/api/health" target="_blank" rel="noreferrer">/api/health</a> to diagnose.
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-3"
           style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <Kpi title="Post & Beam" value={kpis?.postAndBeam ?? 0} />
        <Kpi title="Active Bids" value={kpis?.activeBids ?? 0} />
        <Kpi title="Job Accounts Pending" value={kpis?.jobAccountsPending ?? 0} />
        <Kpi title="Open Problems" value={kpis?.openProblems ?? 0} />
        {loading && Array.from({ length: 2 }).map((_,i) => <div key={i} className="card p-4 skeleton h-[74px]" />)}
      </div>

      {/* Job Account Created checklist */}
      <Section title="Job Account Created — Checklist" onRefresh={load}>
        {loading && <RowsSkeleton count={3} />}
        {!loading && pendingAcct.length === 0 && <Empty text="All projects have job accounts created." />}
        <div className="grid gap-2">
          {pendingAcct.map(row => (
            <Row key={row.id}>
              <div className="min-w-0">
                <div className="font-medium truncate">{row.title}</div>
                <div className="text-xs text-[var(--muted)] truncate">
                  {[row.client, row.location].filter(Boolean).join(' • ')}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button className="btn" onClick={() => openProject(row.id)}>View</button>
                <button className="btn btn-primary"
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
        <div className="flex flex-col sm:flex-row gap-2">
          <select value={projectId} onChange={e => setProjectId(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-black/30 border border-[var(--border)] sm:w-72">
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <input value={upgradeTitle} onChange={e => setUpgradeTitle(e.target.value)} placeholder="Upgrade title"
                 className="px-3 py-2 rounded-lg bg-black/30 border border-[var(--border)] flex-1" />
          <input value={upgradeNotes} onChange={e => setUpgradeNotes(e.target.value)} placeholder="Notes / Action"
                 className="px-3 py-2 rounded-lg bg-black/30 border border-[var(--border)] flex-1" />
          <button onClick={addUpgrade} className="btn btn-primary">Add</button>
        </div>
      </Section>

      {/* Active Bids board */}
      <Section title="Active Bids & Follow-ups" onRefresh={load}>
        {loading && <ColumnsSkeleton cols={3} cardsPerCol={2} />}
        {!loading && Object.keys(bidsGrouped).length === 0 && <Empty text="No bids currently." />}
        <div className="grid gap-3"
             style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {Object.entries(bidsGrouped).map(([col, rows]) => (
            <div key={col} className="card p-3">
              <div className="font-semibold mb-2">
                {col} <span className="text-xs text-[var(--muted)]">({rows.length})</span>
              </div>
              <div className="grid gap-2">
                {rows.map(r => (
                  <div key={r.id} className="card p-3 bg-black/20">
                    <div className="font-medium truncate">{r.title}</div>
                    <div className="text-xs text-[var(--muted)] truncate">
                      {[r.client, r.location].filter(Boolean).join(' • ')}
                    </div>
                    <div className="mt-2">
                      <button className="btn" onClick={() => openProject(r.id)}>View</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Active Problems board */}
      <Section title="Active Problems" onRefresh={load}>
        {loading && <RowsSkeleton count={3} />}
        {!loading && problems.length === 0 && <Empty text="No open problems. Nice!" />}
        <div className="grid gap-2">
          {problems.map(p => (
            <Row key={p.id}>
              <div className="min-w-0">
                <div className="font-medium truncate">{p.title}</div>
                <div className="text-xs text-[var(--muted)] truncate">{p.status || 'Open'}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button className="btn" onClick={() => openProject(p.projectId)}>View Job</button>
                <button className="btn btn-primary"
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

      {/* Details modal / drawer */}
      {openId && (
        <DetailsPanel
          onClose={() => setOpenId(null)}
          loading={detailLoading}
          data={detail}
          tab={tab}
          setTab={setTab}
        />
      )}
    </div>
  )
}

/* ------------- UI pieces ------------- */

function Kpi({ title, value }: { title: string; value: number }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-[var(--muted)]">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  )
}

function Section({ title, children, onRefresh }: { title: string; children?: any; onRefresh?: () => void }) {
  return (
    <section className="card">
      <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
        <div className="font-semibold">{title}</div>
        {onRefresh && <button onClick={onRefresh} className="btn">Refresh</button>}
      </div>
      <div className="p-3">{children}</div>
    </section>
  )
}

function Row({ children }: { children: any }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-black/20 border border-[var(--border)]">
      {children}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="text-sm text-[var(--muted)]">{text}</div>
}

/* Skeletons */
function RowsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: count }).map((_,i) => (
        <div key={i} className="h-[52px] rounded-lg skeleton" />
      ))}
    </div>
  )
}
function ColumnsSkeleton({ cols=3, cardsPerCol=2 }:{ cols?: number; cardsPerCol?: number }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(280px, 1fr))` }}>
      {Array.from({ length: cols }).map((_,col) => (
        <div key={col} className="card p-3">
          <div className="h-4 w-36 skeleton rounded mb-3" />
          <div className="grid gap-2">
            {Array.from({ length: cardsPerCol }).map((__,i) => (
              <div key={i} className="h-[68px] rounded-lg skeleton" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* Drawer/Modal with sticky tabs and mobile-friendly layout */
function DetailsPanel({
  onClose, loading, data, tab, setTab
}:{
  onClose: () => void
  loading: boolean
  data: ProjectFull | null
  tab: 'Overview'|'Upgrades'|'Tasks'|'Expenses'|'Time'|'Notes'|'Docs'
  setTab: (t: typeof tab) => void
}) {
  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      {/* panel */}
      <div className="absolute inset-x-0 bottom-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[min(1100px,95vw)] sm:rounded-l-2xl
                      bg-[#0c1220] border border-[var(--border)] sm:border-r-0 overflow-hidden
                      transition-transform">
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="font-semibold truncate">{data?.project.title || 'Job Details'}</div>
          <button onClick={onClose} className="btn">Close</button>
        </div>

        {/* tabs (sticky) */}
        <div className="px-4 py-2 border-b border-[var(--border)] sticky top-0 bg-[#0c1220] z-10">
          <div className="flex flex-wrap gap-2 text-sm">
            {(['Overview','Upgrades','Tasks','Expenses','Time','Notes','Docs'] as const).map(t => (
              <button key={t}
                className={`px-3 py-1 rounded ${tab===t?'bg-slate-600':'bg-slate-800 hover:bg-slate-700'}`}
                onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
        </div>

        {/* content */}
        <div className="p-4 overflow-auto max-h-[75vh] sm:max-h-none sm:h-[calc(100vh-110px)]">
          {loading && <div className="grid gap-3">
            <div className="h-16 skeleton rounded" />
            <div className="h-16 skeleton rounded" />
            <div className="h-16 skeleton rounded" />
          </div>}

          {!loading && data && (
            <>
              {tab === 'Overview' && (
                <div className="grid gap-3"
                     style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                  <Info title="Status" value={data.project.status || '-'} />
                  <Info title="Client" value={data.project.client || '-'} />
                  <Info title="Location" value={data.project.location || '-'} />
                  <Info title="Deadline" value={data.project.deadline || '-'} />
                  <Info title="Job Account Created" value={data.project.jobAccount ? 'Yes' : 'No'} />
                  <Info title="Follow-up Needed" value={data.project.followUp ? 'Yes' : 'No'} />
                  <Info title="Budget" value={fmtMoney(data.project.budget)} />
                  <Info title="Spent" value={fmtMoney(data.project.spent)} />
                </div>
              )}

              {tab === 'Upgrades' && <List items={data.improvements} cols={['title','status']} headers={['Title','Status']} empty="No upgrades/problems." />}
              {tab === 'Tasks' && <List items={data.tasks} cols={['title','status','assignee','due']} headers={['Task','Status','Assignee','Due']} empty="No tasks." />}
              {tab === 'Expenses' && (
                <List items={data.expenses.map(e => ({...e, title: e.name, value: fmtMoney(e.value)}))}
                      cols={['title','category','value']} headers={['Expense','Category','Value']} empty="No expenses." />
              )}
              {tab === 'Time' && <List items={data.time} cols={['name','person','date','hours']} headers={['Entry','Person','Date','Hours']} empty="No time entries." />}
              {tab === 'Notes' && <List items={data.notes} cols={['title','created']} headers={['Note','Created']} empty="No notes." />}
              {tab === 'Docs' && <List items={data.docs} cols={['title','description']} headers={['Document','Description']} empty="No docs." />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Info({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded-lg bg-black/20 border border-[var(--border)] p-3">
      <div className="text-xs text-[var(--muted)]">{title}</div>
      <div className="font-medium">{value ?? '-'}</div>
    </div>
  )
}

function List({ items, cols, headers, empty }:{
  items: any[]; cols: string[]; headers: string[]; empty: string
}) {
  if (!items.length) return <div className="text-sm text-[var(--muted)]">{empty}</div>
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[var(--muted)]">
            {headers.map(h => <th key={h} className="py-2 pr-4 font-normal">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-t border-[var(--border)]">
              {cols.map(c => <td key={c} className="py-2 pr-4">{it[c] ?? '-'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function fmtMoney(n?: number|null) {
  if (n == null) return '-'
  try { return Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n) } catch { return String(n) }
}
