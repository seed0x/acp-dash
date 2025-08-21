'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { 
  Plus, Camera, CheckCircle2, Search, User, Building, MapPin, 
  DollarSign, Clock, TrendingUp, AlertCircle, CheckSquare,
  Filter, Calendar, Phone, Mail, ExternalLink, Star,
  Hammer, Wrench, PaintBucket, FileText, CreditCard, Upload, X,
  Edit3, Save, RotateCcw, Eye, MessageSquare, PhoneCall, Trophy, AlertTriangle
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  // UI states
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<string>('');

  useEffect(() => {
    const t = setTimeout(() => setQuery(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

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
        setStatusOptions(prev => prev.length > 1 ? prev : ['All', ...data.statusOptions]);
      }
    } catch (e: any) { 
      setError(`Failed to load projects: ${e.message}`);
      setBoardItems([]);
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

  const handleQuickAction = async (type: 'photo' | 'upgrade') => {
    if (!actionProjectId) {
      setError('Please select a project first');
      return;
    }
    
    if (type === 'photo' && !photoFile) {
      setError('Please select a photo file');
      return;
    }
    
    if (type === 'upgrade' && !upgradeTitle.trim()) {
      setError('Please enter an issue description');
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
        formData.append('date', new Date().toISOString().split('T')[0]); // Add current date
        
        const response = await fetch('/api/photos', { method: 'POST', body: formData });
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to upload photo');
        }
        
        // Success - reset form
        setPhotoFile(null); 
        setPhotoDescription('');
        const fileInput = document.getElementById('photo-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        const projectName = projects.find(p => p.id === actionProjectId)?.title;
        setSuccessMessage(`Photo uploaded to ${projectName}`);
        
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
          throw new Error(result.error || 'Failed to add issue');
        }
        
        // Success - reset form
        setUpgradeTitle('');
        
        const projectName = projects.find(p => p.id === actionProjectId)?.title;
        setSuccessMessage(`Issue added to ${projectName}`);
      }
      
      // Reload data to reflect changes
      await loadData();
    } catch (e: any) { 
      setError(e.message || 'An unexpected error occurred');
    } finally { 
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (projectId: string, newStatus: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update status');
      }
      
      setSuccessMessage('Status updated successfully');
      await loadBoard();
      setEditingProject(null);
    } catch (e: any) {
      setError(e.message);
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
              icon={AlertTriangle} 
              label="Pending Setup" 
              value={kpis.jobAccountsPending} 
              trend="-2" 
              color="text-yellow-400"
              subtitle="Job accounts needing setup"
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

      {/* Success/Error Messages */}
      {(error || successMessage) && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {successMessage && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5" />
                <span>{successMessage}</span>
              </div>
              <button onClick={() => setSuccessMessage(null)} className="text-green-400 hover:text-green-300">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-3 space-y-6">
            {/* Mobile Photo Upload - At Top for iPhone */}
            <div className="xl:hidden">
              <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Camera className="h-6 w-6 text-blue-400" />
                  <h3 className="font-semibold text-slate-100">Quick Photo Upload</h3>
                </div>
                <div className="space-y-4">
                  <select 
                    value={actionProjectId} 
                    onChange={e => setActionProjectId(e.target.value)} 
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100"
                  >
                    <option value="">Choose a lot...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                  <input 
                    id="photo-file-input"
                    type="file" 
                    accept="image/*" 
                    onChange={e => setPhotoFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer"
                  />
                  <input 
                    value={photoDescription} 
                    onChange={e => setPhotoDescription(e.target.value)} 
                    placeholder="What's happening in this photo?"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-400"
                  />
                  <button 
                    onClick={() => handleQuickAction('photo')} 
                    disabled={isSubmitting || !photoFile || !actionProjectId}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-700 disabled:to-slate-600 text-white py-3 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5" />
                        Upload Photo
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Enhanced Search - FIXED UI */}
            <div className="bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-slate-700 rounded-2xl p-6 shadow-2xl">
              <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                <div className="flex-1 w-full lg:max-w-md">
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-400 transition-colors duration-200" />
                    <input
                      value={searchInput}
                      onChange={e => setSearchInput(e.target.value)}
                      placeholder="Search projects, clients, locations..."
                      className="w-full pl-12 pr-12 py-4 bg-slate-800/60 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-inner"
                    />
                    {searchInput && (
                      <button
                        onClick={() => setSearchInput('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Phase Filter Pills - IMPROVED */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setSelectedPhase('all')}
                    className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      selectedPhase === 'all'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100'
                    }`}
                  >
                    All ({totalProjects})
                  </button>
                  {phaseStats.map(phase => (
                    <button
                      key={phase.key}
                      onClick={() => setSelectedPhase(phase.key)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                        selectedPhase === phase.key
                          ? `${phase.color} border shadow-lg`
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100'
                      }`}
                    >
                      <phase.icon className="h-4 w-4" />
                      {phase.label} ({phase.count})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Projects by Phase */}
            <div className="space-y-8">
              {boardLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-32 bg-slate-800/50 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : boardItems.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800">
                  <Building className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-100 mb-2">No Projects Found</h3>
                  <p className="text-slate-400 mb-4">
                    {query ? `No projects match "${query}"` : 'No projects in your database yet'}
                  </p>
                </div>
              ) : selectedPhase === 'all' ? (
                // Show all phases with dedicated sections
                PIPELINE_PHASES.map(phase => {
                  const projects = groupedProjects[phase.key];
                  if (projects.length === 0) return null;
                  
                  return (
                    <PhaseContainer
                      key={phase.key}
                      phase={phase}
                      projects={projects}
                      onProjectClick={handleViewProject}
                      onStatusUpdate={handleStatusUpdate}
                      editingProject={editingProject}
                      setEditingProject={setEditingProject}
                      editingStatus={editingStatus}
                      setEditingStatus={setEditingStatus}
                      statusOptions={statusOptions}
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
                      onStatusUpdate={handleStatusUpdate}
                      editingProject={editingProject}
                      setEditingProject={setEditingProject}
                      editingStatus={editingStatus}
                      setEditingStatus={setEditingStatus}
                      statusOptions={statusOptions}
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

          {/* Desktop Sidebar */}
          <div className="hidden xl:block space-y-6">
            {/* Photo Upload */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center gap-3">
                <Camera className="h-5 w-5 text-slate-300" />
                <h3 className="font-semibold text-slate-100">Photo Upload</h3>
              </div>
              <div className="p-4 space-y-4">
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
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Photo</label>
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
                      Selected: {photoFile.name}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <input 
                    value={photoDescription} 
                    onChange={e => setPhotoDescription(e.target.value)} 
                    placeholder="What's happening in this photo?"
                    className="w-full px-3 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button 
                  onClick={() => handleQuickAction('photo')} 
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
            </div>

            {/* Add Issue */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-slate-300" />
                <h3 className="font-semibold text-slate-100">Add Issue</h3>
              </div>
              <div className="p-4 space-y-3">
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
                <input 
                  value={upgradeTitle} 
                  onChange={e => setUpgradeTitle(e.target.value)} 
                  placeholder="e.g., Plumbing leak in bathroom..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400"
                />
                <button 
                  onClick={() => handleQuickAction('upgrade')} 
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
            </div>

            {/* Job Account Setup */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-slate-300" />
                <h3 className="font-semibold text-slate-100">Job Account Setup</h3>
              </div>
              <div className="p-4">
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {pendingAcct.length > 0 ? pendingAcct.map(row => (
                    <div key={row.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                      <div 
                        onClick={() => handleViewProject(row.id)} 
                        className="cursor-pointer mb-2"
                      >
                        <p className="font-medium text-slate-100 text-sm">{row.title}</p>
                        <p className="text-xs text-slate-400">{row.client || 'No client'}</p>
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
                            setSuccessMessage('Job account marked as complete');
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const KPICard = ({ icon: Icon, label, value, trend, color, subtitle }: {
  icon: React.ElementType;
  label: string;
  value: number;
  trend: string;
  color: string;
  subtitle?: string;
}) => (
  <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all">
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
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  </div>
);

const PhaseContainer = ({ phase, projects, onProjectClick, onStatusUpdate, editingProject, setEditingProject, editingStatus, setEditingStatus, statusOptions, hideHeader = false }: {
  phase: typeof PIPELINE_PHASES[0];
  projects: BoardItem[];
  onProjectClick: (id: string) => void;
  onStatusUpdate: (id: string, status: string) => void;
  editingProject: string | null;
  setEditingProject: (id: string | null) => void;
  editingStatus: string;
  setEditingStatus: (status: string) => void;
  statusOptions: string[];
  hideHeader?: boolean;
}) => (
  <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">
    {!hideHeader && (
      <div className={`p-6 border-b border-slate-800 ${phase.headerColor} flex items-center gap-3`}>
        <div className={`p-3 rounded-xl ${phase.color}`}>
          <phase.icon className={`h-6 w-6 ${phase.iconColor}`} />
        </div>
        <h2 className="text-xl font-semibold text-slate-100">
          {phase.label} ({projects.length})
        </h2>
      </div>
    )}
    <div className="p-6">
      <div className="space-y-4">
        {projects.map(project => (
          <ProjectCard
            key={project.id}
            project={project}
            phase={phase}
            onClick={() => onProjectClick(project.id)}
            onStatusUpdate={onStatusUpdate}
            editingProject={editingProject}
            setEditingProject={setEditingProject}
            editingStatus={editingStatus}
            setEditingStatus={setEditingStatus}
            statusOptions={statusOptions}
          />
        ))}
      </div>
    </div>
  </div>
);

const ProjectCard = ({ project, phase, onClick, onStatusUpdate, editingProject, setEditingProject, editingStatus, setEditingStatus, statusOptions }: {
  project: BoardItem;
  phase: typeof PIPELINE_PHASES[0];
  onClick: () => void;
  onStatusUpdate: (id: string, status: string) => void;
  editingProject: string | null;
  setEditingProject: (id: string | null) => void;
  editingStatus: string;
  setEditingStatus: (status: string) => void;
  statusOptions: string[];
}) => (
  <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-xl p-4 hover:border-slate-600 hover:bg-slate-800/70 transition-all group">
    <div className="flex items-start justify-between mb-3">
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-slate-100 text-lg truncate group-hover:text-blue-300 transition-colors cursor-pointer" onClick={onClick}>
          {project.title}
        </h3>
        <div className="flex items-center gap-2 mt-2">
          {editingProject === project.id ? (
            <div className="flex items-center gap-2">
              <select
                value={editingStatus}
                onChange={e => setEditingStatus(e.target.value)}
                className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-slate-100"
              >
                {statusOptions.filter(s => s !== 'All').map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  onStatusUpdate(project.id, editingStatus);
                }}
                className="p-1 text-green-400 hover:text-green-300"
              >
                <Save className="h-3 w-3" />
              </button>
              <button
                onClick={() => setEditingProject(null)}
                className="p-1 text-red-400 hover:text-red-300"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium ${phase.color}`}>
                <phase.icon className="h-3 w-3" />
                {project.status || 'No Status'}
              </div>
              <button
                onClick={() => {
                  setEditingProject(project.id);
                  setEditingStatus(project.status || '');
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-200 transition-all"
              >
                <Edit3 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
      <ExternalLink className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={onClick} />
    </div>
    
    <div className="space-y-2 text-sm">
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

// Simple placeholder for ProjectDetailPanel
const ProjectDetailPanel = ({ projectId, onClose }: { projectId: string; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-slate-900 rounded-xl p-6 max-w-md w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-100">Project Details</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-100">
          <X className="h-6 w-6" />
        </button>
      </div>
      <p className="text-slate-400">Project ID: {projectId}</p>
      <p className="text-sm text-slate-500 mt-2">Full project detail panel coming soon...</p>
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