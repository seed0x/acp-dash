'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Plus, Camera, CheckCircle2, Search, User, Building, MapPin, 
  DollarSign, Clock, TrendingUp, AlertCircle, CheckSquare,
  Calendar, ExternalLink, Star, Home, Bell, Settings,
  Hammer, Wrench, PaintBucket, FileText, CreditCard, Upload, X,
  Edit3, Save, Eye, MessageSquare, Trophy, Filter,
  AlertTriangle, ChevronRight, Trash2, UserCheck, MoreVertical,
  Target, CheckCheck, ClipboardList, Send, Hash, ChevronDown,
  Activity, Package, Users, ArrowUp, ArrowDown, Inbox,
  Layers, BarChart3, Download, Copy, Pin, PinOff, Command,
  RefreshCw, Wifi, WifiOff, Zap, Timer, FolderOpen, Archive
} from 'lucide-react';

// ==================== CONTEXT & STATE MANAGEMENT ====================

const AppContext = createContext({});

const AppProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState(new Set());
  const [notifications, setNotifications] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [pinnedProjects, setPinnedProjects] = useState(new Set());
  const [pendingActions, setPendingActions] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [activeFilters, setActiveFilters] = useState({
    phase: 'all',
    assignee: null,
    dateRange: null,
    priority: null
  });

  // Notification system
  const notify = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    const notification = { id, message, type, timestamp: new Date() };
    setNotifications(prev => [...prev, notification]);
    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, duration);
    }
    return id;
  }, []);

  // Offline queue management
  const queueAction = useCallback((action) => {
    setPendingActions(prev => [...prev, { ...action, id: Date.now() }]);
    notify('Action queued - will sync when online', 'warning');
  }, [notify]);

  // Recent items tracking
  const addToRecent = useCallback((projectId) => {
    setRecentlyViewed(prev => {
      const filtered = prev.filter(id => id !== projectId);
      return [projectId, ...filtered].slice(0, 5);
    });
  }, []);

  // Pin/unpin projects
  const togglePin = useCallback((projectId) => {
    setPinnedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
        notify('Project unpinned', 'info');
      } else {
        newSet.add(projectId);
        notify('Project pinned', 'success');
      }
      return newSet;
    });
  }, [notify]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      notify('Back online - syncing...', 'success');
      // Process pending queue
      pendingActions.forEach(action => {
        // Execute queued actions
        console.log('Processing queued action:', action);
      });
      setPendingActions([]);
    };

    const handleOffline = () => {
      setIsOnline(false);
      notify('Working offline - changes will sync when connection restored', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingActions, notify]);

  const value = {
    projects, setProjects,
    selectedProjects, setSelectedProjects,
    notifications, notify,
    isOnline, queueAction,
    recentlyViewed, addToRecent,
    pinnedProjects, togglePin,
    searchHistory, setSearchHistory,
    activeFilters, setActiveFilters
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

const useApp = () => useContext(AppContext);

// ==================== CUSTOM HOOKS ====================

const useKeyboardShortcuts = () => {
  const { notify } = useApp();
  
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Command/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
      // Command/Ctrl + N for new issue
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        document.getElementById('quick-issue-input')?.focus();
      }
      // Escape to close panels
      if (e.key === 'Escape') {
        document.querySelector('.side-panel-close')?.click();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [notify]);
};

const useLocalStorage = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return defaultValue;
    }
  });

  const setStoredValue = useCallback((newValue) => {
    try {
      setValue(newValue);
      window.localStorage.setItem(key, JSON.stringify(newValue));
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  }, [key]);

  return [value, setStoredValue];
};

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// ==================== NOTIFICATION SYSTEM ====================

const NotificationCenter = () => {
  const { notifications } = useApp();

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`
            p-4 rounded-lg shadow-lg backdrop-blur-xl border animate-slide-up
            ${notification.type === 'success' ? 'bg-green-500/20 border-green-500 text-green-300' : ''}
            ${notification.type === 'error' ? 'bg-red-500/20 border-red-500 text-red-300' : ''}
            ${notification.type === 'warning' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300' : ''}
            ${notification.type === 'info' ? 'bg-blue-500/20 border-blue-500 text-blue-300' : ''}
          `}
        >
          <div className="flex items-start gap-3">
            {notification.type === 'success' && <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />}
            {notification.type === 'error' && <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />}
            {notification.type === 'warning' && <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />}
            {notification.type === 'info' && <Bell className="h-5 w-5 flex-shrink-0 mt-0.5" />}
            <div className="flex-1">
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ==================== HEADER WITH KPIs ====================

const Header = ({ kpis }) => {
  const { isOnline, pendingActions } = useApp();
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Home className="h-5 w-5" />
              ACP Operations
            </h1>
            <div className="flex items-center gap-2">
              {!isOnline && (
                <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded text-xs">
                  <WifiOff className="h-3 w-3" />
                  Offline
                </span>
              )}
              {pendingActions.length > 0 && (
                <span className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  {pendingActions.length} pending
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCommandPalette(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700"
            >
              <Command className="h-4 w-4" />
              <span className="hidden sm:inline">Cmd+K</span>
            </button>
            <button className="p-2 text-slate-400 hover:text-white">
              <Bell className="h-5 w-5" />
            </button>
            <button className="p-2 text-slate-400 hover:text-white">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard
            icon={Target}
            label="Active Bids"
            value={kpis.activeBids}
            trend={12}
            color="yellow"
          />
          <KPICard
            icon={Hammer}
            label="Post & Beam"
            value={kpis.postAndBeam}
            trend={5}
            color="blue"
          />
          <KPICard
            icon={ClipboardList}
            label="Setup Needed"
            value={kpis.jobAccountsPending}
            trend={-2}
            color="orange"
          />
          <KPICard
            icon={AlertTriangle}
            label="Open Issues"
            value={kpis.openProblems}
            trend={-8}
            color="red"
          />
        </div>
      </div>
      
      {showCommandPalette && (
        <CommandPalette onClose={() => setShowCommandPalette(false)} />
      )}
    </header>
  );
};

const KPICard = ({ icon: Icon, label, value, trend, color }) => {
  const colors = {
    yellow: 'text-yellow-400 bg-yellow-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    orange: 'text-orange-400 bg-orange-500/10',
    red: 'text-red-400 bg-red-500/10'
  };

  return (
    <div className="bg-slate-800/50 rounded-lg p-3 hover:bg-slate-800/70 transition-colors cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-1.5 rounded ${colors[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className={`text-xs font-medium flex items-center gap-1 ${
          trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-slate-400'
        }`}>
          {trend > 0 ? <ArrowUp className="h-3 w-3" /> : trend < 0 ? <ArrowDown className="h-3 w-3" /> : null}
          {Math.abs(trend)}%
        </span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
};

// ==================== COMMAND PALETTE ====================

const CommandPalette = ({ onClose }) => {
  const [search, setSearch] = useState('');
  const { notify, togglePin } = useApp();
  
  const commands = [
    { label: 'Add Photo', icon: Camera, action: () => document.getElementById('photo-upload')?.click() },
    { label: 'Report Issue', icon: AlertTriangle, action: () => document.getElementById('quick-issue-input')?.focus() },
    { label: 'Export Report', icon: Download, action: () => notify('Generating report...', 'info') },
    { label: 'Refresh Data', icon: RefreshCw, action: () => window.location.reload() },
    { label: 'Toggle Offline Mode', icon: Wifi, action: () => notify('Offline mode toggled', 'info') },
  ];

  const filteredCommands = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="max-w-lg mx-auto mt-20 bg-slate-900 rounded-xl shadow-2xl border border-slate-800" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-800">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Type a command..."
            className="w-full px-3 py-2 bg-slate-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {filteredCommands.map((cmd, i) => (
            <button
              key={i}
              onClick={() => { cmd.action(); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left text-white hover:bg-slate-800 rounded-lg"
            >
              <cmd.icon className="h-4 w-4 text-slate-400" />
              {cmd.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==================== SEARCH & FILTERS ====================

const SearchBar = ({ onSearch }) => {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const { activeFilters, setActiveFilters, searchHistory, setSearchHistory } = useApp();
  const debouncedSearch = useDebounce(search, 300);
  
  useEffect(() => {
    onSearch(debouncedSearch);
    if (debouncedSearch && !searchHistory.includes(debouncedSearch)) {
      setSearchHistory(prev => [debouncedSearch, ...prev].slice(0, 5));
    }
  }, [debouncedSearch]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          id="global-search"
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search projects, clients, issues... (Cmd+K)"
          className="w-full pl-12 pr-12 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded ${
            Object.values(activeFilters).some(v => v && v !== 'all') ? 'text-blue-400' : 'text-slate-400'
          }`}
        >
          <Filter className="h-5 w-5" />
        </button>
      </div>
      
      {showFilters && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <select
              value={activeFilters.phase}
              onChange={e => setActiveFilters(prev => ({ ...prev, phase: e.target.value }))}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value="all">All Phases</option>
              <option value="bidding">Bidding</option>
              <option value="post-beam">Post & Beam</option>
              <option value="trim">Trim</option>
              <option value="complete">Complete</option>
            </select>
            
            <select
              value={activeFilters.priority || ''}
              onChange={e => setActiveFilters(prev => ({ ...prev, priority: e.target.value || null }))}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value="">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
            
            <select
              value={activeFilters.dateRange || ''}
              onChange={e => setActiveFilters(prev => ({ ...prev, dateRange: e.target.value || null }))}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value="">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="overdue">Overdue</option>
            </select>
            
            <button
              onClick={() => setActiveFilters({ phase: 'all', assignee: null, dateRange: null, priority: null })}
              className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600"
            >
              Clear Filters
            </button>
          </div>
          
          {searchHistory.length > 0 && (
            <div className="pt-3 border-t border-slate-700">
              <p className="text-xs text-slate-400 mb-2">Recent Searches</p>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((term, i) => (
                  <button
                    key={i}
                    onClick={() => setSearch(term)}
                    className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs hover:bg-slate-600"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ==================== PROJECT CARDS WITH BULK ACTIONS ====================

const ProjectGrid = ({ projects, onProjectClick }) => {
  const { selectedProjects, setSelectedProjects, pinnedProjects, togglePin, notify } = useApp();
  const [showBulkActions, setShowBulkActions] = useState(false);

  useEffect(() => {
    setShowBulkActions(selectedProjects.size > 0);
  }, [selectedProjects]);

  const handleSelectAll = () => {
    if (selectedProjects.size === projects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(projects.map(p => p.id)));
    }
  };

  const handleBulkStatusChange = (status) => {
    notify(`Updating ${selectedProjects.size} projects to ${status}...`, 'info');
    // API call here
    setSelectedProjects(new Set());
  };

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const aPinned = pinnedProjects.has(a.id);
      const bPinned = pinnedProjects.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });
  }, [projects, pinnedProjects]);

  return (
    <div className="space-y-4">
      {showBulkActions && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-center justify-between">
          <span className="text-blue-300">
            {selectedProjects.size} project{selectedProjects.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkStatusChange('Complete')}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
            >
              Mark Complete
            </button>
            <button
              onClick={() => handleBulkStatusChange('Archive')}
              className="px-3 py-1.5 bg-slate-600 text-white rounded-lg text-sm hover:bg-slate-700"
            >
              Archive
            </button>
            <button
              onClick={() => setSelectedProjects(new Set())}
              className="px-3 py-1.5 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={handleSelectAll}
          className="text-xs text-slate-400 hover:text-white"
        >
          {selectedProjects.size === projects.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      
      <div className="grid gap-3">
        {sortedProjects.map(project => (
          <ProjectCard
            key={project.id}
            project={project}
            isSelected={selectedProjects.has(project.id)}
            isPinned={pinnedProjects.has(project.id)}
            onSelect={(id) => {
              setSelectedProjects(prev => {
                const newSet = new Set(prev);
                if (newSet.has(id)) {
                  newSet.delete(id);
                } else {
                  newSet.add(id);
                }
                return newSet;
              });
            }}
            onPin={() => togglePin(project.id)}
            onClick={() => onProjectClick(project.id)}
          />
        ))}
      </div>
    </div>
  );
};

const ProjectCard = ({ project, isSelected, isPinned, onSelect, onPin, onClick }) => {
  const getPhaseColor = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower.includes('bid')) return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300';
    if (statusLower.includes('post') || statusLower.includes('beam')) return 'bg-blue-500/20 border-blue-500/30 text-blue-300';
    if (statusLower.includes('trim')) return 'bg-green-500/20 border-green-500/30 text-green-300';
    if (statusLower.includes('complete')) return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300';
    return 'bg-slate-700 text-slate-300';
  };

  return (
    <div className={`
      bg-slate-800/50 border rounded-xl p-4 transition-all
      ${isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-600'}
      ${isPinned ? 'shadow-lg shadow-blue-500/20' : ''}
    `}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(project.id)}
          className="mt-1 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3
                className="font-semibold text-white hover:text-blue-400 cursor-pointer flex items-center gap-2"
                onClick={onClick}
              >
                {project.title}
                {project.subdivision && (
                  <span className="text-sm font-normal text-slate-400">• {project.subdivision}</span>
                )}
                {isPinned && <Pin className="h-3 w-3 text-blue-400" />}
              </h3>
              <div className="flex items-center gap-3 mt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getPhaseColor(project.status)}`}>
                  {project.status || 'No Status'}
                </span>
                {project.jobNumber && (
                  <span className="text-xs text-slate-400">#{project.jobNumber}</span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onPin(); }}
                className="p-1 text-slate-400 hover:text-white"
              >
                {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              </button>
              <button className="p-1 text-slate-400 hover:text-white">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
            {project.client && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="truncate">{project.client}</span>
              </div>
            )}
            {project.builder && (
              <div className="flex items-center gap-1">
                <Building className="h-3 w-3" />
                <span className="truncate">{project.builder}</span>
              </div>
            )}
            {project.location && (
              <div className="flex items-center gap-1 col-span-2">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{project.location}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== ENHANCED PROJECT DETAIL PANEL ====================

const ProjectDetailPanel = ({ projectId, onClose }) => {
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const { notify, addToRecent, isOnline, queueAction } = useApp();
  const [searchWithinPanel, setSearchWithinPanel] = useState('');

  useEffect(() => {
    loadProject();
    addToRecent(projectId);
  }, [projectId]);

  const loadProject = async () => {
    setLoading(true);
    try {
      // Simulated API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setProject({
        id: projectId,
        title: `Project ${projectId}`,
        client: 'John Smith',
        builder: 'ABC Construction',
        status: 'Post & Beam',
        jobNumber: '2024-001',
        tasks: [
          { id: 1, title: 'Install rough plumbing', completed: false, assignee: 'Mike' },
          { id: 2, title: 'Frame walls', completed: true, assignee: 'Steve' }
        ],
        issues: [
          { id: 1, title: 'Leak in bathroom', status: 'Open', priority: 'High' }
        ],
        comments: [
          { id: 1, text: 'Waiting on permits', author: 'Admin', createdAt: '2024-01-15' }
        ],
        photos: [
          { id: 1, url: '/api/placeholder/400/300', description: 'Foundation work', date: '2024-01-10' }
        ]
      });
    } catch (error) {
      notify('Failed to load project', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = (text) => {
    if (isOnline) {
      // Direct API call
      notify('Comment added', 'success');
    } else {
      queueAction({ type: 'ADD_COMMENT', projectId, text });
    }
  };

  const handleTaskToggle = (taskId) => {
    const task = project.tasks.find(t => t.id === taskId);
    const action = { type: 'TOGGLE_TASK', projectId, taskId, completed: !task.completed };
    
    // Optimistic update
    setProject(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => 
        t.id === taskId ? { ...t, completed: !t.completed } : t
      )
    }));

    if (isOnline) {
      // API call
      notify('Task updated', 'success');
    } else {
      queueAction(action);
    }
  };

  // Filter content based on search
  const filteredContent = useMemo(() => {
    if (!searchWithinPanel || !project) return project;
    
    const term = searchWithinPanel.toLowerCase();
    return {
      ...project,
      tasks: project.tasks.filter(t => t.title.toLowerCase().includes(term)),
      issues: project.issues.filter(i => i.title.toLowerCase().includes(term)),
      comments: project.comments.filter(c => c.text.toLowerCase().includes(term))
    };
  }, [project, searchWithinPanel]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
        <div className="absolute right-0 h-full w-full max-w-2xl bg-slate-900 border-l border-slate-800">
          <div className="p-6 space-y-4">
            <div className="h-8 bg-slate-800 rounded animate-pulse" />
            <div className="h-32 bg-slate-800 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="absolute right-0 h-full w-full max-w-2xl bg-slate-900 border-l border-slate-800 flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-800 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">{project.title}</h2>
              <div className="flex items-center gap-3 mt-2 text-sm text-slate-400">
                <span>#{project.jobNumber}</span>
                <span>•</span>
                <span>{project.client}</span>
                <span>•</span>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded">
                  {project.status}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="side-panel-close p-2 text-slate-400 hover:text-white">
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* Search within panel */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchWithinPanel}
              onChange={e => setSearchWithinPanel(e.target.value)}
              placeholder="Search within project..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 -mb-px">
            {['overview', 'tasks', 'issues', 'photos', 'comments'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'text-blue-400 border-blue-400'
                    : 'text-slate-400 border-transparent hover:text-white'
                }`}
              >
                {tab}
                {tab === 'tasks' && ` (${filteredContent.tasks.length})`}
                {tab === 'issues' && ` (${filteredContent.issues.length})`}
              </button>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && <OverviewTab project={project} />}
          {activeTab === 'tasks' && <TasksTab tasks={filteredContent.tasks} onToggle={handleTaskToggle} />}
          {activeTab === 'issues' && <IssuesTab issues={filteredContent.issues} />}
          {activeTab === 'photos' && <PhotosTab photos={filteredContent.photos} />}
          {activeTab === 'comments' && <CommentsTab comments={filteredContent.comments} onAdd={handleAddComment} />}
        </div>
      </div>
    </div>
  );
};

// Tab Components
const OverviewTab = ({ project }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 gap-4">
      <InfoField label="Client" value={project.client} />
      <InfoField label="Builder" value={project.builder} />
      <InfoField label="Status" value={project.status} />
      <InfoField label="Job #" value={project.jobNumber} />
    </div>
    
    <div className="bg-slate-800/50 rounded-xl p-6">
      <h3 className="font-semibold text-white mb-4">Quick Stats</h3>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-blue-400">{project.tasks.filter(t => !t.completed).length}</p>
          <p className="text-xs text-slate-400">Open Tasks</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-orange-400">{project.issues.length}</p>
          <p className="text-xs text-slate-400">Issues</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-400">{project.photos.length}</p>
          <p className="text-xs text-slate-400">Photos</p>
        </div>
      </div>
    </div>
  </div>
);

const TasksTab = ({ tasks, onToggle }) => {
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState('');
  const { notify } = useApp();

  const handleAddTask = () => {
    if (newTask.trim()) {
      notify('Task added', 'success');
      setNewTask('');
      setShowAddTask(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowAddTask(true)}
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
      >
        Add Task
      </button>
      
      {showAddTask && (
        <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
          <input
            type="text"
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            placeholder="Task description..."
            className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg"
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={handleAddTask} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              Add
            </button>
            <button onClick={() => setShowAddTask(false)} className="px-4 py-2 bg-slate-700 text-white rounded-lg">
              Cancel
            </button>
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        {tasks.map(task => (
          <div key={task.id} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => onToggle(task.id)}
              className="rounded border-slate-600 bg-slate-700 text-blue-500"
            />
            <div className="flex-1">
              <p className={`text-white ${task.completed ? 'line-through opacity-50' : ''}`}>
                {task.title}
              </p>
              {task.assignee && (
                <p className="text-xs text-slate-400">Assigned to: {task.assignee}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const IssuesTab = ({ issues }) => (
  <div className="space-y-3">
    {issues.map(issue => (
      <div key={issue.id} className="bg-slate-800/50 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-medium text-white">{issue.title}</h4>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-2 py-1 rounded text-xs ${
                issue.status === 'Open' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
              }`}>
                {issue.status}
              </span>
              {issue.priority && (
                <span className={`px-2 py-1 rounded text-xs ${
                  issue.priority === 'High' ? 'bg-orange-500/20 text-orange-300' : 'bg-slate-700 text-slate-300'
                }`}>
                  {issue.priority}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const PhotosTab = ({ photos }) => (
  <div className="grid grid-cols-2 gap-4">
    {photos.map(photo => (
      <div key={photo.id} className="bg-slate-800/50 rounded-lg overflow-hidden">
        <img src={photo.url} alt={photo.description} className="w-full h-32 object-cover" />
        <div className="p-3">
          <p className="text-sm text-white">{photo.description}</p>
          <p className="text-xs text-slate-400 mt-1">{photo.date}</p>
        </div>
      </div>
    ))}
  </div>
);

const CommentsTab = ({ comments, onAdd }) => {
  const [newComment, setNewComment] = useState('');

  const handleAdd = () => {
    if (newComment.trim()) {
      onAdd(newComment);
      setNewComment('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 px-3 py-2 bg-slate-800 text-white rounded-lg"
        />
        <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
          <Send className="h-4 w-4" />
        </button>
      </div>
      
      <div className="space-y-3">
        {comments.map(comment => (
          <div key={comment.id} className="bg-slate-800/50 rounded-lg p-4">
            <p className="text-white">{comment.text}</p>
            <p className="text-xs text-slate-400 mt-2">
              {comment.author} • {comment.createdAt}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

const InfoField = ({ label, value }) => (
  <div className="bg-slate-800/50 rounded-lg p-3">
    <p className="text-xs text-slate-400 mb-1">{label}</p>
    <p className="text-white font-medium">{value || '-'}</p>
  </div>
);

// ==================== QUICK ACTIONS SIDEBAR ====================

const QuickActionsSidebar = () => {
  const { notify, recentlyViewed, projects } = useApp();
  const [issueText, setIssueText] = useState('');
  const [selectedProject, setSelectedProject] = useState('');

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      notify(`Photo "${file.name}" uploaded`, 'success');
    }
  };

  const handleAddIssue = () => {
    if (issueText.trim() && selectedProject) {
      notify('Issue reported', 'success');
      setIssueText('');
    }
  };

  const recentProjects = recentlyViewed.map(id => 
    projects.find(p => p.id === id)
  ).filter(Boolean).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="bg-slate-800/50 rounded-xl p-4">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-400" />
          Quick Actions
        </h3>
        
        <div className="space-y-3">
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg text-sm"
          >
            <option value="">Select project...</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.title} {p.subdivision && `- ${p.subdivision}`}
              </option>
            ))}
          </select>
          
          <label className="block">
            <span className="text-xs text-slate-400">Upload Photo</span>
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="mt-1 w-full text-sm text-slate-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white"
            />
          </label>
          
          <div>
            <input
              id="quick-issue-input"
              type="text"
              value={issueText}
              onChange={e => setIssueText(e.target.value)}
              placeholder="Report an issue..."
              className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg text-sm"
            />
            <button
              onClick={handleAddIssue}
              className="mt-2 w-full bg-orange-600 text-white py-2 rounded-lg text-sm hover:bg-orange-700"
            >
              Add Issue
            </button>
          </div>
        </div>
      </div>
      
      {/* Recently Viewed */}
      {recentProjects.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-400" />
            Recently Viewed
          </h3>
          <div className="space-y-2">
            {recentProjects.map(project => (
              <button
                key={project.id}
                className="w-full text-left p-2 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <p className="text-sm text-white font-medium">{project.title}</p>
                <p className="text-xs text-slate-400">{project.status}</p>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Stats */}
      <div className="bg-slate-800/50 rounded-xl p-4">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-green-400" />
          This Week
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Photos Added</span>
            <span className="text-white font-medium">23</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Issues Resolved</span>
            <span className="text-white font-medium">8</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Tasks Completed</span>
            <span className="text-white font-medium">47</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN APP ====================

export default function App() {
  const [viewingProjectId, setViewingProjectId] = useState(null);
  const [projects, setProjects] = useState([
    { id: '1', title: 'Apple Ln', subdivision: 'Oak Ridge', status: 'Bidding', client: 'John Smith', builder: 'ABC Construction', location: '123 Apple Ln', jobNumber: '2024-001' },
    { id: '2', title: 'Pine St', subdivision: 'Westview', status: 'Post & Beam', client: 'Jane Doe', builder: 'XYZ Builders', location: '456 Pine St', jobNumber: '2024-002' },
    { id: '3', title: 'Oak Grove', subdivision: 'Eastside', status: 'Trim', client: 'Bob Johnson', builder: 'DEF Construction', location: '789 Oak Grove', jobNumber: '2024-003' },
  ]);
  const [filteredProjects, setFilteredProjects] = useState(projects);
  
  const kpis = {
    activeBids: 5,
    postAndBeam: 12,
    jobAccountsPending: 3,
    openProblems: 8
  };

  const handleSearch = (searchTerm) => {
    if (!searchTerm) {
      setFilteredProjects(projects);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredProjects(projects.filter(p => 
        p.title.toLowerCase().includes(term) ||
        p.client?.toLowerCase().includes(term) ||
        p.subdivision?.toLowerCase().includes(term) ||
        p.location?.toLowerCase().includes(term)
      ));
    }
  };

  useKeyboardShortcuts();

  return (
    <AppProvider>
      <div className="min-h-screen bg-slate-950 text-white">
        <Header kpis={kpis} />
        
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 space-y-6">
              <SearchBar onSearch={handleSearch} />
              <ProjectGrid 
                projects={filteredProjects} 
                onProjectClick={setViewingProjectId}
              />
            </div>
            
            <div className="lg:col-span-1">
              <QuickActionsSidebar />
            </div>
          </div>
        </div>
        
        {viewingProjectId && (
          <ProjectDetailPanel
            projectId={viewingProjectId}
            onClose={() => setViewingProjectId(null)}
          />
        )}
        
        <NotificationCenter />
      </div>
    </AppProvider>
  );
}
      <DashboardComponent {...props} />
    </Suspense>
  );
}
