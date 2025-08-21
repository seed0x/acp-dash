'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { 
  Plus, Camera, CheckCircle2, Search, User, Building, MapPin, 
  DollarSign, Clock, TrendingUp, AlertCircle, CheckSquare,
  Filter, Calendar, Phone, Mail, ExternalLink, Star,
  Hammer, Wrench, PaintBucket, FileText, CreditCard, Upload, X
} from 'lucide-react';
// ProjectDetailPanel component will be defined inline below

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

// Pipeline phases configuration - FIXED for case-insensitive matching
const PIPELINE_PHASES = [
  { 
    key: 'bidding', 
    label: 'Bidding', 
    icon: FileText, 
    statuses: ['bidding', 'proposal', 'quote sent', 'pending'],
    color: 'bg-yellow-500/20 border-yellow-500/30',
    iconColor: 'text-yellow-400',
    headerColor: 'bg-yellow-500/10'
  },
  { 
    key: 'post-beam', 
    label: 'Post & Beam', 
    icon: Hammer, 
    statuses: ['post & beam', 'foundation', 'rough-in', 'rough in'],
    color: 'bg-blue-500/20 border-blue-500/30',
    iconColor: 'text-blue-400',
    headerColor: 'bg-blue-500/10'
  },
  { 
    key: 'top-out', 
    label: 'Top Out', 
    icon: TrendingUp, 
    statuses: ['top out', 'topping out', 'structure complete'],
    color: 'bg-purple-500/20 border-purple-500/30',
    iconColor: 'text-purple-400',
    headerColor: 'bg-purple-500/10'
  },
  { 
    key: 'trim', 
    label: 'Trim', 
    icon: PaintBucket, 
    statuses: ['trim', 'finishing', 'final'],
    color: 'bg-green-500/20 border-green-500/30',
    iconColor: 'text-green-400',
    headerColor: 'bg-green-500/10'
  },
  { 
    key: 'invoice-ready', 
    label: 'Invoice Ready', 
    icon: CreditCard, 
    statuses: ['invoice ready', 'complete', 'ready to bill', 'billing', 'completed'],
    color: 'bg-emerald-500/20 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    headerColor: 'bg-emerald-500/10'
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
  
  const statusLower = status.toLowerCase();
  for (const phase of PIPELINE_PHASES) {
    if (phase.statuses.some(s => statusLower.includes(s))) {
      return phase.key;
    }
  }
  return 'other';
}

function DashboardComponent({ initialKpis, initialPendingAcct }: { 
  initialKpis: KPI, 
  initialPendingAcct: ProjectRow[] 
}) {
  const [viewingProjectId, setViewingProjectId] = useState<string | null>(null);
  const [kpis, setKpis] = useState(initialKpis);
  const [pendingAcct, setPendingAcct] = useState(initialPendingAcct);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [boardItems, setBoardItems] = useState<BoardItem[]>([]);
  const [boardLoading, setBoardLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  // Action states
  const [actionProjectId, setActionProjectId] = useState('');
  const [upgradeTitle, setUpgradeTitle] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoDescription, setPhotoDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQuery(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadData = async () => {
    try {
      setError(null);
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
      setError(`Failed to load data: ${e.message}`);
    }
  };

  const loadBoard = useMemo(() => async () => {
    setBoardLoading(true);
    try {
      setError(null);
      const qs = new URLSearchParams({ q: query, status: 'All' });
      const data = await fetchJSON<{ items: BoardItem[]; statusOptions: string[] }>(`/api/projects/board?${qs}`);
      setBoardItems(data.items || []);
      if (data.statusOptions && data.statusOptions.length > 0) {
        // Don't override if we already have status options
        setStatusOptions(prev => prev.length > 1 ? prev : ['All', ...data.statusOptions]);
      }
    } catch (e: any) { 
      setError(`Failed to load projects: ${e.message}`);
      setBoardItems([]); // Clear items on error
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
    if (!actionProjectId) {
      setError('Please select a project first');
      return;
    }
    
    if (type === 'photo' && !photoFile) {
      setError('Please select a photo file');
      return;
    }
    
    if (type === 'upgrade' && !upgradeTitle.trim()) {
      setError('Please enter an improvement description');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      if (type === 'photo' && photoFile) {
        const formData = new FormData();
        formData.append('file', photoFile);
        formData.append('projectId', actionProjectId);
        formData.append('description', photoDescription.trim() || photoFile.name);
        
        const response = await fetch('/api/photos', { method: 'POST', body: formData });
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to upload photo');
        }
        
        // Success - reset form
        setPhotoFile(null); 
        setPhotoDescription('');
        setShowPhotoUpload(false);
        const fileInput = document.getElementById('photo-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        // Show success message briefly
        const successMessage = `Photo uploaded successfully to ${projects.find(p => p.id === actionProjectId)?.title}`;
        setError(null);
        
      } else if (type === 'upgrade' && upgradeTitle.trim()) {
        const response = await fetch('/api/improvements', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ 
            projectId: actionProjectId, 
            title: upgradeTitle.trim() 
          }) 
        });
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to add improvement');
        }
        
        // Success - reset form
        setUpgradeTitle('');
        
        // Show success message briefly
        const successMessage = `Improvement added to ${projects.find(p => p.id === actionProjectId)?.title}`;
        setError(null);
      }
      
      // Reload data to reflect changes
      await loadData();
    } catch (e: any) { 
      setError(e.message || 'An unexpected error occurred');
    } finally { 
      setIsSubmitting(false);
    }
  };

  const handleViewProject = (id: string) => setViewingProjectId(id);
  const handleClosePanel = () => setViewingProjectId(null);

  const totalProjects = boardItems.length;
  const phaseStats = PIPELINE_PHASES.map(phase => ({
    ...phase,
    count: groupedProjects[phase.key]?.length || 0
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Project Detail Panel */}
      {viewingProjectId && (
        <ProjectDetailPanel 
          projectId={viewingProjectId} 
          onClose={handleClosePanel} 
        />
      )}

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
                          ? `${phase.color} text-white`
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

            {/* Projects by Phase - Scrollable Containers */}
            <div className="space-y-6">
              {boardLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-32 bg-slate-800/50 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : boardItems.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/30 rounded-xl border border-slate-800">
                  <Building className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-100 mb-2">No Projects Found</h3>
                  <p className="text-slate-400 mb-4">
                    {query ? `No projects match "${query}"` : 'No projects in your Notion database yet'}
                  </p>
                  <p className="text-sm text-slate-500">
                    {query ? 'Try adjusting your search terms' : 'Add projects to your Notion database to see them here'}
                  </p>
                </div>
              ) : selectedPhase === 'all' ? (
                // Show by phases when "all" is selected
                PIPELINE_PHASES.map(phase => {
                  const projects = groupedProjects[phase.key];
                  if (projects.length === 0) return null;
                  
                  return (
                    <PhaseContainer
                      key={phase.key}
                      phase={phase}
                      projects={projects}
                      onProjectClick={handleViewProject}
                    />
                  );
                })
              ) : (
                // Show selected phase only
                <div>
                  {groupedProjects[selectedPhase] && groupedProjects[selectedPhase].length > 0 ? (
                    <PhaseContainer
                      phase={PIPELINE_PHASES.find(p => p.key === selectedPhase)!}
                      projects={groupedProjects[selectedPhase]}
                      onProjectClick={handleViewProject}
                      hideHeader
                    />
                  ) : (
                    <div className="text-center py-12">
                      <CheckCircle2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-400">No projects in this phase</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Mobile-First Photo Upload */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Camera className="h-5 w-5 text-slate-300" />
                  <h3 className="font-semibold text-slate-100">Photo Upload</h3>
                </div>
                <button
                  onClick={() => setShowPhotoUpload(!showPhotoUpload)}
                  className="text-slate-400 hover:text-slate-100 transition-colors"
                >
                  {showPhotoUpload ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </button>
              </div>
              
              {showPhotoUpload && (
                <div className="p-4 space-y-4">
                  {/* Project Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Select Lot</label>
                    <select 
                      value={actionProjectId} 
                      onChange={e => setActionProjectId(e.target.value)} 
                      className="w-full px-3 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Choose a lot...</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Photo</label>
                    <div className="relative">
                      <input 
                        id="photo-file-input"
                        type="file" 
                        accept="image/*" 
                        onChange={e => setPhotoFile(e.target.files?.[0] || null)}
                        className="w-full px-3 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer file:font-medium hover:file:bg-blue-700"
                      />
                      {photoFile && (
                        <div className="mt-2 text-sm text-green-400 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          File selected: {photoFile.name}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                    <input 
                      value={photoDescription} 
                      onChange={e => setPhotoDescription(e.target.value)} 
                      placeholder="What's happening in this photo?"
                      className="w-full px-3 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Upload Button */}
                  <button 
                    onClick={() => handleActionSubmit('photo')} 
                    disabled={isSubmitting || !photoFile || !actionProjectId} 
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-700 disabled:to-slate-600 disabled:text-slate-400 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 shadow-lg disabled:shadow-none flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload Photo
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Add Improvement */}
            {/* Add Improvement/Issue */}
            <ActionCard title="Add Issue/Improvement" icon={Plus}>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Project</label>
                  <select 
                    value={actionProjectId} 
                    onChange={e => setActionProjectId(e.target.value)} 
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
                  >
                    <option value="">Choose a lot...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Issue Description</label>
                  <input 
                    value={upgradeTitle} 
                    onChange={e => setUpgradeTitle(e.target.value)} 
                    placeholder="e.g., Plumbing leak in bathroom, Need electrical upgrade..." 
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400"
                  />
                </div>
                <button 
                  onClick={() => handleActionSubmit('upgrade')} 
                  disabled={isSubmitting || !upgradeTitle.trim() || !actionProjectId} 
                  className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:text-slate-400 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add Issue
                    </>
                  )}
                </button>
              </div>
            </ActionCard>

            {/* Job Account Setup */}
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
                          const response = await fetch('/api/projects/job-account', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: row.id, value: true })
                          });
                          if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.error || 'Failed to update job account');
                          }
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

const PhaseContainer = ({ phase, projects, onProjectClick, hideHeader = false }: {
  phase: typeof PIPELINE_PHASES[0];
  projects: BoardItem[];
  onProjectClick: (id: string) => void;
  hideHeader?: boolean;
}) => (
  <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-xl overflow-hidden">
    {!hideHeader && (
      <div className={`p-4 border-b border-slate-800 ${phase.headerColor} flex items-center gap-3`}>
        <div className={`p-2 rounded-lg ${phase.color}`}>
          <phase.icon className={`h-5 w-5 ${phase.iconColor}`} />
        </div>
        <h2 className="text-lg font-semibold text-slate-100">
          {phase.label} ({projects.length})
        </h2>
      </div>
    )}
    <div className="p-4">
      <div className="max-h-96 overflow-y-auto space-y-3">
        {projects.map(project => (
          <ProjectCard
            key={project.id}
            project={project}
            phase={phase}
            onClick={() => onProjectClick(project.id)}
          />
        ))}
      </div>
    </div>
  </div>
);

const ProjectCard = ({ project, phase, onClick }: {
  project: BoardItem;
  phase: typeof PIPELINE_PHASES[0];
  onClick: () => void;
}) => (
  <div 
    onClick={onClick}
    className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-lg p-4 cursor-pointer transition-all hover:border-slate-600 hover:bg-slate-800/70 hover:shadow-xl hover:shadow-blue-500/10 group"
  >
    <div className="flex items-start justify-between mb-3">
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-slate-100 text-base truncate group-hover:text-blue-300 transition-colors">
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
    
    <div className="space-y-1 text-sm">
      {project.client && (
        <div className="flex items-center gap-2 text-slate-300">
          <User className="h-3 w-3 text-slate-400" />
          <span className="truncate">{project.client}</span>
        </div>
      )}
      {project.builder && (
        <div className="flex items-center gap-2 text-slate-300">
          <Building className="h-3 w-3 text-slate-400" />
          <span className="truncate">{project.builder}</span>
        </div>
      )}
      {project.location && (
        <div className="flex items-center gap-2 text-slate-300">
          <MapPin className="h-3 w-3 text-slate-400" />
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

// ProjectDetailPanel Component
function ProjectDetailPanel({ projectId, onClose }: { 
  projectId: string; 
  onClose: () => void; 
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('photos');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const res = await fetch(`/api/projects/${projectId}/full`, { cache: 'no-store' });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Failed to parse error response' }));
          throw new Error(errorData.error || 'Failed to fetch project details');
        }
        const projectData = await res.json();
        setData(projectData);
      } catch (e: any) { 
        setError(e.message || 'Unknown error occurred');
      } finally { 
        setLoading(false);
      }
    }
    
    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  const { project, photos = [] } = data || {};

  const DETAIL_TABS = [
    { key: 'photos', label: 'Photos', icon: Camera },
    { key: 'overview', label: 'Overview', icon: FileText },
    { key: 'finances', label: 'Finances', icon: DollarSign },
  ];

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-slate-900 border-l border-slate-800 h-full w-full max-w-4xl ml-auto flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex-shrink-0 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800">
          <div className="p-6">
            <div className="flex items-start justify-between">
              {loading ? (
                <div className="space-y-3">
                  <div className="h-8 w-3/4 bg-slate-800 rounded-md animate-pulse" />
                  <div className="h-4 w-1/2 bg-slate-800 rounded-md animate-pulse" />
                </div>
              ) : (
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-bold text-slate-100 mb-2">{project?.title || 'Project Details'}</h1>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    {project?.client && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <User className="h-4 w-4 text-slate-400" />
                        <span>{project.client}</span>
                      </div>
                    )}
                    {project?.status && (
                      <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        <CheckCircle2 className="h-3 w-3" />
                        {project.status}
                      </div>
                    )}
                    {project?.location && (
                      <a 
                        href={`https://maps.google.com/?q=${encodeURIComponent(project.location)}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <MapPin className="h-4 w-4" />
                        <span className="hover:underline">View Location</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
              <button 
                onClick={onClose} 
                className="text-slate-400 hover:text-slate-100 p-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Tabs */}
            <div className="mt-6 border-b border-slate-800">
              <nav className="-mb-px flex gap-1 overflow-x-auto">
                {DETAIL_TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 py-3 px-4 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                      activeTab === tab.key
                        ? 'bg-slate-800 text-blue-300 border-b-2 border-blue-500'
                        : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                    {tab.key === 'photos' && photos && (
                      <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full">
                        {photos.length}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto">
          <div className="p-6">
            {loading && (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-slate-800 rounded-lg animate-pulse" />
                ))}
              </div>
            )}
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-3">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            )}
            
            {data && (
              <div>
                {activeTab === 'photos' && (
                  <div>
                    {photos.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {photos.map((photo: any) => (
                          <div key={photo.id} className="group">
                            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-600 transition-colors">
                              <a href={photo.url} target="_blank" rel="noopener noreferrer" className="block relative">
                                <img 
                                  src={photo.url} 
                                  alt={photo.description} 
                                  className="w-full h-48 object-cover bg-slate-800 group-hover:scale-105 transition-transform duration-300" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"/>
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2">
                                    <ExternalLink className="h-4 w-4 text-white" />
                                  </div>
                                </div>
                              </a>
                              <div className="p-4">
                                <p className="text-sm text-slate-300">{photo.description}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Camera className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-400">No photos uploaded yet</p>
                        <p className="text-sm text-slate-500 mt-1">Photos will appear here as they're added to the project</p>
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === 'overview' && project && (
                  <div className="space-y-6">
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                      <h3 className="font-semibold text-slate-100 mb-4">Project Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-800/30 rounded-lg">
                          <p className="text-sm text-slate-400">Status</p>
                          <p className="font-semibold text-slate-100">{project.status || '-'}</p>
                        </div>
                        <div className="p-3 bg-slate-800/30 rounded-lg">
                          <p className="text-sm text-slate-400">Client</p>
                          <p className="font-semibold text-slate-100">{project.client || '-'}</p>
                        </div>
                        <div className="p-3 bg-slate-800/30 rounded-lg">
                          <p className="text-sm text-slate-400">Builder</p>
                          <p className="font-semibold text-slate-100">{project.builder || '-'}</p>
                        </div>
                        <div className="p-3 bg-slate-800/30 rounded-lg">
                          <p className="text-sm text-slate-400">Location</p>
                          <p className="font-semibold text-slate-100">{project.location || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'finances' && project && (
                  <div className="space-y-6">
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                      <h3 className="font-semibold text-slate-100 mb-4">Financial Overview</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-800/30 rounded-lg">
                          <p className="text-sm text-slate-400">Budget</p>
                          <p className="font-semibold text-slate-100">{project.budget ? `${project.budget.toLocaleString()}` : '-'}</p>
                        </div>
                        <div className="p-3 bg-slate-800/30 rounded-lg">
                          <p className="text-sm text-slate-400">Spent</p>
                          <p className="font-semibold text-slate-100">{project.spent ? `${project.spent.toLocaleString()}` : '-'}</p>
                        </div>
                        <div className="p-3 bg-slate-800/30 rounded-lg">
                          <p className="text-sm text-slate-400">Total Hours</p>
                          <p className="font-semibold text-slate-100">{project.totalHours ? `${project.totalHours} hrs` : '-'}</p>
                        </div>
                        <div className="p-3 bg-slate-800/30 rounded-lg">
                          <p className="text-sm text-slate-400">Open Tasks</p>
                          <p className="font-semibold text-slate-100">{project.openTasks || '0'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}