// Core types for the ACP Dashboard

export interface Project {
  id: string;
  title: string;
  subdivision?: string;
  status?: string;
  client?: string;
  builder?: string;
  location?: string;
  jobNumber?: string;
  deadline?: string;
  budget?: string;
  tasks?: Task[];
  issues?: Issue[];
  comments?: Comment[];
  photos?: Photo[];
  // Additional Notion fields
  constructionPhase?: string;
  projectManager?: string;
  jobAccountSetup?: boolean | string;
  needFollowUp?: boolean | string;
  lastUpdated?: string;
  subDivision?: string;
  spent?: string;
  budgetSpent?: number;
  contract?: string;
  documentation?: string;
  expenses?: any[];
  filesMedia?: string;
  hourlyRate?: string;
  improvements?: any[];
  lastEditedTime?: string;
  notes?: string;
  options?: string;
  team?: string;
  timeTracking?: string;
  totalExpenses?: string;
  totalHours?: string;
}

export interface Task {
  id: number | string;
  title: string;
  completed: boolean;
  assignee?: string;
  description?: string;
  priority?: string;
  dueDate?: string;
}

export interface Issue {
  id: number | string;
  title: string;
  status: string;
  priority?: string;
  description?: string;
  assignee?: string;
  projectName?: string;
}

export interface Comment {
  id: number | string;
  text: string;
  author: string;
  createdAt: string;
}

export interface Photo {
  id: number | string;
  url: string;
  description?: string;
  date: string;
}

export interface KPIs {
  activeBids: number;
  postAndBeam: number;
  jobAccountsPending: number;
  openProblems: number;
}

export interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: Date;
}

export interface AppFilters {
  phase: string;
  assignee: string | null;
  dateRange: string | null;
  priority: string | null;
}

export interface QueuedAction {
  id: number;
  type: string;
  projectId?: string;
  taskId?: string | number;
  text?: string;
  completed?: boolean;
  [key: string]: any;
}

// Context types
export interface AppContextType {
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  selectedProjects: Set<string>;
  setSelectedProjects: (selected: Set<string>) => void;
  notifications: Notification[];
  notify: (message: string, type?: Notification['type'], duration?: number) => number;
  isOnline: boolean;
  queueAction: (action: Omit<QueuedAction, 'id'>) => void;
  recentlyViewed: string[];
  addToRecent: (projectId: string) => void;
  pinnedProjects: Set<string>;
  togglePin: (projectId: string) => void;
  searchHistory: string[];
  setSearchHistory: (history: string[]) => void;
  activeFilters: AppFilters;
  setActiveFilters: (filters: AppFilters) => void;
  pendingActions: QueuedAction[];
}