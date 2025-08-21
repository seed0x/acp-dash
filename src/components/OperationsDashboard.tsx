'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProjectDetailPanel from './ProjectDetailPanel';
import AddPhotoCard from './AddPhotoCard';

type KPI = { postAndBeam: number; activeBids: number; jobAccountsPending: number; openProblems: number };
type ProjectRow = { id: string; title: string; client?: string; location?: string; status?: string };
type ImprovementRow = { id: string; title: string; status?: string; projectId?: string };
type BoardItem = { id: string; title: string; status?: string; client?: string; location?: string };
type ProjectOption = { id:string; title: string };

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init });
  if (!res.ok) throw new Error((await res.json()).error || 'Fetch error');
  return res.json() as T;
}

function DashboardComponent({ initialKpis, initialPendingAcct, initialProblems }: { initialKpis: KPI, initialPendingAcct: ProjectRow[], initialProblems: ImprovementRow[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewingProjectId = searchParams.get('viewing');

  const [kpis, setKpis] = useState(initialKpis);
  const [pendingAcct, setPendingAcct] = useState(initialPendingAcct);
  const [problems, setProblems] = useState(initialProblems);
  const [error, setError] = useState<string | null>(null);

  const [acctFilter, setAcctFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string>('All');
  const [statusOptions, setStatusOptions] = useState<string[]>(['All']);
  const [boardItems, setBoardItems] = useState<BoardItem[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [upgradeTitle, setUpgradeTitle] = useState('');
  const [upgradeNotes, setUpgradeNotes] = useState('');
  const [addingUpgrade, setAddingUpgrade] = useState(false);

  const loadEverything = async () => {
    try {
      const [summary, acct, probs] = await Promise.all([
        fetchJSON<{ kpis: KPI }>('/api/dashboard/summary').then(d => d.kpis),
        fetchJSON<{ rows: ProjectRow[] }>('/api/projects/job-account').then(d => d.rows),
        fetchJSON<{ rows: ImprovementRow[] }>('/api/improvements?openOnly=true').then(d => d.rows),
      ]);
      setKpis(summary); setPendingAcct(acct); setProblems(probs);
    } catch (e: any) { setError(e.message) }
  };
  
  const loadProjectOptions = async () => {
    try {
      const data = await fetchJSON<{ rows: ProjectOption[] }>('/api/projects/list');
      setProjects(data.rows);
      if (!projectId && data.rows.length) setProjectId(data.rows[0].id);
    } catch (e: any) { setError(e.message) }
  };

  useEffect(() => {
    const t = setTimeout(() => setQuery(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    loadProjectOptions();
  }, []);

  const loadBoard = useMemo(() => async () => {
    setBoardLoading(true);
    try {
      const qs = new URLSearchParams({ q: query, status });
      const data = await fetchJSON<{ items: BoardItem[]; statusOptions: string[] }>(`/api/projects/board?${qs}`);
      setBoardItems(data.items);
      setStatusOptions(['All', ...data.statusOptions.filter(s => s && s !== 'All')]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBoardLoading(false);
    }
  }, [query, status]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  const grouped = useMemo(() => boardItems.reduce((acc, it) => {
    const col = it.status || 'Uncategorized';
    (acc[col] ||= []).push(it);
    return acc;
  }, {} as Record<string, BoardItem[]>), [boardItems]);

  const filteredPending = useMemo(() => {
    const q = acctFilter.trim().toLowerCase();
    return q ? pendingAcct.filter(p => [p.title, p.client, p.location].some(v => v?.toLowerCase().includes(q))) : pendingAcct;
  }, [acctFilter, pendingAcct]);

  const addUpgrade = async () => {
    if (!projectId || !upgradeTitle.trim()) return;
    setAddingUpgrade(true);
    try {
      await fetch('/api/improvements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, title: upgradeTitle.trim(), action: upgradeNotes.trim() }) });
      setUpgradeTitle(''); setUpgradeNotes('');
      await loadEverything();
    } catch (e: any) { setError(e.message) } 
    finally { setAddingUpgrade(false) }
  };
  
  const handleViewProject = (id: string) => router.push(`/?viewing=${id}`);
  const handleClosePanel = () => router.push('/');

  return (
    <>
      {viewingProjectId && <ProjectDetailPanel projectId={viewingProjectId} onClose={handleClosePanel} />}
      
      <div className="space-y-6">
        {error && <div className="card p-3 border-red-500/30 bg-red-900/20 text-sm">{error}</div>}

        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          <Kpi title="Post & Beam" value={kpis.postAndBeam} />
          <Kpi title="Active Bids" value={kpis.activeBids} />
          <Kpi title="Job Accounts Pending" value={kpis.jobAccountsPending} />
          <Kpi title="Open Problems" value={kpis.openProblems} />
        </div>

        <section className="card">
          <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
            <h2 className="font-semibold">Job Account Checklist</h2>
            <input value={acctFilter} onChange={e => setAcctFilter(e.target.value)} placeholder="Filter jobs…" className="px-3 py-1.5 rounded bg-black/30 border border-[var(--border)] text-sm"/>
          </div>
          <div className="p-3 max-h-[420px] overflow-y-auto pr-1"><div className="grid gap-2">
            {filteredPending.map(row => (
              <div key={row.id} className="flex items-center justify-between p-2 rounded bg-black/20 border border-[var(--border)] clickable-card">
                <div onClick={() => handleViewProject(row.id)} className="cursor-pointer min-w-0 flex-grow">
                  <div className="font-medium truncate">{row.title}</div>
                  <div className="text-xs text-[var(--muted)] truncate">{[row.client, row.location].filter(Boolean).join(' • ')}</div>
                </div>
                <button className="btn btn-primary shrink-0 ml-2" onClick={async () => { try { await fetch('/api/projects/job-account', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id, value: true }) }); await loadEverything() } catch(e:any) { setError(e.message) }}}>Mark Created</button>
              </div>
            ))}
          </div></div>
        </section>

        <section className="card p-3 space-y-2">
          <h2 className="font-semibold">Add Upgrade to Lot</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className="px-3 py-2 rounded bg-black/30 border border-[var(--border)] sm:w-72"><option>Select Project</option>{projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select>
            <input value={upgradeTitle} onChange={e => setUpgradeTitle(e.target.value)} placeholder="Upgrade title" className="px-3 py-2 rounded bg-black/30 border border-[var(--border)] flex-1"/>
            <input value={upgradeNotes} onChange={e => setUpgradeNotes(e.target.value)} placeholder="Notes / Action" className="px-3 py-2 rounded bg-black/30 border border-[var(--border)] flex-1"/>
            <button onClick={addUpgrade} disabled={addingUpgrade} className="btn btn-primary">{addingUpgrade ? 'Adding…' : 'Add'}</button>
          </div>
        </section>
        
        {projects.length > 0 && <AddPhotoCard projects={projects} onPhotoAdded={loadEverything} />}

        <section className="card">
          <div className="p-3 border-b border-[var(--border)]">
            <div className="flex flex-col sm:flex-row gap-2">
              <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search jobs by name, client, or address…" className="px-3 py-2 rounded bg-black/30 border border-[var(--border)] flex-1"/>
              <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-2 rounded bg-black/30 border border-[var(--border)] sm:w-60">{statusOptions.map(opt => <option key={opt}>{opt}</option>)}</select>
            </div>
          </div>
          <div className="p-3"><div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {boardLoading ? <ColumnsSkeleton /> : Object.entries(grouped).map(([col, rows]) => (
              <div key={col} className="card p-3 bg-black/30"><div className="font-semibold mb-2">{col} <span className="text-xs text-[var(--muted)]">({rows.length})</span></div><div className="grid gap-2 max-h-[360px] overflow-y-auto pr-1">
                {rows.map(r => (
                  <div key={r.id} onClick={() => handleViewProject(r.id)} className="cursor-pointer rounded bg-black/20 border border-[var(--border)] p-2 hover:bg-black/40 clickable-card">
                    <div className="font-medium truncate">{r.title}</div>
                    <div className="text-xs text-[var(--muted)] truncate mt-1">
                      {r.client}
                      {r.client && r.location && <span className="mx-1">•</span>}
                      {r.location && <span className="hover:underline text-blue-400">{r.location}</span>}
                    </div>
                  </div>
                ))}
              </div></div>
            ))}
          </div></div>
        </section>
      </div>
    </>
  );
}

// Suspense boundary for client components that use searchParams
export default function OperationsDashboard(props: { initialKpis: KPI, initialPendingAcct: ProjectRow[], initialProblems: ImprovementRow[] }) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardComponent {...props} />
    </Suspense>
  )
}

const Kpi = ({ title, value }: { title: string; value: number }) => <div className="card p-4"><div className="text-sm text-[var(--muted)]">{title}</div><div className="text-2xl font-semibold">{value}</div></div>;
const ColumnsSkeleton = () => <div className="h-64 col-span-full skeleton"/>;
const DashboardSkeleton = () => <div className="space-y-6"><div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>{Array.from({length: 4}).map((_,i) => <div key={i} className="card h-[74px] skeleton"/>)}</div><div className="card h-64 skeleton" /><div className="card h-96 skeleton" /></div>