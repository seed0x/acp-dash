'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { 
  Plus, Camera, CheckCircle2, Search, User, Building, MapPin, 
  DollarSign, Clock, TrendingUp, AlertCircle, CheckSquare,
  Calendar, ExternalLink, Star, Home,
  Hammer, Wrench, PaintBucket, FileText, CreditCard, Upload, X,
  Edit3, Save, Eye, MessageSquare, Trophy, 
  AlertTriangle, ChevronRight, Trash2, UserCheck,
  Target, CheckCheck, ClipboardList, Send, MoreVertical,
  ChevronDown, Activity, Package, Users, Hash
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
  subdivision?: string;
  jobNumber?: string;
  projectManager?: string;
  superintendent?: string;
  permitNumber?: string;
  startDate?: string;
  completionDate?: string;
};

type ProjectOption = { 
  id: string; 
  title: string;
  subdivision?: string;
};

type Issue = {
  id: string;
  title: string;
  status?: string;
  projectName?: string;
  projectId?: string;
  description?: string;
  priority?: string;
  createdDate?: string;
  assignee?: string;
};

type Task = {
  id: string;
  title: string;
  status?: string;
  completed?: boolean;
  assignee?: string;
  dueDate?: string;
  category?: string;
  projectId?: string;
};

type Comment = {
  id: string;
  text: string;
  author?: string;
  createdAt: string;
  projectId?: string;
};

type Photo = {
  id: string;
  url: string;
  description: string;
  date?: string;
};

type ProjectFull = {
  project: BoardItem & {
    budget?: number;
    spent?: number;
    phone?: string;
    email?: string;
    notes?: string;
  };
  tasks: Task[];
  issues: Issue[];
  photos: Photo[];
  comments: Comment[];
  expenses: any[];
};

// Pipeline phases configuration
const PIPELINE_PHASES = [
  { 
    key: 'bidding', 
    label: 'Bidding', 
    icon: Target, 
    statuses: ['bidding', 'proposal', 'quote sent', 'pending', 'new lead'],
    color: 'bg-yellow-500/20 border-yellow-500/30',
    iconColor: 'text-yellow-400'
  },
  { 
    key: 'post-beam', 
    label: 'Post & Beam', 
    icon: Hammer, 
    statuses: ['post & beam', 'foundation', 'rough-in', 'rough in', 'framing'],
    color: 'bg-blue-500/20 border-blue-500/30',
    iconColor: 'text-blue-400'
  },
  { 
    key: 'trim', 
    label: 'Trim', 
    icon: PaintBucket, 
    statuses: ['trim', 'finishing', 'final', 'fixtures'],
    color: 'bg-green-500/20 border-green-500/30',
    iconColor: 'text-green-400'
  },
  { 
    key: 'complete', 
    label: 'Complete', 
    icon: CheckCheck, 
    statuses: ['invoice ready', 'complete', 'done', 'closed'],
    color: 'bg-emerald-500/20 border-emerald-500/30',
    iconColor: 'text-emerald-400'
  }
];

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: 'Fetch error' }));
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

// Enhanced Project Detail Panel with full functionality
function ProjectDetailPanel({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [data, setData] = useState<ProjectFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [newComment, setNewComment] = useState('');
  const [newTask, setNewTask] = useState('');
  const [showNewTask, setShowNewTask] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/full`);
      const projectData = await res.json();
      setData(projectData);
    } catch (e) {
      console.error('Failed to load project:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, text: newComment })
      });
      setNewComment('');
      await loadProjectData();
    } catch (e) {
      console.error('Failed to add comment:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed })
      });
      await loadProjectData();
    } catch (e) {
      console.error('Failed to update task:', e);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.trim() || submitting) return;
    setSubmitting(true);
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: newTask })
      });
      setNewTask('');
      setShowNewTask(false);
      await loadProjectData();
    } catch (e) {
      console.error('Failed to add task:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssueStatusChange = async (issueId: string, newStatus: string) => {
    try {
      await fetch('/api/improvements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: issueId, status: newStatus })
      });
      await loadProjectData();
    } catch (e) {
      console.error('Failed to update issue:', e);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
        <div className="absolute right-0 top-0 h-full w-full max-w-4xl bg-slate-900 border-l border-slate-800 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-800 rounded w-1/3"></div>
            <div className="h-4 bg-slate-800 rounded w-1/2"></div>
            <div className="h-32 bg-slate-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { project, tasks, issues, photos, comments } = data;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="absolute right-0 top-0 h-full w-full max-w-4xl bg-slate-900 border-l border-slate-800 overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-800 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                {project.title}
                {project.subdivision && (
                  <span className="text-sm font-normal text-slate-400">• {project.subdivision}</span>
                )}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                {project.jobNumber && (
                  <span className="flex items-center gap-1 text-slate-300">
                    <Hash className="h-3 w-3" />
                    Job #{project.jobNumber}
                  </span>
                )}
                {project.client && (
                  <span className="flex items-center gap-1 text-slate-300">
                    <User className="h-3 w-3" />
                    {project.client}
                  </span>
                )}
                {project.status && (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    PIPELINE_PHASES.find(p => p.statuses.includes(project.status!.toLowerCase()))?.color || 'bg-slate-700'
                  }`}>
                    {project.status}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-2">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6 -mb-px overflow-x-auto">
            {[
              { key: 'overview', label: 'Overview', icon: FileText },
              { key: 'tasks', label: 'Tasks', count: tasks.length },
              { key: 'issues', label: 'Issues', count: issues.length },
              { key: 'photos', label: 'Photos', count: photos.length },
              { key: 'comments', label: 'Comments', count: comments.length }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'text-blue-400 border-blue-400'
                    : 'text-slate-400 border-transparent hover:text-white'
                }`}
              >
                {tab.icon && <tab.icon className="h-4 w-4" />}
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                    activeTab === tab.key ? 'bg-blue-500/20' : 'bg-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <InfoBlock label="Builder" value={project.builder} icon={Building} />
                <InfoBlock label="Project Manager" value={project.projectManager} icon={UserCheck} />
                <InfoBlock label="Superintendent" value={project.superintendent} icon={Users} />
                <InfoBlock label="Location" value={project.location} icon={MapPin} />
                <InfoBlock label="Permit #" value={project.permitNumber} icon={FileText} />
                <InfoBlock label="Start Date" value={project.startDate} icon={Calendar} />
                <InfoBlock label="Phone" value={project.phone} icon={MessageSquare} />
                <InfoBlock label="Email" value={project.email} icon={MessageSquare} />
              </div>
              
              {project.notes && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <h3 className="font-medium text-white mb-2">Notes</h3>
                  <p className="text-slate-300 whitespace-pre-wrap">{project.notes}</p>
                </div>
              )}

              <div className="bg-slate-800/50 rounded-lg p-4">
                <h3 className="font-medium text-white mb-3">Quick Stats</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-400">{tasks.filter(t => !t.completed).length}</p>
                    <p className="text-xs text-slate-400">Open Tasks</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-400">{issues.filter(i => i.status !== 'Done').length}</p>
                    <p className="text-xs text-slate-400">Open Issues</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-400">{photos.length}</p>
                    <p className="text-xs text-slate-400">Photos</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-white">Project Tasks</h3>
                <button
                  onClick={() => setShowNewTask(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Task
                </button>
              </div>

              {showNewTask && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
                  <input
                    type="text"
                    value={newTask}
                    onChange={e => setNewTask(e.target.value)}
                    placeholder="Enter task description..."
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddTask}
                      disabled={submitting || !newTask.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      Add Task
                    </button>
                    <button
                      onClick={() => { setShowNewTask(false); setNewTask(''); }}
                      className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {tasks.length > 0 ? (
                <div className="space-y-2">
                  {tasks.map(task => (
                    <div key={task.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 flex items-center gap-3">
                      <button
                        onClick={() => handleTaskToggle(task.id, task.completed || false)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          task.completed 
                            ? 'bg-green-600 border-green-600' 
                            : 'border-slate-500 hover:border-blue-400'
                        }`}
                      >
                        {task.completed && <CheckCheck className="h-3 w-3 text-white" />}
                      </button>
                      <div className="flex-1">
                        <p className={`text-white ${task.completed ? 'line-through opacity-50' : ''}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                          {task.assignee && <span>Assigned to: {task.assignee}</span>}
                          {task.dueDate && <span>Due: {task.dueDate}</span>}
                          {task.category && <span className="px-2 py-0.5 bg-slate-700 rounded">{task.category}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No tasks yet. Add one above!</p>
                </div>
              )}
            </div>
          )}

          {/* Issues Tab */}
          {activeTab === 'issues' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-white mb-4">Open Issues</h3>
              {issues.length > 0 ? (
                <div className="space-y-3">
                  {issues.map(issue => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      onStatusChange={handleIssueStatusChange}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No issues reported</p>
                </div>
              )}
            </div>
          )}

          {/* Photos Tab */}
          {activeTab === 'photos' && (
            <div className="space-y-4">
              {photos.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {photos.map(photo => (
                    <div key={photo.id} className="bg-slate-800/50 rounded-lg overflow-hidden">
                      <img src={photo.url} alt={photo.description} className="w-full h-48 object-cover" />
                      <div className="p-3">
                        <p className="text-sm text-white">{photo.description}</p>
                        {photo.date && <p className="text-xs text-slate-400 mt-1">{photo.date}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Camera className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No photos uploaded yet</p>
                </div>
              )}
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleAddComment()}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={submitting || !newComment.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {comments.length > 0 ? (
                <div className="space-y-3">
                  {comments.map(comment => (
                    <div key={comment.id} className="bg-slate-800/50 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-white">{comment.text}</p>
                          <p className="text-xs text-slate-400 mt-2">
                            {comment.author || 'Unknown'} • {comment.createdAt}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No comments yet. Start the conversation!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Issue Card Component
function IssueCard({ issue, onStatusChange }: { 
  issue: Issue; 
  onStatusChange: (id: string, status: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const statusColors: Record<string, string> = {
    'Open': 'bg-red-500/20 text-red-300',
    'In Progress': 'bg-yellow-500/20 text-yellow-300',
    'Done': 'bg-green-500/20 text-green-300'
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 
            className="font-medium text-white cursor-pointer hover:text-blue-400"
            onClick={() => setExpanded(!expanded)}
          >
            {issue.title}
          </h4>
          <div className="flex items-center gap-3 mt-2 text-xs">
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className={`px-2 py-1 rounded font-medium ${statusColors[issue.status || 'Open']}`}
              >
                {issue.status || 'Open'}
                <ChevronDown className="h-3 w-3 inline ml-1" />
              </button>
              {showStatusMenu && (
                <div className="absolute top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-10">
                  {['Open', 'In Progress', 'Done'].map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        onStatusChange(issue.id, status);
                        setShowStatusMenu(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {issue.priority && (
              <span className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded">
                {issue.priority}
              </span>
            )}
            {issue.assignee && <span className="text-slate-400">Assigned: {issue.assignee}</span>}
          </div>
        </div>
      </div>
      
      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          {issue.description && (
            <p className="text-sm text-slate-300 mb-2">{issue.description}</p>
          )}
          <p className="text-xs text-slate-400">
            Created: {issue.createdDate || 'Unknown'}
          </p>
        </div>
      )}
    </div>
  );
}

// Info Block Component
function InfoBlock({ label, value, icon: Icon }: { 
  label: string; 
  value?: string; 
  icon: React.ElementType;
}) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3">
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="text-sm text-white font-medium">{value || '-'}</p>
    </div>
  );
}

// Main Dashboard Component
function DashboardComponent({ initialKpis, initialPendingAcct }: { 
  initialKpis: KPI, 
  initialPendingAcct: ProjectRow[] 
}) {
  const [viewingProjectId, setViewingProjectId] = useState<string | null>(null);
  const [kpis, setKpis] = useState(initialKpis);
  const [pendingAcct, setPendingAcct] = useState(initialPendingAcct);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [searchInput, setSearchInput] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [boardItems, setBoardItems] = useState<BoardItem[]>([]);
  const [boardLoading, setBoardLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  
  // Quick action states
  const [selectedProject, setSelectedProject] = useState<ProjectOption | null>(null);
  const [projectSearch, setProjectSearch] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [upgradeTitle, setUpgradeTitle] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);

  // Filter projects for searchable dropdown
  const filteredProjects = useMemo(() => {
    if (!projectSearch) return projects;
    const term = projectSearch.toLowerCase();
    return projects.filter(p => 
      p.title.toLowerCase().includes(term) || 
      (p.subdivision || '').toLowerCase().includes(term)
    );
  }, [projects, projectSearch]);

  useEffect(() => {
    loadData();
    loadBoard();
  }, []);

  const loadData = async () => {
    try {
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
    } catch (e: any) {
      setError(`Failed to load data: ${e.message}`);
    }
  };

  const loadBoard = async () => {
    setBoardLoading(true);
    try {
      const data = await fetchJSON<{ items: BoardItem[] }>('/api/projects/board');
      setBoardItems(data.items || []);
    } catch (e: any) {
      setError(`Failed to load projects: ${e.message}`);
    } finally {
      setBoardLoading(false);
    }
  };

  const handleQuickAction = async (type: 'photo' | 'issue') => {
    if (!selectedProject) {
      setError('Please select a project first');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (type === 'photo' && photoFile) {
        const formData = new FormData();
        formData.append('file', photoFile);
        formData.append('projectId', selectedProject.id);
        formData.append('description', `Photo from ${new Date().toLocaleDateString()}`);
        
        const response = await fetch('/api/photos', { 
          method: 'POST', 
          body: formData 
        });
        
        if (!response.ok) throw new Error('Failed to upload photo');
        
        setPhotoFile(null);
        setSuccessMessage(`Photo uploaded to ${selectedProject.title}`);
        
      } else if (type === 'issue' && upgradeTitle.trim()) {
        const response = await fetch('/api/improvements', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ 
            projectId: selectedProject.id, 
            title: upgradeTitle.trim()
          }) 
        });
        
        if (!response.ok) throw new Error('Failed to add issue');
        
        setUpgradeTitle('');
        setSuccessMessage(`Issue added to ${selectedProject.title}`);
        await loadData();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group projects by phase
  const groupedProjects = useMemo(() => {
    let filtered = boardItems;
    
    if (searchInput) {
      const query = searchInput.toLowerCase();
      filtered = filtered.filter(item =>
        [item.title, item.client, item.builder, item.location, item.subdivision].some(v => 
          (v || '').toLowerCase().includes(query)
        )
      );
    }
    
    if (selectedPhase !== 'all') {
      filtered = filtered.filter(item => getProjectPhase(item.status) === selectedPhase);
    }
    
    return PIPELINE_PHASES.reduce((acc, phase) => {
      acc[phase.key] = filtered.filter(item => getProjectPhase(item.status) === phase.key);
      return acc;
    }, {} as Record<string, BoardItem[]>);
  }, [boardItems, searchInput, selectedPhase]);

  return (
    <div className="min-h-screen bg-slate-950">
      {viewingProjectId && (
        <ProjectDetailPanel 
          projectId={viewingProjectId} 
          onClose={() => setViewingProjectId(null)} 
        />
      )}

      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard icon={Target} label="Active Bids" value={kpis.activeBids} color="text-yellow-400" />
            <KPICard icon={Hammer} label="Post & Beam" value={kpis.postAndBeam} color="text-blue-400" />
            <KPICard icon={ClipboardList} label="Setup Needed" value={kpis.jobAccountsPending} color="text-orange-400" />
            <KPICard icon={AlertTriangle} label="Open Issues" value={kpis.openProblems} color="text-red-400" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Search lots, subdivisions, clients..."
                  className="w-full pl-12 pr-4 py-3 bg-transparent text-white placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Phase Tabs */}
            <div className="flex gap-2 overflow-x-auto">
              <button
                onClick={() => setSelectedPhase('all')}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
                  selectedPhase === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                All ({boardItems.length})
              </button>
              {PIPELINE_PHASES.map(phase => (
                <button
                  key={phase.key}
                  onClick={() => setSelectedPhase(phase.key)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap flex items-center gap-2 ${
                    selectedPhase === phase.key ? phase.color : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  <phase.icon className="h-4 w-4" />
                  {phase.label} ({groupedProjects[phase.key]?.length || 0})
                </button>
              ))}
            </div>

            {/* Projects */}
            {boardLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-slate-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {selectedPhase === 'all' ? (
                  PIPELINE_PHASES.map(phase => {
                    const phaseProjects = groupedProjects[phase.key];
                    if (!phaseProjects || phaseProjects.length === 0) return null;
                    
                    return (
                      <div key={phase.key} className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
                        <div className={`p-4 ${phase.color.split(' ')[0]} border-b border-slate-800`}>
                          <h2 className="font-semibold text-white flex items-center gap-2">
                            <phase.icon className="h-5 w-5" />
                            {phase.label} ({phaseProjects.length})
                          </h2>
                        </div>
                        <div className="p-4 space-y-3">
                          {phaseProjects.map(project => (
                            <ProjectCard
                              key={project.id}
                              project={project}
                              onClick={() => setViewingProjectId(project.id)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="space-y-3">
                    {groupedProjects[selectedPhase]?.map(project => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onClick={() => setViewingProjectId(project.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
              
              {/* Project Search */}
              <div className="relative mb-4">
                <input
                  type="text"
                  value={projectSearch}
                  onChange={e => {
                    setProjectSearch(e.target.value);
                    setShowProjectDropdown(true);
                  }}
                  onFocus={() => setShowProjectDropdown(true)}
                  placeholder="Search lot or subdivision..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400"
                />
                {showProjectDropdown && filteredProjects.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredProjects.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedProject(p);
                          setProjectSearch(`${p.title}${p.subdivision ? ` - ${p.subdivision}` : ''}`);
                          setShowProjectDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left text-white hover:bg-slate-800"
                      >
                        <div className="font-medium">{p.title}</div>
                        {p.subdivision && <div className="text-xs text-slate-400">{p.subdivision}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Photo Upload */}
              <div className="space-y-3 mb-4">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={e => setPhotoFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white"
                />
                <button 
                  onClick={() => handleQuickAction('photo')} 
                  disabled={isSubmitting || !photoFile || !selectedProject}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium"
                >
                  Upload Photo
                </button>
              </div>

              {/* Add Issue */}
              <div className="space-y-3">
                <input 
                  value={upgradeTitle} 
                  onChange={e => setUpgradeTitle(e.target.value)} 
                  placeholder="Issue description..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400"
                />
                <button 
                  onClick={() => handleQuickAction('issue')} 
                  disabled={isSubmitting || !upgradeTitle.trim() || !selectedProject}
                  className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium"
                >
                  Add Issue
                </button>
              </div>
            </div>

            {/* Open Issues */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
              <div className="p-4 bg-red-500/10 border-b border-slate-800">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  Open Issues ({issues.length})
                </h3>
              </div>
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {issues.map(issue => (
                  <div 
                    key={issue.id} 
                    className="bg-slate-800/50 rounded-lg p-3 cursor-pointer hover:bg-slate-800/70"
                    onClick={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{issue.title}</p>
                        <p className="text-xs text-slate-400 mt-1">{issue.projectName}</p>
                        {expandedIssue === issue.id && issue.description && (
                          <p className="text-xs text-slate-300 mt-2">{issue.description}</p>
                        )}
                      </div>
                      <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${
                        expandedIssue === issue.id ? 'rotate-180' : ''
                      }`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Job Accounts */}
            {pendingAcct.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
                <div className="p-4 bg-orange-500/10 border-b border-slate-800">
                  <h3 className="font-semibold text-white">QB Setup Needed</h3>
                </div>
                <div className="p-4 space-y-2">
                  {pendingAcct.map(acct => (
                    <div key={acct.id} className="text-sm text-slate-300">
                      {acct.title}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      {(error || successMessage) && (
        <div className="fixed bottom-4 right-4 max-w-sm">
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg mb-2">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="bg-green-500/20 border border-green-500 text-green-300 p-4 rounded-lg">
              {successMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Components
const KPICard = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-slate-800/50 rounded-lg p-3">
    <div className="flex items-center justify-between">
      <Icon className={`h-5 w-5 ${color}`} />
      <span className="text-2xl font-bold text-white">{value}</span>
    </div>
    <p className="text-xs text-slate-400 mt-1">{label}</p>
  </div>
);

const ProjectCard = ({ project, onClick }: { project: BoardItem; onClick: () => void }) => (
  <div 
    className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:bg-slate-800/70 cursor-pointer"
    onClick={onClick}
  >
    <div className="flex items-start justify-between">
      <div>
        <h3 className="font-medium text-white">
          {project.title}
          {project.subdivision && <span className="text-slate-400 text-sm ml-2">• {project.subdivision}</span>}
        </h3>
        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
          {project.client && <span>{project.client}</span>}
          {project.builder && <span>{project.builder}</span>}
        </div>
      </div>
      <ExternalLink className="h-4 w-4 text-slate-400" />
    </div>
  </div>
);

export default function OperationsDashboard(props: { 
  initialKpis: KPI; 
  initialPendingAcct: ProjectRow[]; 
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    }>
      <DashboardComponent {...props} />
    </Suspense>
  );
}