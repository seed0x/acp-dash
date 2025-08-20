'use client';

import { useEffect, useMemo, useState } from 'react';

/* ---------- Types ---------- */
type KPI = { postAndBeam: number; activeBids: number; jobAccountsPending: number; openProblems: number };
type ProjectRow = { id: string; title: string; client?: string; location?: string; status?: string };
type ImprovementRow = { id: string; title: string; status?: string; projectId?: string };
type BoardItem = { id: string; title: string; status?: string; client?: string; location?: string };

type ProjectFull = {
  project: {
    id: string; title?: string; status?: string; client?: string; location?: string; deadline?: string;
    jobAccount?: boolean; followUp?: boolean; budget?: number | null; spent?: number | null;
  };
  improvements: { id: string; title: string; status?: string }[];
  tasks: { id: string; title: string; status?: string; assignee?: string; due?: string }[];
  expenses: { id: string; name: string; category?: string; value?: number | null }[];
  time: { id: string; name?: string; person?: string; date?: string; hours?: number | null }[];
  notes: { id: string; title?: string; created?: string }[];
  docs: { id: string; title?: string; description?: string }[];
};

/* ---------- Helpers ---------- */
async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  const txt = await res.text();
  let data: any = null;
  try { data = txt ? JSON.parse(txt) : null; } catch {}
  if (!res.ok) throw new Error((data?.error || data?.message) ?? `${res.status} ${res.statusText}`);
  return data as T;
}

/* ---------- Component ---------- */
export default function OperationsDashboard() {
  // KPIs + sections
  const [kpis, setKpis] = useState<KPI | null>(null);
  const [pendingAcct, setPendingAcct] = useState<ProjectRow[]>([]);
  const [problems, setProblems] = useState<ImprovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Board / search
  const [boardItems, setBoardItems] = useState<BoardItem[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string>('All');
  const [boardLoading, setBoardLoading] = useState(false);

  // Job Accounts local filter
  const [acctFilter, setAcctFilter] = useState('');

  // Quick “Add Upgrade”
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [upgradeTitle, setUpgradeTitle] = useState('');
  const [upgradeNotes, setUpgradeNotes] = useState('');

  // Details drawer
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProjectFull | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [tab, setTab] = useState<'Overview'|'Upgrades'|'Tasks'|'Expenses'|'Time'|'Notes'|'Docs'>('Overview');

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [k, p, pr] = await Promise.all([
        fetchJSON<{ kpis: KPI }>('/api/dashboard/summary').then(d => d.kpis),
        fetchJSON<{ rows: ProjectRow[] }>('/api/projects/job-account').then(d => d.rows),
        fetchJSON<{ rows: ImprovementRow[] }>('/api/improvements?openOnly=true').then(d => d.rows),
      ]);
      setKpis(k); setPendingAcct(p); setProblems(pr);
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setLoading(false); }
  };

  const loadProjects = async () => {
    try {
      const list = await fetchJSON<{ rows: ProjectRow[] }>('/api/projects/list').then(d => d.rows);
      setProjects(list);
      if (!projectId && list.length) setProjectId(list[0].id);
    } catch {}
  };

  const addUpgrade = async () => {
    setError(null);
    try {
      if (!projectId || !upgradeTitle.trim()) return;
      await fetch('/api/improvements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: upgradeTitle, action: upgradeNotes })
      });
      setUpgradeTitle(''); setUpgradeNotes('');
      await load();
    } catch (e: any) { setError(e?.message || String(e)); }
  };

  const openProject = async (id?: string | null) => {
    if (!id) return;
    setOpenId(id); setDetail(null); setDetailLoading(true); setError(null); setTab('Overview');
    try {
      const data = await fetchJSON<ProjectFull>(`/api/projects/${id}/full`);
      setDetail(data);
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setDetailLoading(false); }
  };

  const loadBoard = async () => {
    setBoardLoading(true); setError(null);
    const qs = new URLSearchParams();
    if (query.trim()) qs.set('q', query.trim());
    if (status && status !== 'All') qs.set('status', status);
    try {
      const data = await fetchJSON<{ items: BoardItem[]; statusOptions: string[] }>(`/api/projects/board?${qs}`);
      setBoardItems(data.items); setStatusOptions(['All', ...data.statusOptions]);
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setBoardLoading(false); }
  };

  useEffect(() => { load(); loadProjects(); }, []);
  useEffect(() => { loadBoard(); }, [query, status]);

  // Group for Kanban
  const grouped = useMemo(() => {
    const map: Record<string, BoardItem[]> = {};
    for (const it of boardItems) {
      const col = it.status || 'Uncategorized';
      if (!map[col]) map[col] = [];
      map[col].push(it);
    }
    return map;
  }, [boardItems]);

  const filteredPending = useMemo(() => {
    const q = acctFilter.trim().toLowerCase();
    if (!q) return pendingAcct;
    return pendingAcct.filter(p =>
      [p.title, p.client, p.location].some(v => (v || '').toLowerCase().includes(q))
    );
  }, [acctFilter, pendingAcct]);

  return (
    <div className="container-responsive p-4 sm:p-6 space-y-6 bg-[var(--bg)] text-white min-h-screen">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-bold">ACP — Operations</h1>
        <div className="text-sm text-[var(--muted)]">Post &amp; Beam • Job Accounts • Upgrades • Bids • Problems</div>
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
        {loading && Array.from({ length: 2 }).map((_,i) => <div key={i} className="card p-4 skeleton h-[74px]" />)}
      </div>

      {/* Job Accounts (scrollable) */}
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
                <div className="flex items-center gap-2 shrink-0">
                  <button className="btn" onClick={() => openProject(row.id)}>View</button>
                  <button
                    className="btn btn-primary"
                    onClick={async () => {
                      try {
                        await fetch('/api/projects/job-account', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: row.id, value: true })
                        });
                        await load();
                      } catch (e: any) { setError(e?.message || String(e)); }
                    }}
                  >
                    Mark Created
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Add Upgrade */}
      <section className="card">
        <div className="p-3 border-b border-[var(--border)] flex items-center justify-between">
          <div className="font-semibold">Add Upgrade to Lot</div>
        </div>
        <div className="p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="px-3 py-2 rounded bg-black/30 border border-[var(--border)] sm:w-72"
            >
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <input
              value={upgradeTitle}
              onChange={e => setUpgradeTitle(e.target.value)}
              placeholder="Upgrade title"
              className="px-3 py-2 rounded bg-black/30 border border-[var(--border)] flex-1"
            />
            <input
              value={upgradeNotes}
              onChange={e => setUpgradeNotes(e.target.value)}
              placeholder="Notes / Action"
              className="px-3 py-2 rounded bg-black/30 border border-[var(--border)] flex-1"
            />
            <button onClick={addUpgrade} className="btn btn-primary">Add</button>
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
                      <div className="mt-2">
                        <button className="btn" onClick={() => openProject(r.id)}>View</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Active Problems */}
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
                      });
                      await load();
                    } catch (e: any) { setError(e?.message || String(e)); }
                  }}
                >
                  Mark Done
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Details drawer */}
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
  );
}

/* ---------- UI bits ---------- */
function Kpi({ title, value }: { title: string; value: number }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-[var(--muted)]">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="text-sm text-[var(--muted)]">{text}</div>;
}
function RowsSkeleton({ count = 3 }: { count?: number }) {
  return <div className="grid gap-2">{Array.from({ length: count }).map((_,i) => <div key={i} className="h-[52px] rounded skeleton" />)}</div>;
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
  );
}

/* ---------- Drawer ---------- */
function DetailsPanel({
  onClose, loading, data, tab, setTab
}:{
  onClose: () => void;
  loading: boolean;
  data: ProjectFull | null;
  tab: 'Overview'|'Upgrades'|'Tasks'|'Expenses'|'Time'|'Notes'|'Docs';
  setTab: (t: typeof tab) => void;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[min(1100px,95vw)] sm:rounded-l-2xl bg-[#0c1220] border border-[var(--border)] sm:border-r-0 overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="font-semibold truncate">{data?.project.title || 'Job Details'}</div>
          <button onClick={onClose} className="btn">Close</button>
        </div>

        {/* tabs */}
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
        <div className="p-4 overflow-auto max-h-[75vh] sm:h-[calc(100vh-110px)]">
          {loading && <div className="grid gap-3"><div className="h-16 skeleton rounded" /><div className="h-16 skeleton rounded" /><div className="h-16 skeleton rounded" /></div>}

          {!loading && data && (
            <>
              {tab === 'Overview' && (
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
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
                <List
                  items={data.expenses.map(e => ({...e, title: e.name, value: fmtMoney(e.value)}))}
                  cols={['title','category','value']}
                  headers={['Expense','Category','Value']}
                  empty="No expenses."
                />
              )}
              {tab === 'Time' && <List items={data.time} cols={['name','person','date','hours']} headers={['Entry','Person','Date','Hours']} empty="No time entries." />}
              {tab === 'Notes' && <List items={data.notes} cols={['title','created']} headers={['Note','Created']} empty="No notes." />}
              {tab === 'Docs' && <List items={data.docs} cols={['title','description']} headers={['Document','Description']} empty="No docs." />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded bg-black/20 border border-[var(--border)] p-3">
      <div className="text-xs text-[var(--muted)]">{title}</div>
      <div className="font-medium">{value ?? '-'}</div>
    </div>
  );
}

function List({ items, cols, headers, empty }:{
  items: any[]; cols: string[]; headers: string[]; empty: string
}) {
  if (!items.length) return <div className="text-sm text-[var(--muted)]">{empty}</div>;
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
  );
}

function fmtMoney(n?: number|null) {
  if (n == null) return '-';
  try { return Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n); }
  catch { return String(n); }
}

  )
}
>>>>>>> c064873 (	new file:   src/app/api/projects/board/route.ts)
