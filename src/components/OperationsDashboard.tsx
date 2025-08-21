'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, UploadCloud, Camera, CheckCircle2, Search, Briefcase } from 'lucide-react';
import ProjectDetailPanel from './ProjectDetailPanel';

// Type definitions remain mostly the same
type KPI = { postAndBeam: number; activeBids: number; jobAccountsPending: number; openProblems: number };
type ProjectRow = { id: string; title: string; client?: string; location?: string; status?: string; builder?: string; };
type ImprovementRow = { id: string; title: string; status?: string; projectId?: string };
type BoardItem = { id: string; title: string; status?: string; client?: string; location?: string; builder?: string; };
type ProjectOption = { id:string; title: string };

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init });
  if (!res.ok) throw new Error((await res.json()).error || 'Fetch error');
  return res.json() as T;
}

// Main Dashboard Component
function DashboardComponent({ initialKpis, initialPendingAcct, initialProblems }: { initialKpis: KPI, initialPendingAcct: ProjectRow[], initialProblems: ImprovementRow[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewingProjectId = searchParams.get('viewing');

  const [kpis, setKpis] = useState(initialKpis);
  const [pendingAcct, setPendingAcct] = useState(initialPendingAcct);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string>('All');
  const [statusOptions, setStatusOptions] = useState<string[]>(['All']);
  const [boardItems, setBoardItems] = useState<BoardItem[]>([]);
  const [boardLoading, setBoardLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  // Consolidated state for quick actions
  const [actionProjectId, setActionProjectId] = useState('');
  const [upgradeTitle, setUpgradeTitle] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoDescription, setPhotoDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setQuery(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Data loading logic
  const loadData = async () => {
    try {
      const [summary, acct, projectsList] = await Promise.all([
        fetchJSON<{ kpis: KPI }>('/api/dashboard/summary'),
        fetchJSON<{ rows: ProjectRow[] }>('/api/projects/job-account'),
        fetchJSON<{ rows: ProjectOption[] }>('/api/projects/list'),
      ]);
      setKpis(summary.kpis);
      setPendingAcct(acct.rows);
      setProjects(projectsList.rows);
      if (projectsList.rows.length > 0) {
        setActionProjectId(projectsList.rows[0].id);
      }
    } catch (e: any) { setError(e.message) }
  };

  const loadBoard = useMemo(() => async () => {
    setBoardLoading(true);
    try {
      const qs = new URLSearchParams({ q: query, status });
      const data = await fetchJSON<{ items: BoardItem[]; statusOptions: string[] }>(`/api/projects/board?${qs}`);
      setBoardItems(data.items);
      setStatusOptions(['All', ...data.statusOptions.filter(s => s && s !== 'All')]);
    } catch (e: any) { setError(e.message) } 
    finally { setBoardLoading(false) }
  }, [query, status]);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadBoard(); }, [loadBoard]);

  const grouped = useMemo(() => boardItems.reduce((acc, it) => {
    const col = it.status || 'Uncategorized';
    (acc[col] ||= []).push(it);
    return acc;
  }, {} as Record<string, BoardItem[]>), [boardItems]);

  const handleActionSubmit = async (type: 'upgrade' | 'photo') => {
    if (!actionProjectId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      if (type === 'upgrade' && upgradeTitle) {
        await fetch('/api/improvements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: actionProjectId, title: upgradeTitle }) });
        setUpgradeTitle('');
      } else if (type === 'photo' && photoFile) {
        const formData = new FormData();
        formData.append('file', photoFile);
        formData.append('projectId', actionProjectId);
        formData.append('description', photoDescription);
        await fetch('/api/photos', { method: 'POST', body: formData });
        setPhotoFile(null);
        setPhotoDescription('');
      }
      await loadData(); // Refresh KPIs and lists
    } catch (e: any) { setError(e.message) }
    finally { setIsSubmitting(false) }
  };

  const handleViewProject = (id: string) => router.push(`/?viewing=${id}`);
  const handleClosePanel = () => router.push('/');

  return (
    <>
      {viewingProjectId && <ProjectDetailPanel projectId={viewingProjectId} onClose={handleClosePanel} />}
      <div className="space-y-8 p-4 md:p-6">
        {error && <div className="card p-3 bg-destructive text-destructive-foreground">{error}</div>}
        
        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard icon={Briefcase} title="Post & Beam" value={kpis.postAndBeam} />
          <KpiCard icon={Briefcase} title="Active Bids" value={kpis.activeBids} />
          <KpiCard icon={Briefcase} title="Job Accounts Pending" value={kpis.jobAccountsPending} />
          <KpiCard icon={Briefcase} title="Open Problems" value={kpis.openProblems} />
        </div>
        
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content: Project Board */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search jobs by name, client, or address…" className="input pl-10 w-full" />
              </div>
              <select value={status} onChange={e => setStatus(e.target.value)} className="input md:w-60">{statusOptions.map(opt => <option key={opt}>{opt}</option>)}</select>
            </div>
            {boardLoading ? <div className="card h-96 skeleton" /> :
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Object.entries(grouped).map(([col, rows]) => (
                  <div key={col} className="space-y-3">
                    <h3 className="font-semibold px-1">{col} <span className="text-sm text-muted-foreground">({rows.length})</span></h3>
                    <div className="space-y-3">
                      {rows.map(r => <ProjectCard key={r.id} project={r} onClick={() => handleViewProject(r.id)} />)}
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
          
          {/* Side Content: Actions & Checklists */}
          <div className="space-y-6">
            <ActionCard title="Quick Actions" icon={Plus}>
              <div className="space-y-4">
                <select value={actionProjectId} onChange={e => setActionProjectId(e.target.value)} className="input w-full">
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
                <div className="space-y-2">
                  <input value={upgradeTitle} onChange={e => setUpgradeTitle(e.target.value)} placeholder="Add an upgrade..." className="input"/>
                  <button onClick={() => handleActionSubmit('upgrade')} disabled={isSubmitting || !upgradeTitle} className="w-full btn btn-secondary">Add Upgrade</button>
                </div>
                <div className="space-y-2">
                  <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0] || null)} className="input"/>
                  <input value={photoDescription} onChange={e => setPhotoDescription(e.target.value)} placeholder="Photo description..." className="input"/>
                  <button onClick={() => handleActionSubmit('photo')} disabled={isSubmitting || !photoFile} className="w-full btn btn-secondary">Upload Photo</button>
                </div>
              </div>
            </ActionCard>

            <ActionCard title="Job Account Checklist" icon={CheckCircle2}>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {pendingAcct.map(row => (
                  <div key={row.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/50">
                    <div onClick={() => handleViewProject(row.id)} className="cursor-pointer min-w-0">
                      <p className="font-medium truncate">{row.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{row.client}</p>
                    </div>
                    <button className="btn btn-primary ml-2 px-2 h-8" onClick={async () => { try { await fetch('/api/projects/job-account', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id, value: true }) }); await loadData(); } catch(e:any) { setError(e.message) }}}>Done</button>
                  </div>
                ))}
              </div>
            </ActionCard>
          </div>
        </div>
      </div>
    </>
  );
}

// Sub-components for better organization
const KpiCard = ({ icon: Icon, title, value }: { icon: React.ElementType, title: string, value: number | string }) => (
  <div className="card p-4 flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
    <div className="p-2 bg-secondary rounded-lg">
      <Icon className="h-5 w-5 text-muted-foreground" />
    </div>
  </div>
);

const ActionCard = ({ icon: Icon, title, children }: { icon: React.ElementType, title: string, children: React.ReactNode }) => (
  <div className="card">
    <div className="p-4 border-b flex items-center gap-2">
      <Icon className="h-5 w-5" />
      <h3 className="font-semibold">{title}</h3>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const ProjectCard = ({ project, onClick }: { project: BoardItem, onClick: () => void }) => (
  <div onClick={onClick} className="card p-3 space-y-2 cursor-pointer transition-all hover:border-primary/80 hover:shadow-lg">
    <p className="font-semibold truncate">{project.title}</p>
    <div className="text-xs text-muted-foreground space-y-1">
      {project.client && <p className="truncate">Client: {project.client}</p>}
      {project.builder && <p className="truncate">Builder: {project.builder}</p>}
      {project.location && <p className="truncate text-blue-400">{project.location}</p>}
    </div>
  </div>
);

// Suspense boundary for client components that use searchParams
export default function OperationsDashboard(props: { initialKpis: KPI, initialPendingAcct: ProjectRow[], initialProblems: ImprovementRow[] }) {
  return (
    <Suspense fallback={<div className="p-6"><div className="w-full h-96 card skeleton" /></div>}>
      <DashboardComponent {...props} />
    </Suspense>
  );
}