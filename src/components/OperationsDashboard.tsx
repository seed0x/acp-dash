'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Camera, CheckCircle2, Search, User, Building, MapPin, 
  DollarSign, Clock, TrendingUp, AlertCircle, CheckSquare,
  Filter, Calendar, Phone, Mail, ExternalLink, Star,
  Hammer, Wrench, PaintBucket, FileText, CreditCard, Upload, X,
  Edit3, Save, RotateCcw, Eye, MessageSquare, PhoneCall, Trophy, 
  AlertTriangle, ChevronRight, Info, Trash2, ArrowRight, UserCheck,
  Target, FileCheck, CheckCheck, ClipboardList, Home
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

type Issue = {
  id: string;
  title: string;
  status?: string;
  projectName?: string;
};

// Bidding statuses for tracking
const BIDDING_STATUSES = [
  { key: 'new', label: 'New Lead', color: 'bg-blue-500/20 text-blue-300' },
  { key: 'contacted', label: 'Contacted', color: 'bg-purple-500/20 text-purple-300' },
  { key: 'quoted', label: 'Quote Sent', color: 'bg-yellow-500/20 text-yellow-300' },
  { key: 'follow-up', label: 'Follow Up', color: 'bg-orange-500/20 text-orange-300' },
  { key: 'won', label: 'Won', color: 'bg-green-500/20 text-green-300' },
  { key: 'lost', label: 'Lost', color: 'bg-red-500/20 text-red-300' },
];

// Pipeline phases configuration
const PIPELINE_PHASES = [
  { 
    key: 'bidding', 
    label: 'Bidding / Leads', 
    icon: Target, 
    statuses: ['bidding', 'proposal', 'quote sent', 'pending', 'new lead'],
    color: 'from-yellow-600 to-orange-600',
    bgColor: 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10',
    borderColor: 'border-yellow-500/30',
    iconColor: 'text-yellow-400',
    description: 'Active quotes and proposals'
  },
  { 
    key: 'post-beam', 
    label: 'Post & Beam / Rough', 
    icon: Hammer, 
    statuses: ['post & beam', 'foundation', 'rough-in', 'rough in', 'framing'],
    color: 'from-blue-600 to-indigo-600',
    bgColor: 'bg-gradient-to-br from-blue-500/10 to-indigo-500/10',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    description: 'Foundation and rough plumbing'
  },
  { 
    key: 'top-out', 
    label: 'Top Out', 
    icon: TrendingUp, 
    statuses: ['top out', 'topping out', 'structure complete'],
    color: 'from-purple-600 to-pink-600',
    bgColor: 'bg-gradient-to-br from-purple-500/10 to-pink-500/10',
    borderColor: 'border-purple-500/30',
    iconColor: 'text-purple-400',
    description: 'Structure completion phase'
  },
  { 
    key: 'trim', 
    label: 'Trim / Finish', 
    icon: PaintBucket, 
    statuses: ['trim', 'finishing', 'final', 'fixtures'],
    color: 'from-green-600 to-teal-600',
    bgColor: 'bg-gradient-to-br from-green-500/10 to-teal-500/10',
    borderColor: 'border-green-500/30',
    iconColor: 'text-green-400',
    description: 'Final fixtures and trim work'
  },
  { 
    key: 'invoice-ready', 
    label: 'Complete / Invoice', 
    icon: CheckCheck, 
    statuses: ['invoice ready', 'complete', 'ready to bill', 'billing', 'completed', 'done'],
    color: 'from-emerald-600 to-cyan-600',
    bgColor: 'bg-gradient-to-br from-emerald-500/10 to-cyan-500/10',
    borderColor: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    description: 'Ready for final billing'
  }
];

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

// Mock functions for demo
async function fetchJSON<T>(url: string): Promise<T> {
  // Simulated API responses
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (url.includes('/api/dashboard/summary')) {
    return { kpis: { postAndBeam: 12, activeBids: 5, jobAccountsPending: 3, openProblems: 8 } } as T;
  }
  
  if (url.includes('/api/projects/job-account')) {
    return { rows: [
      { id: '1', title: 'Apple Ln', client: 'John Smith' },
      { id: '2', title: '123 Main St', client: 'Jane Doe' }
    ] } as T;
  }
  
  if (url.includes('/api/projects/list')) {
    return { rows: [
      { id: '1', title: 'Apple Ln' },
      { id: '2', title: '123 Main St' },
      { id: '3', title: 'Oak Grove' },
      { id: '4', title: 'Pine Ridge' }
    ] } as T;
  }
  
  if (url.includes('/api/improvements')) {
    return { rows: [
      { id: '1', title: 'Bathroom leak needs repair', status: 'Open', projectName: 'Apple Ln' },
      { id: '2', title: 'Kitchen sink installation delayed', status: 'In Progress', projectName: '123 Main St' },
      { id: '3', title: 'Missing shut-off valve', status: 'Open', projectName: 'Oak Grove' }
    ] } as T;
  }
  
  if (url.includes('/api/projects/board')) {
    return { 
      items: [
        { id: '1', title: 'Apple Ln', status: 'Bidding', client: 'John Smith', location: '123 Apple Ln, Portland', builder: 'ABC Construction' },
        { id: '2', title: 'Dollars Corner & Gas Store', status: 'Bidding', client: 'Gas Station LLC', location: 'Dollars Corner', builder: 'XYZ Builders' },
        { id: '3', title: 'Untitled', status: 'Bidding', client: undefined, location: undefined, builder: undefined },
        { id: '4', title: 'Upcoming', status: 'Bidding', client: 'Future Client', location: 'TBD', builder: 'TBD' },
        { id: '5', title: '123 Main St', status: 'Post & Beam', client: 'Jane Doe', location: '123 Main St', builder: 'Main Builders' },
        { id: '6', title: 'Oak Grove', status: 'Trim', client: 'Oak Family', location: 'Oak Grove Rd', builder: 'Grove Construction' },
        { id: '7', title: 'Pine Ridge', status: 'Complete', client: 'Pine LLC', location: 'Pine Ridge Dr', builder: 'Ridge Builders' }
      ],
      statusOptions: ['Bidding', 'Post & Beam', 'Top Out', 'Trim', 'Complete']
    } as T;
  }
  
  return {} as T;
}

export default function OperationsDashboard() {
  const [viewingProjectId, setViewingProjectId] = useState<string | null>(null);
  const [kpis, setKpis] = useState<KPI>({ postAndBeam: 0, activeBids: 0, jobAccountsPending: 0, openProblems: 0 });
  const [pendingAcct, setPendingAcct] = useState<ProjectRow[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [searchInput, setSearchInput] = useState('');
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
  
  // Bidding status tracking
  const [biddingStatuses, setBiddingStatuses] = useState<Record<string, string>>({});
  const [showBiddingPanel, setShowBiddingPanel] = useState(false);
  const [editingBidStatus, setEditingBidStatus] = useState<string | null>(null);
  
  // Show issues panel
  const [showIssuesPanel, setShowIssuesPanel] = useState(false);

  useEffect(() => {
    loadData();
    loadBoard();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      const [summary, acct, projectsList, improvementsData] = await Promise.all([
        fetchJSON<{ kpis: KPI }>('/api/dashboard/summary'),
        fetchJSON<{ rows: ProjectRow[] }>('/api/projects/job-account'),
        fetchJSON<{ rows: ProjectOption[] }>('/api/projects/list'),
        fetchJSON<{ rows: Issue[] }>('/api/improvements?openOnly=true'),
      ]);
      setKpis(summary.kpis);
      setPendingAcct(acct.rows);
      setProjects(projectsList.rows);
      setIssues(improvementsData.rows);
      if (projectsList.rows.length > 0 && !actionProjectId) {
        setActionProjectId(projectsList.rows[0].id);
      }
    } catch (e: any) {
      setError(`Failed to load data: ${e.message}`);
    }
  };

  const loadBoard = async () => {
    setBoardLoading(true);
    try {
      const data = await fetchJSON<{ items: BoardItem[]; statusOptions: string[] }>('/api/projects/board');
      setBoardItems(data.items || []);
      
      // Initialize bidding statuses
      const statuses: Record<string, string> = {};
      data.items.filter(item => getProjectPhase(item.status) === 'bidding').forEach(item => {
        statuses[item.id] = 'new';
      });
      setBiddingStatuses(statuses);
    } catch (e: any) {
      setError(`Failed to load projects: ${e.message}`);
    } finally {
      setBoardLoading(false);
    }
  };

  const handleQuickAction = async (type: 'photo' | 'upgrade') => {
    if (!actionProjectId) {
      setError('Please select a project first');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (type === 'photo' && photoFile) {
        setPhotoFile(null);
        setPhotoDescription('');
        const projectName = projects.find(p => p.id === actionProjectId)?.title;
        setSuccessMessage(`Photo uploaded to ${projectName} with today's date`);
      } else if (type === 'upgrade' && upgradeTitle.trim()) {
        setUpgradeTitle('');
        const projectName = projects.find(p => p.id === actionProjectId)?.title;
        setSuccessMessage(`Issue added to ${projectName}`);
        await loadData(); // Reload issues
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBiddingStatusUpdate = (projectId: string, newStatus: string) => {
    setBiddingStatuses(prev => ({
      ...prev,
      [projectId]: newStatus
    }));
    setEditingBidStatus(null);
    setSuccessMessage('Bidding status updated');
  };

  const handleIssueComplete = async (issueId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setIssues(prev => prev.filter(i => i.id !== issueId));
      setSuccessMessage('Issue marked as complete');
      await loadData();
    } catch (e: any) {
      setError('Failed to complete issue');
    }
  };

  // Filter projects based on search
  const filteredItems = useMemo(() => {
    let items = boardItems;
    
    if (searchInput.trim()) {
      const query = searchInput.toLowerCase();
      items = items.filter(item =>
        [item.title, item.client, item.location, item.builder].some(v => 
          (v || '').toLowerCase().includes(query)
        )
      );
    }
    
    if (selectedPhase !== 'all') {
      items = items.filter(item => getProjectPhase(item.status) === selectedPhase);
    }
    
    return items;
  }, [boardItems, searchInput, selectedPhase]);

  // Group projects by phase
  const groupedProjects = useMemo(() => {
    const groups = PIPELINE_PHASES.reduce((acc, phase) => {
      acc[phase.key] = filteredItems.filter(item => getProjectPhase(item.status) === phase.key);
      return acc;
    }, {} as Record<string, BoardItem[]>);
    return groups;
  }, [filteredItems]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header KPIs */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard 
              icon={Target} 
              label="Active Bids" 
              value={kpis.activeBids} 
              trend="+12%" 
              color="text-yellow-400"
            />
            <KPICard 
              icon={Hammer} 
              label="Post & Beam" 
              value={kpis.postAndBeam} 
              trend="+5%" 
              color="text-blue-400"
            />
            <KPICard 
              icon={ClipboardList} 
              label="Job Setup Needed" 
              value={kpis.jobAccountsPending} 
              trend="-2" 
              color="text-orange-400"
              subtitle="Accounts to create"
              onClick={() => document.getElementById('job-accounts-section')?.scrollIntoView({ behavior: 'smooth' })}
            />
            <KPICard 
              icon={AlertTriangle} 
              label="Open Issues" 
              value={kpis.openProblems} 
              trend="-8%" 
              color="text-red-400"
              onClick={() => setShowIssuesPanel(true)}
            />
          </div>
        </div>
      </div>

      {/* Mobile Quick Actions - At Top */}
      <div className="lg:hidden bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700">
        <div className="p-4 space-y-4">
          {/* Photo Upload */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Camera className="h-5 w-5 text-blue-400" />
              <h3 className="font-semibold text-white">Quick Photo</h3>
            </div>
            <div className="space-y-3">
              <select 
                value={actionProjectId} 
                onChange={e => setActionProjectId(e.target.value)} 
                className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value="">Select lot...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                onChange={e => setPhotoFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white"
              />
              <button 
                onClick={() => handleQuickAction('photo')} 
                disabled={isSubmitting || !photoFile || !actionProjectId}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload Photo (Auto-dated)
              </button>
            </div>
          </div>
          
          {/* Add Issue */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              <h3 className="font-semibold text-white">Report Issue</h3>
            </div>
            <div className="space-y-3">
              <input 
                value={upgradeTitle} 
                onChange={e => setUpgradeTitle(e.target.value)} 
                placeholder="Describe the issue..."
                className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400"
              />
              <button 
                onClick={() => handleQuickAction('upgrade')} 
                disabled={isSubmitting || !upgradeTitle.trim() || !actionProjectId}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 text-white py-2.5 rounded-lg font-medium"
              >
                Add Issue
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {(error || successMessage) && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {successMessage && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-lg flex items-center justify-between">
              <span>{successMessage}</span>
              <button onClick={() => setSuccessMessage(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Enhanced Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur opacity-20"></div>
            <div className="relative bg-slate-800/80 backdrop-blur-xl border border-slate-700 rounded-xl p-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Search projects, clients, builders, locations..."
                  className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-slate-400 focus:outline-none"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Phase Tabs */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setSelectedPhase('all')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                selectedPhase === 'all'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All Projects ({boardItems.length})
            </button>
            {PIPELINE_PHASES.map(phase => {
              const count = groupedProjects[phase.key]?.length || 0;
              return (
                <button
                  key={phase.key}
                  onClick={() => setSelectedPhase(phase.key)}
                  className={`px-5 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                    selectedPhase === phase.key
                      ? `bg-gradient-to-r ${phase.color} text-white shadow-lg`
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <phase.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{phase.label}</span>
                  <span className="sm:hidden">{phase.label.split(' ')[0]}</span>
                  ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Projects Area */}
          <div className="xl:col-span-3">
            {boardLoading ? (
              <div className="grid gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-32 bg-slate-800/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800">
                <Building className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Projects Found</h3>
                <p className="text-slate-400">
                  {searchInput ? `No results for "${searchInput}"` : 'No projects yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {selectedPhase === 'all' ? (
                  PIPELINE_PHASES.map(phase => {
                    const projects = groupedProjects[phase.key];
                    if (!projects || projects.length === 0) return null;
                    
                    return (
                      <div key={phase.key} className={`${phase.bgColor} border ${phase.borderColor} rounded-2xl overflow-hidden`}>
                        <div className={`p-6 bg-gradient-to-r ${phase.color} bg-opacity-10`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-3 bg-white/10 rounded-xl">
                                <phase.icon className={`h-6 w-6 ${phase.iconColor}`} />
                              </div>
                              <div>
                                <h2 className="text-xl font-semibold text-white">
                                  {phase.label}
                                </h2>
                                <p className="text-sm text-slate-300">{phase.description}</p>
                              </div>
                            </div>
                            <span className="text-2xl font-bold text-white">{projects.length}</span>
                          </div>
                        </div>
                        <div className="p-6">
                          <div className="grid gap-4">
                            {projects.map(project => (
                              <ProjectCard
                                key={project.id}
                                project={project}
                                phase={phase}
                                biddingStatus={biddingStatuses[project.id]}
                                onBiddingStatusUpdate={handleBiddingStatusUpdate}
                                editingBidStatus={editingBidStatus}
                                setEditingBidStatus={setEditingBidStatus}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div>
                    {filteredItems.length > 0 ? (
                      <div className="grid gap-4">
                        {filteredItems.map(project => {
                          const phase = PIPELINE_PHASES.find(p => p.key === getProjectPhase(project.status))!;
                          return (
                            <ProjectCard
                              key={project.id}
                              project={project}
                              phase={phase}
                              biddingStatus={biddingStatuses[project.id]}
                              onBiddingStatusUpdate={handleBiddingStatusUpdate}
                              editingBidStatus={editingBidStatus}
                              setEditingBidStatus={setEditingBidStatus}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <CheckCircle2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-400">No projects in this phase</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Open Issues Panel */}
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl overflow-hidden">
              <div 
                className="p-4 bg-gradient-to-r from-red-600/20 to-orange-600/20 cursor-pointer hover:bg-red-600/30 transition-colors"
                onClick={() => setShowIssuesPanel(!showIssuesPanel)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    <h3 className="font-semibold text-white">Open Issues</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-red-500/30 text-red-300 px-2 py-1 rounded-full text-sm font-bold">
                      {issues.length}
                    </span>
                    <ChevronRight className={`h-4 w-4 text-red-400 transition-transform ${showIssuesPanel ? 'rotate-90' : ''}`} />
                  </div>
                </div>
              </div>
              {showIssuesPanel && (
                <div className="p-4 max-h-96 overflow-y-auto">
                  {issues.length > 0 ? (
                    <div className="space-y-3">
                      {issues.map(issue => (
                        <div key={issue.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">{issue.title}</p>
                              <p className="text-xs text-slate-400 mt-1">{issue.projectName}</p>
                              <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
                                issue.status === 'Open' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'
                              }`}>
                                {issue.status}
                              </span>
                            </div>
                            <button
                              onClick={() => handleIssueComplete(issue.id)}
                              className="p-1.5 text-green-400 hover:bg-green-500/20 rounded transition-colors"
                              title="Mark as complete"
                            >
                              <CheckCheck className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-3" />
                      <p className="text-sm text-slate-400">No open issues!</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Job Account Setup Panel */}
            <div id="job-accounts-section" className="bg-orange-900/20 border border-orange-500/30 rounded-xl overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-orange-600/20 to-yellow-600/20">
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-5 w-5 text-orange-400" />
                  <div>
                    <h3 className="font-semibold text-white">Job Account Setup</h3>
                    <p className="text-xs text-orange-300">Projects needing QuickBooks setup</p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                {pendingAcct.length > 0 ? (
                  <div className="space-y-3">
                    {pendingAcct.map(acct => (
                      <div key={acct.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                        <p className="font-medium text-white text-sm">{acct.title}</p>
                        <p className="text-xs text-slate-400 mb-2">{acct.client || 'No client'}</p>
                        <button className="w-full bg-orange-600 hover:bg-orange-700 text-white py-1.5 rounded text-sm font-medium">
                          Setup Account
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">All accounts setup!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Quick Actions */}
            <div className="hidden lg:block bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Camera className="h-5 w-5 text-blue-400" />
                Quick Actions
              </h3>
              <select 
                value={actionProjectId} 
                onChange={e => setActionProjectId(e.target.value)} 
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                <option value="">Select project...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              <input 
                type="file" 
                accept="image/*" 
                onChange={e => setPhotoFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white"
              />
              <button 
                onClick={() => handleQuickAction('photo')} 
                disabled={isSubmitting || !photoFile || !actionProjectId}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white py-2 rounded-lg font-medium"
              >
                Upload Photo
              </button>
              <input 
                value={upgradeTitle} 
                onChange={e => setUpgradeTitle(e.target.value)} 
                placeholder="Issue description..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400"
              />
              <button 
                onClick={() => handleQuickAction('upgrade')} 
                disabled={isSubmitting || !upgradeTitle.trim() || !actionProjectId}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 text-white py-2 rounded-lg font-medium"
              >
                Add Issue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component for KPI Cards
const KPICard = ({ icon: Icon, label, value, trend, color, subtitle, onClick }: {
  icon: React.ElementType;
  label: string;
  value: number;
  trend: string;
  color: string;
  subtitle?: string;
  onClick?: () => void;
}) => (
  <div 
    className={`bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all ${onClick ? 'cursor-pointer hover:bg-slate-800/50' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-center justify-between">
      <div className={`p-2 rounded-lg bg-slate-800 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <span className={`text-xs font-medium ${trend.startsWith('+') ? 'text-green-400' : trend.startsWith('-') && !trend.includes('%') ? 'text-red-400' : 'text-slate-400'}`}>
        {trend}
      </span>
    </div>
    <div className="mt-3">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  </div>
);

// Enhanced Project Card
const ProjectCard = ({ project, phase, biddingStatus, onBiddingStatusUpdate, editingBidStatus, setEditingBidStatus }: {
  project: BoardItem;
  phase: typeof PIPELINE_PHASES[0];
  biddingStatus?: string;
  onBiddingStatusUpdate: (id: string, status: string) => void;
  editingBidStatus: string | null;
  setEditingBidStatus: (id: string | null) => void;
}) => {
  const isBidding = phase.key === 'bidding';
  
  return (
    <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-white text-lg mb-1">{project.title}</h3>
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium ${phase.bgColor} ${phase.borderColor} border`}>
              <phase.icon className="h-3 w-3" />
              {project.status || 'No Status'}
            </span>
            {isBidding && biddingStatus && (
              <div className="flex items-center gap-2">
                {editingBidStatus === project.id ? (
                  <select
                    value={biddingStatus}
                    onChange={e => {
                      onBiddingStatusUpdate(project.id, e.target.value);
                    }}
                    className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white"
                  >
                    {BIDDING_STATUSES.map(status => (
                      <option key={status.key} value={status.key}>{status.label}</option>
                    ))}
                  </select>
                ) : (
                  <button
                    onClick={() => setEditingBidStatus(project.id)}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      BIDDING_STATUSES.find(s => s.key === biddingStatus)?.color || ''
                    } hover:opacity-80 transition-opacity`}
                  >
                    {BIDDING_STATUSES.find(s => s.key === biddingStatus)?.label || 'Unknown'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <ExternalLink className="h-4 w-4 text-slate-400 hover:text-white cursor-pointer" />
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
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
          <div className="flex items-center gap-2 text-slate-300 col-span-2">
            <MapPin className="h-3 w-3 text-slate-400" />
            <span className="truncate">{project.location}</span>
          </div>
        )}
      </div>
    </div>
  );
};