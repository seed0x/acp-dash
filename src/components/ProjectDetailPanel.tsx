'use client';

import { useState, useEffect } from 'react';
import { 
  X, Building, User, MapPin, DollarSign, Clock, CheckSquare, 
  Wrench, Camera, Calendar, Star, ExternalLink, Download,
  TrendingUp, AlertTriangle, CheckCircle, FileText, Phone
} from 'lucide-react';

// Type definitions
type Photo = { 
  id: string; 
  description: string; 
  url: string; 
};

type ProjectFull = {
  project: { 
    id: string; 
    title: string; 
    client?: string; 
    location?: string; 
    builder?: string; 
    status?: string; 
    budget?: number; 
    spent?: number; 
    totalExpenses?: number; 
    totalHours?: number; 
    openTasks?: number; 
    openImprovements?: number; 
  };
  improvements: Array<{ id: string; title: string; status?: string }>;
  tasks: Array<{ id: string; title: string; status?: string; assignee?: string; due?: string }>;
  expenses: Array<{ id: string; name: string; category?: string; value?: number }>;
  time: Array<{ id: string; name: string; person?: string; date?: string; hours?: number }>;
  photos: Array<Photo>;
};

function fmtMoney(n?: number | null) {
  if (n == null) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function getStatusColor(status?: string) {
  if (!status) return 'bg-gray-500/20 text-gray-300';
  const s = status.toLowerCase();
  if (s.includes('complete') || s.includes('done')) return 'bg-green-500/20 text-green-300';
  if (s.includes('progress') || s.includes('active')) return 'bg-blue-500/20 text-blue-300';
  if (s.includes('pending') || s.includes('review')) return 'bg-yellow-500/20 text-yellow-300';
  if (s.includes('blocked') || s.includes('issue')) return 'bg-red-500/20 text-red-300';
  return 'bg-purple-500/20 text-purple-300';
}

const TABS = [
  { key: 'photos', label: 'Photos', icon: Camera },
  { key: 'overview', label: 'Overview', icon: FileText },
  { key: 'finances', label: 'Finances', icon: DollarSign },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare },
  { key: 'improvements', label: 'Issues', icon: Wrench },
  { key: 'time', label: 'Time', icon: Clock },
];

export default function ProjectDetailPanel({ projectId, onClose }: { 
  projectId: string; 
  onClose: () => void; 
}) {
  const [data, setData] = useState<ProjectFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('photos');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const res = await fetch(`/api/projects/${projectId}/full`);
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch project details');
        setData(await res.json());
      } catch (e: any) { 
        setError(e.message);
      } finally { 
        setLoading(false);
      }
    }
    fetchData();
  }, [projectId]);

  const { project, expenses, tasks, improvements, time, photos } = data || {};

  return (
    <div className="fixed inset-0 z-30">
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
                  <h1 className="text-2xl font-bold text-slate-100 mb-2">{project?.title}</h1>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    {project?.client && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <User className="h-4 w-4 text-slate-400" />
                        <span>{project.client}</span>
                      </div>
                    )}
                    {project?.status && (
                      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                        <CheckCircle className="h-3 w-3" />
                        {project.status}
                      </div>
                    )}
                    {project?.location && (
                      <a 
                        href={`http://maps.apple.com/?q=${encodeURIComponent(project.location)}`}
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
                {TABS.map(tab => (
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
                    {tab.key === 'tasks' && tasks && (
                      <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full">
                        {tasks.length}
                      </span>
                    )}
                    {tab.key === 'improvements' && improvements && (
                      <span className="bg-red-500/20 text-red-300 text-xs px-2 py-0.5 rounded-full">
                        {improvements.length}
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
                <AlertTriangle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            )}
            
            {data && (
              <div>
                {activeTab === 'photos' && <PhotosTab items={photos!} />}
                {activeTab === 'overview' && project && <OverviewTab project={project} />}
                {activeTab === 'finances' && <FinancesTab project={project!} expenses={expenses!} />}
                {activeTab === 'tasks' && <TasksTab items={tasks!} />}
                {activeTab === 'improvements' && <ImprovementsTab items={improvements!} />}
                {activeTab === 'time' && <TimeTab items={time!} />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const InfoCard = ({ icon: Icon, title, children, action }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-700 rounded-lg">
          <Icon className="h-5 w-5 text-slate-300" />
        </div>
        <h3 className="font-semibold text-slate-100">{title}</h3>
      </div>
      {action}
    </div>
    {children}
  </div>
);

const StatItem = ({ icon: Icon, label, value, href, trend }: {
  icon: React.ElementType;
  label: string;
  value?: string | number;
  href?: string;
  trend?: string;
}) => (
  <div className="flex items-start gap-3 p-4 bg-slate-800/30 rounded-lg">
    <Icon className="h-5 w-5 text-slate-400 mt-0.5" />
    <div className="flex-1">
      <p className="text-sm text-slate-400">{label}</p>
      {href ? (
        <a 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="font-semibold text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
        >
          {value}
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <div className="flex items-center gap-2">
          <p className="font-semibold text-slate-100">{value || '-'}</p>
          {trend && (
            <span className={`text-xs px-2 py-1 rounded-full ${
              trend.startsWith('+') ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
            }`}>
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  </div>
);

const OverviewTab = ({ project }: { project: ProjectFull['project'] }) => (
  <div className="space-y-6">
    <InfoCard icon={Building} title="Project Details">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatItem icon={CheckSquare} label="Status" value={project.status} />
        <StatItem icon={User} label="Client" value={project.client} />
        <StatItem icon={Building} label="Builder" value={project.builder} />
        <StatItem 
          icon={MapPin} 
          label="Location" 
          value={project.location} 
          href={project.location ? `http://maps.apple.com/?q=${encodeURIComponent(project.location)}` : undefined} 
        />
      </div>
    </InfoCard>

    <InfoCard icon={TrendingUp} title="Project Health">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatItem icon={CheckSquare} label="Open Tasks" value={project.openTasks} />
        <StatItem icon={Wrench} label="Open Issues" value={project.openImprovements} />
        <StatItem icon={Clock} label="Total Hours" value={`${project.totalHours?.toFixed(1) ?? '-'} hrs`} />
        <StatItem icon={Calendar} label="Last Updated" value="Today" />
      </div>
    </InfoCard>
  </div>
);

const FinancesTab = ({ project, expenses }: { 
  project: ProjectFull['project']; 
  expenses: ProjectFull['expenses']; 
}) => {
  const budgetUsed = project.budget && project.spent ? (project.spent / project.budget) * 100 : 0;
  const expenseTotal = expenses.reduce((sum, exp) => sum + (exp.value || 0), 0);
  
  return (
    <div className="space-y-6">
      <InfoCard icon={DollarSign} title="Budget Overview">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <StatItem icon={DollarSign} label="Total Budget" value={fmtMoney(project.budget)} />
          <StatItem icon={DollarSign} label="Amount Spent" value={fmtMoney(project.spent)} />
          <StatItem icon={DollarSign} label="Tracked Expenses" value={fmtMoney(expenseTotal)} />
          <StatItem icon={TrendingUp} label="Budget Used" value={`${budgetUsed.toFixed(1)}%`} />
        </div>
        
        {project.budget && project.spent && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Budget Progress</span>
              <span className="text-slate-300">{budgetUsed.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  budgetUsed > 90 ? 'bg-red-500' : budgetUsed > 75 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(budgetUsed, 100)}%` }}
              />
            </div>
          </div>
        )}
      </InfoCard>

      <InfoCard icon={FileText} title="Expense Breakdown">
        <div className="space-y-3">
          {expenses.length > 0 ? expenses.map(expense => (
            <div key={expense.id} className="flex justify-between items-center p-3 bg-slate-800/30 rounded-lg">
              <div>
                <p className="font-medium text-slate-100">{expense.name}</p>
                <p className="text-sm text-slate-400">{expense.category}</p>
              </div>
              <p className="font-semibold text-slate-100">{fmtMoney(expense.value)}</p>
            </div>
          )) : (
            <p className="text-slate-400 text-center py-8">No expenses tracked yet</p>
          )}
        </div>
      </InfoCard>
    </div>
  );
};

const PhotosTab = ({ items }: { items: Photo[] }) => (
  <div>
    {items.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(photo => (
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
        <p className="text-sm text-slate-500 mt-1">Photos will appear here as they&apos;re added to the project</p>
      </div>
    )}
  </div>
);

const TasksTab = ({ items }: { items: ProjectFull['tasks'] }) => (
  <div className="space-y-3">
    {items.length > 0 ? items.map(task => (
      <div key={task.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-medium text-slate-100">{task.title}</h4>
          {task.status && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
              {task.status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-400">
          {task.assignee && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{task.assignee}</span>
            </div>
          )}
          {task.due && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{task.due}</span>
            </div>
          )}
        </div>
      </div>
    )) : (
      <div className="text-center py-12">
        <CheckSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-400">No tasks assigned</p>
      </div>
    )}
  </div>
);

const ImprovementsTab = ({ items }: { items: ProjectFull['improvements'] }) => (
  <div className="space-y-3">
    {items.length > 0 ? items.map(improvement => (
      <div key={improvement.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div className="flex justify-between items-start">
          <h4 className="font-medium text-slate-100">{improvement.title}</h4>
          {improvement.status && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(improvement.status)}`}>
              {improvement.status}
            </span>
          )}
        </div>
      </div>
    )) : (
      <div className="text-center py-12">
        <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
        <p className="text-slate-400">No open improvements</p>
        <p className="text-sm text-slate-500 mt-1">All issues have been resolved!</p>
      </div>
    )}
  </div>
);

const TimeTab = ({ items }: { items: ProjectFull['time'] }) => {
  const totalHours = items.reduce((sum, entry) => sum + (entry.hours || 0), 0);
  
  return (
    <div className="space-y-6">
      <InfoCard icon={Clock} title="Time Summary">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatItem icon={Clock} label="Total Hours" value={`${totalHours.toFixed(1)} hrs`} />
          <StatItem icon={Calendar} label="Entries" value={items.length} />
          <StatItem icon={TrendingUp} label="Avg per Entry" value={`${items.length ? (totalHours / items.length).toFixed(1) : '0'} hrs`} />
        </div>
      </InfoCard>

      <div className="space-y-3">
        {items.length > 0 ? items.map(entry => (
          <div key={entry.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium text-slate-100">{entry.name}</h4>
              <span className="font-semibold text-blue-300">{entry.hours?.toFixed(1)} hrs</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              {entry.person && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{entry.person}</span>
                </div>
              )}
              {entry.date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{entry.date}</span>
                </div>
              )}
            </div>
          </div>
        )) : (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400">No time entries recorded</p>
          </div>
        )}
      </div>
    </div>
  );
};