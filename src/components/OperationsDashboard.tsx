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
    setOpenId(id); setDetail(null); setDetailLoading(true); setError(null)
    try {
      const data = await fetchJSON<ProjectFull>(`/api/projects/${id}/full`)
      setDetail(data)
    } catch (e: any) { setError(e?.message || String(e)) }
    finally { setDetailLoading(false) }
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
                <button className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-sm"
                  onClick={() => openProject(row.id)}>View</button>
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
                  <Card key={r.id} title={r.title} subtitle={[r.client, r.location].filter(Boolean).join(' • ')}>
                    <button className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-sm"
                      onClick={() => openProject(r.id)}>View</button>
                  </Card>
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
                <button className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-sm"
                  onClick={() => openProject(p.projectId)}>View Job</button>
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

      {/* Details modal */}
      {openId && (
        <DetailsModal onClose={() => setOpenId(null)} loading={detailLoading} data={detail} />
      )}
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

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children?: any }) {
  return (
    <div className="rounded-lg p-3 bg-black/20 border border-white/10">
      <div className="font-medium truncate">{title}</div>
      {subtitle && <div className="text-xs text-[var(--muted)] truncate">{subtitle}</div>}
      {children && <div className="mt-2">{children}</div>}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="text-sm text-[var(--muted)]">{text}</div>
}

/* ---------- Modal ---------- */
function DetailsModal({ onClose, loading, data }: { onClose: () => void; loading: boolean; data: ProjectFull | null }) {
  const [tab, setTab] = useState<'Overview'|'Upgrades'|'Tasks'|'Expenses'|'Time'|'Notes'|'Docs'>('Overview')
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex">
      <div className="m-auto w-[min(1100px,95vw)] max-h-[90vh] rounded-xl overflow-hidden bg-[#0c1220] border border-white/10">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="font-semibold">{data?.project.title || 'Job Details'}</div>
          <button onClick={onClose} className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-sm">Close</button>
        </div>

        <div className="px-4 pt-2">
          <div className="flex flex-wrap gap-2 text-sm">
            {(['Overview','Upgrades','Tasks','Expenses','Time','Notes','Docs'] as const).map(t => (
              <button key={t}
                className={`px-3 py-1 rounded ${tab===t?'bg-slate-600':'bg-slate-800 hover:bg-slate-700'}`}
                onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
        </div>

        <div className="p-4 overflow-auto max-h-[75vh]">
          {loading && <div className="text-sm text-[var(--muted)]">Loading…</div>}
          {!loading && data && (
            <>
              {tab === 'Overview' && (
                <div className="grid md:grid-cols-2 gap-4">
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
    <div className="rounded-lg bg-black/20 border border-white/10 p-3">
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
            {headers.map(h => <th key={h} className="py-2 pr-4">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-t border-white/10">
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
