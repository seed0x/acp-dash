'use client';

import { useState, useEffect } from 'react';

type ProjectFull = {
  project: { id: string; title: string; client?: string; location?: string; status?: string; budget?: number; spent?: number; totalExpenses?: number; totalHours?: number; openTasks?: number; openImprovements?: number; };
  improvements: Array<{ id: string; title: string; status?: string }>;
  tasks: Array<{ id: string; title: string; status?: string; assignee?: string; due?: string }>;
  expenses: Array<{ id: string; name: string; category?: string; value?: number }>;
  time: Array<{ id: string; name: string; person?: string; date?: string; hours?: number }>;
};

function fmtMoney(n?: number | null) {
  if (n == null) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

const TABS = ['Details', 'Expenses', 'Tasks', 'Improvements', 'Time'];

export default function ProjectDetailPanel({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [data, setData] = useState<ProjectFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(TABS[0]);

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

  const { project, expenses, tasks, improvements, time } = data || {};

  return (
    <div className="fixed inset-0 z-30">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Panel */}
      <div className="relative z-10 bg-[#0F172A] border-l border-[var(--border)] h-full w-full max-w-2xl ml-auto flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-[var(--border)]">
          <div className="flex items-start justify-between">
            {loading ? <div className="h-8 w-3/4 skeleton" /> : (
              <div className="min-w-0">
                <h2 className="text-xl font-bold truncate">{project?.title}</h2>
                <p className="text-sm text-[var(--muted)]">{project?.client}</p>
              </div>
            )}
            <button onClick={onClose} className="text-2xl text-[var(--muted)] hover:text-white">&times;</button>
          </div>
          <div className="mt-4 border-b border-[var(--border)]">
            <nav className="-mb-px flex gap-4 text-sm">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 ${activeTab === tab ? 'border-blue-400 text-white' : 'border-transparent text-[var(--muted)] hover:text-white'}`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-grow p-4 overflow-y-auto">
          {loading && <div className="w-full h-64 skeleton" />}
          {error && <div className="text-red-400">Error: {error}</div>}
          {data && (
            <div>
              {activeTab === 'Details' && project && <DetailsTab project={project} />}
              {activeTab === 'Expenses' && <ExpensesTab items={expenses!} />}
              {activeTab === 'Tasks' && <TasksTab items={tasks!} />}
              {activeTab === 'Improvements' && <ImprovementsTab items={improvements!} />}
              {activeTab === 'Time' && <TimeTab items={time!} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Tab Components
const DetailsTab = ({ project }: { project: ProjectFull['project'] }) => (
  <div className="space-y-4">
    <div className="card p-4">
      <h3 className="font-bold mb-2">Key Info</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><div className="text-[var(--muted)]">Status</div><div className="font-semibold">{project.status || '-'}</div></div>
        {project.location && (
          <div>
            <div className="text-[var(--muted)]">Address</div>
            <a href={`http://maps.apple.com/?q=${encodeURIComponent(project.location)}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-400 hover:underline">{project.location}</a>
          </div>
        )}
      </div>
    </div>
    <div className="card p-4">
      <h3 className="font-bold mb-2">Financials</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><div className="text-[var(--muted)]">Budget</div><div className="font-semibold">{fmtMoney(project.budget)}</div></div>
        <div><div className="text-[var(--muted)]">Tracked Expenses</div><div className="font-semibold">{fmtMoney(project.totalExpenses)}</div></div>
        <div><div className="text-[var(--muted)]">Budget Spent (Rollup)</div><div className="font-semibold">{fmtMoney(project.spent)}</div></div>
        <div><div className="text-[var(--muted)]">Total Hours</div><div className="font-semibold">{project.totalHours?.toFixed(2) ?? '-'} hrs</div></div>
      </div>
    </div>
  </div>
);

const ExpensesTab = ({ items }: { items: ProjectFull['expenses'] }) => (
  <div className="space-y-2">{items.length > 0 ? items.map(it => (
    <div key={it.id} className="flex justify-between p-2 rounded bg-black/20"><div className="font-medium">{it.name}</div><div className="font-semibold">{fmtMoney(it.value)}</div></div>)) : <p className="text-sm text-[var(--muted)]">No expenses logged.</p>}
  </div>
);

const TasksTab = ({ items }: { items: ProjectFull['tasks'] }) => (
  <div className="space-y-2">{items.length > 0 ? items.map(it => (
    <div key={it.id} className="p-2 rounded bg-black/20"><div className="font-medium">{it.title}</div><div className="text-xs text-[var(--muted)]">{[it.status, it.assignee, it.due].filter(Boolean).join(' • ')}</div></div>)) : <p className="text-sm text-[var(--muted)]">No tasks for this project.</p>}
  </div>
);

const ImprovementsTab = ({ items }: { items: ProjectFull['improvements'] }) => (
  <div className="space-y-2">{items.length > 0 ? items.map(it => (
    <div key={it.id} className="p-2 rounded bg-black/20"><div className="font-medium">{it.title}</div><div className="text-xs text-[var(--muted)]">{it.status || 'Open'}</div></div>)) : <p className="text-sm text-[var(--muted)]">No improvements logged.</p>}
  </div>
);

const TimeTab = ({ items }: { items: ProjectFull['time'] }) => (
  <div className="space-y-2">{items.length > 0 ? items.map(it => (
    <div key={it.id} className="flex justify-between p-2 rounded bg-black/20"><div><div className="font-medium">{it.name}</div><div className="text-xs text-[var(--muted)]">{[it.person, it.date].filter(Boolean).join(' • ')}</div></div><div className="font-semibold">{it.hours?.toFixed(2)} hrs</div></div>)) : <p className="text-sm text-[var(--muted)]">No time entries logged.</p>}
  </div>
);