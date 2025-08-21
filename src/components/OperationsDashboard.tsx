'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Plus, Camera, CheckCircle2, Search, User, Building, MapPin, 
  DollarSign, Clock, TrendingUp, AlertCircle, CheckSquare,
  Filter, Calendar, Phone, Mail, ExternalLink, Star,
  Hammer, Wrench, PaintBucket, FileText, CreditCard
} from 'lucide-react';

// Type definitions
type KPI = { 
  postAndBeam: number; 
  activeBids: number; 
  jobAccountsPending: number; 
  openProblems: number; 
};

type ProjectRow = { 
  id: string; 
  title: string; 
  client?: string; 
};

type BoardItem = { 
  id: string; 
  title: string; 
  status?: string; 
  client?: string; 
  location?: string; 
  builder?: string; 
};

type ProjectOption = { 
  id: string; 
  title: string; 
};

// Pipeline phases configuration
const PIPELINE_PHASES = [
  { 
    key: 'bidding', 
    label: 'Bidding', 
    icon: FileText, 
    statuses: ['Bidding', 'Proposal', 'Quote Sent', 'Pending'],
    color: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300',
    iconColor: 'text-yellow-400'
  },
  { 
    key: 'post-beam', 
    label: 'Post & Beam', 
    icon: Hammer, 
    statuses: ['Post & Beam', 'Foundation', 'Rough-in'],
    color: 'bg-blue-500/20 border-blue-500/30 text-blue-300',
    iconColor: 'text-blue-400'
  },
  { 
    key: 'top-out', 
    label: 'Top Out', 
    icon: TrendingUp, 
    statuses: ['Top Out', 'Topping Out', 'Structure Complete'],
    color: 'bg-purple-500/20 border-purple-500/30 text-purple-300',
    iconColor: 'text-purple-400'
  },
  { 
    key: 'trim', 
    label: 'Trim', 
    icon: PaintBucket, 
    statuses: ['Trim', 'Finishing', 'Final'],
    color: 'bg-green-500/20 border-green-500/30 text-green-300',
    iconColor: 'text-green-400'
  },
  { 
    key: 'invoice-ready', 
    label: 'Invoice Ready', 
    icon: CreditCard, 
    statuses: ['Invoice Ready', 'Complete', 'Ready to Bill', 'Billing'],
    color: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300',
    iconColor: 'text-emerald-400'
  },
  { 
    key: 'other', 
    label: 'Other', 
    icon: AlertCircle, 
    statuses: [], // Catches everything else
    color: 'bg-gray-500/20 border-gray-500/30 text-gray-300',
    iconColor: 'text-gray-400'
  }
];

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: 'Fetch error with no JSON body' }));
    throw new Error(errorBody.error || 'Fetch error');
  }
  return res.json() as T;
}

function getProjectPhase(status?: string) {
  if (!status) return 'other';
  
  for (const phase of PIPELINE_PHASES) {
    if (phase.statuses.some(s => status.toLowerCase().includes(s.toLowerCase()))) {
      return phase.key;
    }
  }
  return 'other';
}

function DashboardComponent({ initialKpis, initialPendingAcct }: { 
  initialKpis: KPI, 
  initialPendingAcct: ProjectRow[] 
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewingProjectId = searchParams.get('viewing');

  const [kpis, setKpis] = useState(initialKpis);
  const [pendingAcct, setPendingAcct] = useState(initialPendingAcct);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [statusOptions, setStatusOptions] = useState<string[]>(['All']);
  const [boardItems, setBoardItems] = useState<BoardItem[]>([]);
  const [boardLoading, setBoardLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  // Action states
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
    } catch (e: any) { 
      setError(e.message);
    }
  };

  const loadBoard = useMemo(() => async () => {
    setBoardLoading(true);
    try {
      const qs = new URLSearchParams({ q: query });
      const data = await fetchJSON<{ items: BoardItem[]; statusOptions: string[] }>(`/api/projects/board?${qs}`);
      setBoardItems(data.items);
      setStatusOptions(['All', ...data.statusOptions]);
    } catch (e: any) { 
      setError(e.message);
    } finally { 
      setBoardLoading(false);
    }
  }, [query]);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadBoard(); }, [loadBoard]);

  // Group projects by phase
  const groupedProjects = useMemo(() => {
    const filtered = selectedPhase === 'all' 
      ? boardItems 
      : boardItems.filter(item => getProjectPhase(item.status) === selectedPhase);

    const groups = PIPELINE_PHASES.reduce((acc, phase) => {
      acc[phase.key] = filtered.filter(item => getProjectPhase(item.status) === phase.key);
      return acc;
    }, {} as Record<string, BoardItem[]>);

    return groups;
  }, [boardItems, selectedPhase]);

  const handleActionSubmit = async (type: 'photo' | 'upgrade') => {
    if (!actionProjectId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      if (type === 'photo' && photoFile) {
        const formData = new FormData();
        formData.append('file', photoFile);
        formData.append('projectId', actionProjectId);
        formData.append('description', photoDescription);
        await fetch('/api/photos', { method: 'POST', body: formData });
        setPhotoFile(null); 
        setPhotoDescription('');
        (document.getElementById('photo-file-input') as HTMLInputElement).value = '';
      } else if (type === 'upgrade' && upgradeTitle) {
        await fetch('/api/improvements', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ projectId: actionProjectId, title: upgradeTitle }) 
        });
        setUpgradeTitle('');
      }
      await loadData();
    } catch (e: any) { 
      setError(e.message);
    } finally { 
      setIsSubmitting(false);
    }
  };

  const handleViewProject = (id: string) => router.push(`/?viewing=${id}`);
  const handleClosePanel = () => router.push('/');

  const totalProjects = boardItems.length;
  const phaseStats = PIPELINE_PHASES.map(phase => ({
    ...phase,
    count: groupedProjects[phase.key]?.length || 0
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header KPIs */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard 
              icon={TrendingUp} 
              label="Active Bids" 
              value={kpis.activeBids} 
              trend="+12%" 
              color="text-blue-400"
            />
            <KPICard 
              icon={Hammer} 
              label="Post & Beam" 
              value={kpis.postAndBeam} 
              trend="+5%" 
              color="text-purple-400"
            />
            <KPICard 
              icon={AlertCircle} 
              label="Pending Accounts" 
              value={kpis.jobAccountsPending} 
              trend="-2" 
              color="text-yellow-400"
            />
            <KPICard 
              icon={CheckCircle2} 
              label="Open Issues" 
              value={kpis.openProblems} 
              trend="-8%" 
              color="text-green-400"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-4 pt-6">
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg">
            {error}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-3 space-y-6">
            {/* Search and Filters */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-6">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex-1 w-full lg:max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      value={searchInput}
                      onChange={e => setSearchInput(e.target.value)}
                      placeholder="Search projects, clients, locations..."
                      className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                {/* Phase Filter Pills */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedPhase('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedPhase === 'all'
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    All ({totalProjects})
                  </button>
                  {phaseStats.map(phase => (
                    <button
                      key={phase.key}
                      onClick={() => setSelectedPhase(phase.key)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        selectedPhase === phase.key
                          ? phase.color
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <phase.icon className="h-4 w-4" />
                      {phase.label} ({phase.count})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Projects Grid */}
            <div className="space-y-6">
              {boardLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-32 bg-slate-800/50 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : selectedPhase === 'all' ? (
                // Show by phases when "all" is selected
                PIPELINE_PHASES.map(phase => {
                  const projects = groupedProjects[phase.key];
                  if (projects.length === 0) return null;
                  
                  return (
                    <div key={phase.key} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${phase.color}`}>
                          <phase.icon className={`h-5 w-5 ${phase.iconColor}`} />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-100">
                          {phase.label} ({projects.length})
                        </h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {projects.map(project => (
                          <ProjectCard
                            key={project.id}
                            project={project}
                            phase={phase}
                            onClick={() => handleViewProject(project.id)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                // Show selected phase only
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groupedProjects[selectedPhase]?.map(project => {
                    const phase = PIPELINE_PHASES.find(p => p.key === selectedPhase)!;
                    return (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        phase={phase}
                        onClick={() => handleViewProject(project.id)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <ActionCard title="Add Photo" icon={Camera}>
              <div className="space-y-3">
                <select 
                  value={actionProjectId} 
                  onChange={e => setActionProjectId(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
                <input 
                  id="photo-file-input"
                  type="file" 
                  accept="image/*" 
                  onChange={e => setPhotoFile(e.target.files?.[0] || null)} 
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer"
                />
                <input 
                  value={photoDescription} 
                  onChange={e => setPhotoDescription(e.target.value)} 
                  placeholder="Photo description..." 
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400"
                />
                <button 
                  onClick={() => handleActionSubmit('photo')} 
                  disabled={isSubmitting || !photoFile} 
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-400 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  {isSubmitting ? 'Uploading...' : 'Upload Photo'}
                </button>
              </div>
            </ActionCard>

            <ActionCard title="Add Improvement" icon={Plus}>
              <div className="space-y-3">
                <select 
                  value={actionProjectId} 
                  onChange={e => setActionProjectId(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
                <input 
                  value={upgradeTitle} 
                  onChange={e => setUpgradeTitle(e.target.value)} 
                  placeholder="Improvement description..." 
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400"
                />
                <button 
                  onClick={() => handleActionSubmit('upgrade')} 
                  disabled={isSubmitting || !upgradeTitle} 
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-400 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  {isSubmitting ? 'Adding...' : 'Add Improvement'}
                </button>
              </div>
            </ActionCard>

            <ActionCard title="Job Account Setup" icon={CheckCircle2}>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {pendingAcct.length > 0 ? pendingAcct.map(row => (
                  <div key={row.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                    <div 
                      onClick={() => handleViewProject(row.id)} 
                      className="cursor-pointer mb-2"
                    >
                      <p className="font-medium text-slate-100 text-sm">{row.title}</p>
                      <p className="text-xs text-slate-400">{row.client}</p>
                    </div>
                    <button 
                      className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-1.5 px-3 rounded text-sm font-medium transition-colors"
                      onClick={async () => {
                        try {
                          await fetch('/api/projects/job-account', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: row.id, value: true })
                          });
                          await loadData();
                        } catch(e: any) {
                          setError(e.message);
                        }
                      }}
                    >
                      Mark Complete
                    </button>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">All accounts are set up!</p>
                  </div>
                )}
              </div>
            </ActionCard>
          </div>
        </div>
      </div>
    </div>
  );
}

const KPICard = ({ icon: Icon, label, value, trend, color }: {
  icon: React.ElementType;
  label: string;
  value: number;
  trend: string;
  color: string;
}) => (
  <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4">
    <div className="flex items-center justify-between">
      <div className={`p-2 rounded-lg bg-slate-800 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <span className={`text-xs font-medium ${trend.startsWith('+') ? 'text-green-400' : trend.startsWith('-') && !trend.includes('%') ? 'text-red-400' : 'text-slate-400'}`}>
        {trend}
      </span>
    </div>
    <div className="mt-3">
      <p className="text-2xl font-bold text-slate-100">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  </div>
);

const ActionCard = ({ icon: Icon, title, children }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl overflow-hidden">
    <div className="p-4 border-b border-slate-800 flex items-center gap-3">
      <Icon className="h-5 w-5 text-slate-300" />
      <h3 className="font-semibold text-slate-100">{title}</h3>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const ProjectCard = ({ project, phase, onClick }: {
  project: BoardItem;
  phase: typeof PIPELINE_PHASES[0];
  onClick: () => void;
}) => (
  <div 
    onClick={onClick}
    className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4 cursor-pointer transition-all hover:border-slate-600 hover:bg-slate-900/70 hover:shadow-xl hover:shadow-blue-500/10 group"
  >
    <div className="flex items-start justify-between mb-3">
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-slate-100 text-lg truncate group-hover:text-blue-300 transition-colors">
          {project.title}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${phase.color}`}>
            <phase.icon className="h-3 w-3" />
            {project.status || 'No Status'}
          </div>
        </div>
      </div>
      <ExternalLink className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
    
    <div className="space-y-2 text-sm">
      {project.client && (
        <div className="flex items-center gap-2 text-slate-300">
          <User className="h-4 w-4 text-slate-400" />
          <span className="truncate">{project.client}</span>
        </div>
      )}
      {project.builder && (
        <div className="flex items-center gap-2 text-slate-300">
          <Building className="h-4 w-4 text-slate-400" />
          <span className="truncate">{project.builder}</span>
        </div>
      )}
      {project.location && (
        <div className="flex items-center gap-2 text-slate-300">
          <MapPin className="h-4 w-4 text-slate-400" />
          <span className="truncate">{project.location}</span>
        </div>
      )}
    </div>
  </div>
);

export default function OperationsDashboard(props: { 
  initialKpis: KPI; 
  initialPendingAcct: ProjectRow[]; 
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    }>
      <DashboardComponent {...props} />
    </Suspense>
  );
}