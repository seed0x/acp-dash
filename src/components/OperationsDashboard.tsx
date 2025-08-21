'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, Camera, CheckCircle2, Search } from 'lucide-react';
import ProjectDetailPanel from './ProjectDetailPanel';

// Type definitions
type KPI = { postAndBeam: number; activeBids: number; jobAccountsPending: number; openProblems: number };
type ProjectRow = { id: string; title: string; client?: string; location?: string; status?: string; builder?: string; };
type BoardItem = { id: string; title: string; status?: string; client?: string; location?: string; builder?: string; };
type ProjectOption = { id:string; title: string };

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: 'Fetch error with no JSON body' }));
    throw new Error(errorBody.error || 'Fetch error');
  }
  return res.json() as T;
}

function DashboardComponent({ initialKpis, initialPendingAcct }: { initialKpis: KPI, initialPendingAcct: ProjectRow[] }) {
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

  // State for actions
  const [actionProjectId, setActionProjectId] = useState('');
  const [upgradeTitle, setUpgradeTitle] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoDescription, setPhotoDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQuery(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

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
      if (projectsList.rows.length > 0 && !actionProjectId) {
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

  const handlePhotoSubmit = async () => {
    if (!actionProjectId || !photoFile) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', photoFile);
      formData.append('projectId', actionProjectId);
      formData.append('description', photoDescription);
      await fetch('/api/photos', { method: 'POST', body: formData });
      setPhotoFile(null);
      setPhotoDescription('');
    } catch (e: any) { setError(e.message) }
    finally { setIsSubmitting(false) }
  };
  
  const handleUpgradeSubmit = async () => {
    if (!actionProjectId || !upgradeTitle) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await fetch('/api/improvements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: actionProjectId, title: upgradeTitle }) });
      setUpgradeTitle('');
      await loadData();
    } catch (e:any) { setError(e.message) }
    finally { setIsSubmitting(false) }
  };

  const handleViewProject = (id: string) => router.push(`/?viewing=${id}`);
  const handleClosePanel = () => router.push('/');

  return (
    <>
      {viewingProjectId && <ProjectDetailPanel projectId={viewingProjectId} onClose={handleClosePanel} />}
      <div className="p-4 md:p-6">
        {error && <div className="card p-3 bg-destructive text-destructive-foreground mb-4">{error}</div>}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Projects */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search jobs..." className="input pl-10 w-full" />
              </div>
              <select value={status} onChange={e => setStatus(e.target.value)} className="input md:w-60">{statusOptions.map(opt => <option key={opt}>{opt}</option>)}</select>
            </div>
            <div className="flex-grow h-[calc(100vh-12rem)] overflow-y-auto pr-2">
              {boardLoading ? <div className="card h-full w-full skeleton" /> :
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
          </div>
          
          {/* Right Column: Actions */}
          <div className="space-y-6">
            <ActionCard title="Add Photo" icon={Camera}>
              <div className="space-y-3">
                <select value={actionProjectId} onChange={e => setActionProjectId(e.target.value)} className="input w-full">
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
                <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0] || null)} className="input"/>
                <input value={photoDescription} onChange={e => setPhotoDescription(e.target.value)} placeholder="Photo description..." className="input"/>
                <button onClick={handlePhotoSubmit} disabled={isSubmitting || !photoFile} className="w-full btn btn-primary">Upload Photo</button>
              </div>
            </ActionCard>

            <ActionCard title="Add Upgrade" icon={Plus}>
              <div className="space-y-3">
                <select value={actionProjectId} onChange={e => setActionProjectId(e.target.value)} className="input w-full">
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
                <input value={upgradeTitle} onChange={e => setUpgradeTitle(e.target.value)} placeholder="Upgrade description..." className="input"/>
                <button onClick={handleUpgradeSubmit} disabled={isSubmitting || !upgradeTitle} className="w-full btn btn-secondary">Add Upgrade</button>
              </div>
            </ActionCard>

            <ActionCard title="Job Account Checklist" icon={CheckCircle2}>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {pendingAcct.length > 0 ? pendingAcct.map(row => (
                  <div key={row.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/50">
                    <div onClick={() => handleViewProject(row.id)} className="cursor-pointer min-w-0">
                      <p className="font-medium truncate">{row.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{row.client}</p>
                    </div>
                    <button className="btn btn-primary ml-2 px-2 h-8" onClick={async () => { try { await fetch('/api/projects/job-account', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id, value: true }) }); await loadData(); } catch(e:any) { setError(e.message) }}}>Done</button>
                  </div>
                )) : <p className="text-sm text-muted-foreground">All accounts are set up!</p>}
              </div>
            </ActionCard>
          </div>
        </div>
      </div>
    </>
  );
}

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

export default function OperationsDashboard(props: { initialKpis: KPI, initialPendingAcct: ProjectRow[] }) {
  return (
    <Suspense fallback={<div className="p-6"><div className="w-full h-96 card skeleton" /></div>}>
      <DashboardComponent {...props} />
    </Suspense>
  );
}