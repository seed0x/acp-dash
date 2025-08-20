'use client';

import { useEffect, useMemo, useState } from 'react';

/* ---------- Types (UI-shape only) ---------- */
type KPI = { postAndBeam: number; activeBids: number; jobAccountsPending: number; openProblems: number };
type ProjectRow = { id: string; title: string; client?: string; location?: string; status?: string };
type ImprovementRow = { id: string; title: string; status?: string; projectId?: string };
type BoardItem = { id: string; title: string; status?: string; client?: string; location?: string };
type ProjectOption = { id: string; title: string };

/* ---------- Helpers ---------- */
async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init });
  const txt = await res.text();
  let data: any = null;
  try { data = txt ? JSON.parse(txt) : null } catch {}
  if (!res.ok) throw new Error((data?.error || data?.message) ?? `${res.status} ${res.statusText}`);
  return data as T;
}
function fmtMoney(n?: number | null) {
  if (n == null) return '-';
  try { return Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n); }
  catch { return String(n); }
}

export default function OperationsDashboard() {
  /* KPIs + sections */
  const [kpis, setKpis] = useState<KPI | null>(null);
  const [pendingAcct, setPendingAcct] = useState<ProjectRow[]>([]);
  const [problems, setProblems] = useState<ImprovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Job Accounts local filter */
  const [acctFilter, setAcctFilter] = useState('');

  /* Search + mini-Kanban */
  const [searchInput, setSearchInput] = useState('');   // what the user types
  const [query, setQuery] = useState('');               // debounced value sent to API
  const [status, setStatus] = useState<string>('All');
  const [statusOptions, setStatusOptions] = useState<string[]>(['All']);
  const [boardItems, setBoardItems] = useState<BoardItem[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);

  /* Upgrades quick add */
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [upgradeTitle, setUpgradeTitle] = useState('');
  const [upgradeNotes, setUpgradeNotes] = useState('');
  const [addingUpgrade, setAddingUpgrade] = useState(false);

  /* Debounce the search input */
  useEffect(() => {
    const t = setTimeout(() => setQuery(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* Load KPIs / lists */
  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [summary, acct, probs] = await Promise.all([
        fetchJSON<{ kpis: KPI }>('/api/dashboard/summary').then(d => d.kpis),
        fetchJSON<{ rows: ProjectRow[] }>('/api/projects/job-account').then(d => d.rows),
        fetchJSON<{ rows: ImprovementRow[] }>('/api/improvements?openOnly=true').then(d => d.rows),
      ]);
      setKpis(summary);
      setPendingAcct(acct);
      setProblems(probs);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  /* Load projects for Upgrade dropdown */
  const loadProjectOptions = async () => {
    try {
      const data = await fetchJSON<{ options: ProjectOption[] }>('/api/projects/list');
      setProjects(data.options);
      if (!projectId && data.options.length) setProjectId(data.options[0].id);
    } catch (e: any) {
      // non-fatal for UI; show in banner if nothing else
      setError(prev => prev ?? (e?.message || String(e)));
    }
  };

  /* Load board with server-side filtering */
  const loadBoard = async () => {
    setBoardLoading(true); setError(null);
    try {
      const qs = new URLSearchParams();
      if (query) qs.set('q', query);
      if (status && status !== 'All') qs.set('status', status);
      const data = await fetchJSON<{ items: BoardItem[]; statusOptions: string[] }>(`/api/projects/board?${qs}`);
      setBoardItems(data.items);
      setStatusOptions(['All', ...data.statusOptions.filter(s => s && s !== 'All')]);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBoardLoading(false);
    }
  };

  useEffect(() => { load(); loadProjectOptions(); }, []);
  useEffect(() => { loadBoard(); }, [query, status]);

  /* Group board columns */
  const grouped = useMemo(() => {
    const map: Record<string, BoardItem[]> = {};
    for (const it of boardItems) {
      const col = it.status || 'Uncategorized';
      (map[col] ||= []).push(it);
    }
    return map;
  }, [boardItems]);

  /* Filter Job Accounts list */
  const filteredPending = useMemo(() => {
    const q = acctFilter.trim().toLowerCase();
    if (!q) return pendingAcct;
    return pendingAcct.filter(p =>
      [p.title, p.client, p.location].some(v => (v || '').toLowerCase().includes(q))
    );
  }, [acctFilter, pendingAcct]);

  /* Add Upgrade */
  const addUpgrade = async () => {
    if (!projectId || !upgradeTitle.trim()) return;
    setAddingUpgrade(true); setError(null);
    try {
      await fetch('/api/improvements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: upgradeTitle.trim(), action: upgradeNotes.trim() || undefined }),
      });
      setUpgradeTitle(''); setUpgradeNotes('');
      await load(); // refresh KPIs / problems counts
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setAddingUpgrade(false);
    }
  };

  /* ---------- UI ---------- */
  return (
    <div className="container-responsive p-4 sm:p-6 space-y-6 bg-[var(--bg)] text-white min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-10 backdrop-blur border-b border-[var(--border)] bg-[color:rgba(11,17,32,0.7)] -mx-4 sm:-mx-6 px-4 sm:px-6 py-3">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div className="font-bold text-xl sm:text-2xl">ACP — Operations</div>
          <div className="text-xs sm:text-sm text-[var(--muted)]">Faster search • Full expenses • Client names • Upgrades</div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-3 border-red-500/30 bg-red-900/20 text-sm">
          <div className="font-semibold">Something went wrong</div>
          <div className="mt-1">{error}</div>
          <div className="mt-1">
            <a className="underline" href="/api/health" target="_blank" rel="noreferrer">/api/health</a>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <Kpi title="Post & Beam" value={kpis?.postAndBeam ?? 0} />
        <Kpi title="Active Bids" value={kpis?.activeBids ?? 0} />
        <Kpi title="Job Accounts Pending" value={kpis?.jobAccountsPending ?? 0} />
        <Kpi title="Open Problems" value={kpis?.openProblems ?? 0} />
        {loading && Array.from({ length: 2 }).map((_, i) => <div key={i} className="card p-4 skeleton h-[74px]" />)}
      </div>

      {/* Job Accounts (scrollable) */}
      <section className="card">
        <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
          <div className="font-semibold">Job Account Created — Checklist</div>
          <div className="flex items-center gap-2">
            <input
              value={acctFilter}
              onChange={(e) => setAcctFilter(e.target.value)}
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
            {filteredPending.map((row) => (
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
                        body: JSON.stringify({ id: row.id, value: true }),
                      });
                      await load();
                    } catch (e: any) { setError(e?.message || String(e)); }
                  }}
                >
                  Mark Created
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Add Upgrade (restored) */}
      <section className="card">
        <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
          <div className="font-semibold">Add Upgrade to Lot</div>
          <button onClick={loadProjectOptions} className="btn">Reload Projects</button>
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
            <button onClick={addUpgrade} disabled={addingUpgrade} className="btn btn-primary">
              {addingUpgrade ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      </section>

      {/* Search + mini-Kanban */}
      <section className="card">
        <div className="p-3 border-b border-[var(--border)]">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
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
                <div className="font-semibold mb-2">
                  {col} <span className="text-xs text-[var(--muted)]">({rows.length})</span>
                </div>
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
                        body: JSON.stringify({ id: p.id, status: 'Done' }),
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
  return <div className="grid gap-2">{Array.from({ length: count }).map((_, i) => <div key={i} className="h-[52px] rounded skeleton" />)}</div>;
}
function ColumnsSkeleton({ cols = 3, cardsPerCol = 2 }: { cols?: number; cardsPerCol?: number }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(260px, 1fr))` }}>
      {Array.from({ length: cols }).map((_, c) => (
        <div key={c} className="card p-3">
          <div className="h-4 w-36 skeleton rounded mb-3" />
          <div className="grid gap-2">
            {Array.from({ length: cardsPerCol }).map((__, i) => <div key={i} className="h-[64px] rounded skeleton" />)}
          </div>
        </div>
      ))}
    </div>
  );
}
