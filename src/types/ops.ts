// src/types/ops.ts
export type KPI = {
  postAndBeam: number;
  activeBids: number;
  jobAccountsPending: number;
  openProblems: number;
};

export type ProjectRow = {
  id: string;
  name: string;
  title?: string;
  client?: string;
  // add fields you actually use...
};

export type OpsProps = {
  initialKpis: KPI;
  initialPendingAcct: ProjectRow[];
};

// Enhanced Task/Issue types for the task database functionality
export type Task = {
  id: string;
  title: string;
  description?: string;
  status: 'Open' | 'In Progress' | 'Done' | 'Closed';
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  assignee?: string;
  dueDate?: string;
  projectId?: string;
  projectName?: string;
  labels?: string[];
  createdAt?: string;
  updatedAt?: string;
  completed?: boolean;
};

export type Comment = {
  id: string;
  taskId: string;
  content: string;
  author: string;
  createdAt: string;
  updatedAt?: string;
};

export type TaskFilter = {
  status?: string[];
  priority?: string[];
  assignee?: string[];
  projectId?: string;
  search?: string;
  completed?: boolean;
};

export type TaskSort = {
  field: 'title' | 'status' | 'priority' | 'dueDate' | 'createdAt' | 'updatedAt';
  direction: 'asc' | 'desc';
};

// Enhanced Issue type (backwards compatible with existing Issue type)
export type Issue = Task;

export type SearchableEntity = {
  id: string;
  title: string;
  description?: string;
  searchableText: string;
};
