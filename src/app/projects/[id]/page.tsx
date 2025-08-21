'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// Define the shape of the data we expect from the API
type ProjectFull = {
  project: {
    id: string;
    title: string;
    client?: string;
    location?: string;
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
};

// Helper to format currency
function fmtMoney(n?: number | null) {
  if (n == null) return '-';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  } catch {
    return String(n);
  }
}

export default function ProjectDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<ProjectFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/projects/${id}/full`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to fetch project details');
        }
        const fetchedData = await res.json();
        setData(fetchedData);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto p-6 space-y-4">
        <div className="h-8 w-1/2 skeleton mb-4"></div>
        <div className="card p-4 space-y-3">
          <div className="h-6 w-1/3 skeleton"></div>
          <div className="h-4 w-1/4 skeleton"></div>
          <div className="h-4 w-1/2 skeleton"></div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card h-48 skeleton"></div>
          <div className="card h-48 skeleton"></div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-7xl mx-auto p-6">
        <div className="card p-4 bg-red-900/20 border-red-500/50">
          <h2 className="font-bold text-red-400">Error</h2>
          <p>{error}</p>
          <Link href="/" className="text-blue-400 underline mt-2 inline-block">
            &larr; Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="max-w-7xl mx-auto p-6">
        <p>No project data found.</p>
        <Link href="/" className="text-blue-400 underline mt-2 inline-block">
          &larr; Back to Dashboard
        </Link>
      </main>
    );
  }

  const { project, improvements, tasks, expenses, time } = data;
  const address = project.location;

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <Link href="/" className="text-sm text-blue-400 hover:underline">
          &larr; Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold mt-2">{project.title}</h1>
        <div className="text-lg text-[var(--muted)]">{project.client}</div>
      </div>

      <div className="card p-4">
        <h2 className="font-bold text-xl mb-3">Project Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-[var(--muted)]">Status</div>
            <div className="font-semibold">{project.status || '-'}</div>
          </div>
          {address && (
            <div>
              <div className="text-[var(--muted)]">Address</div>
              <a
                href={`http://maps.apple.com/?q=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-blue-400 hover:underline"
              >
                {address}
              </a>
            </div>
          )}
          <div>
            <div className="text-[var(--muted)]">Open Tasks</div>
            <div className="font-semibold">{project.openTasks ?? '-'}</div>
          </div>
          <div>
            <div className="text-[var(--muted)]">Open Improvements</div>
            <div className="font-semibold">{project.openImprovements ?? '-'}</div>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-bold text-xl mb-3">Financials</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-[var(--muted)]">Budget</div>
            <div className="font-semibold">{fmtMoney(project.budget)}</div>
          </div>
          <div>
            <div className="text-[var(--muted)]">Budget Spent (Rollup)</div>
            <div className="font-semibold">{fmtMoney(project.spent)}</div>
          </div>
          <div>
            <div className="text-[var(--muted)]">Tracked Expenses</div>
            <div className="font-semibold">{fmtMoney(project.totalExpenses)}</div>
          </div>
          <div>
            <div className="text-[var(--muted)]">Total Hours</div>
            <div className="font-semibold">{project.totalHours?.toFixed(2) ?? '-'} hrs</div>
          </div>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <section className="card">
          <h2 className="font-bold text-xl p-4 border-b border-[var(--border)]">Expenses ({expenses.length})</h2>
          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            {expenses.length > 0 ? expenses.map(item => (
              <div key={item.id} className="flex justify-between p-2 rounded bg-black/20">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-[var(--muted)]">{item.category || 'Uncategorized'}</div>
                </div>
                <div className="font-semibold">{fmtMoney(item.value)}</div>
              </div>
            )) : <p className="text-sm text-[var(--muted)]">No expenses logged.</p>}
          </div>
        </section>

        <section className="card">
          <h2 className="font-bold text-xl p-4 border-b border-[var(--border)]">Tasks ({tasks.length})</h2>
          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
             {tasks.length > 0 ? tasks.map(item => (
              <div key={item.id} className="p-2 rounded bg-black/20">
                <div className="font-medium">{item.title}</div>
                <div className="text-xs text-[var(--muted)]">
                  {[item.status, item.assignee, item.due].filter(Boolean).join(' • ')}
                </div>
              </div>
            )) : <p className="text-sm text-[var(--muted)]">No tasks for this project.</p>}
          </div>
        </section>
        
        <section className="card">
          <h2 className="font-bold text-xl p-4 border-b border-[var(--border)]">Improvements ({improvements.length})</h2>
          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            {improvements.length > 0 ? improvements.map(item => (
              <div key={item.id} className="p-2 rounded bg-black/20">
                <div className="font-medium">{item.title}</div>
                <div className="text-xs text-[var(--muted)]">{item.status || 'Open'}</div>
              </div>
            )) : <p className="text-sm text-[var(--muted)]">No improvements logged.</p>}
          </div>
        </section>

        <section className="card">
          <h2 className="font-bold text-xl p-4 border-b border-[var(--border)]">Time Entries ({time.length})</h2>
          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            {time.length > 0 ? time.map(item => (
              <div key={item.id} className="flex justify-between p-2 rounded bg-black/20">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-[var(--muted)]">{[item.person, item.date].filter(Boolean).join(' • ')}</div>
                </div>
                <div className="font-semibold">{item.hours?.toFixed(2)} hrs</div>
              </div>
            )) : <p className="text-sm text-[var(--muted)]">No time entries logged.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}