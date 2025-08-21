'use client';

import { useState, useEffect } from 'react';
import { X, Building, User, MapPin, DollarSign, Clock, CheckSquare, Wrench } from 'lucide-react';

// Type definitions... (same as before)
type Photo = { id: string; description: string; url: string; };
type ProjectFull = {
  project: { id: string; title: string; client?: string; location?: string; builder?: string; status?: string; budget?: number; spent?: number; totalExpenses?: number; totalHours?: number; openTasks?: number; openImprovements?: number; };
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

const TABS = ['Details', 'Photos', 'Expenses', 'Tasks', 'Improvements', 'Time'];

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
      } catch (e: any) { setError(e.message) } 
      finally { setLoading(false) }
    }
    fetchData();
  }, [projectId]);

  const { project, expenses, tasks, improvements, time, photos } = data || {};

  return (
    <div className="fixed inset-0 z-30">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-card border-l h-full w-full max-w-2xl ml-auto flex flex-col">
        <div className="flex-shrink-0 p-4 border-b">
          <div className="flex items-start justify-between">
            {loading ? <div className="h-8 w-3/4 skeleton rounded-md" /> : (
              <div className="min-w-0">
                <h2 className="text-xl font-bold truncate">{project?.title}</h2>
                <p className="text-sm text-muted-foreground">{project?.client}</p>
              </div>
            )}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X /></button>
          </div>
          <div className="mt-4 border-b">
            <nav className="-mb-px flex gap-4 text-sm overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
        </div>
        <div className="flex-grow p-4 overflow-y-auto">
          {loading && <div className="w-full h-64 skeleton rounded-lg" />}
          {error && <div className="text-destructive">{error}</div>}
          {data && (
            <div>
              {activeTab === 'Details' && project && <DetailsTab project={project} />}
              {activeTab === 'Photos' && <PhotosTab items={photos!} />}
              {activeTab === 'Expenses' && <TabContent items={expenses!} titleKey="name" valueKey="value" formatValue={fmtMoney} />}
              {activeTab === 'Tasks' && <TabContent items={tasks!} titleKey="title" metaKeys={['status', 'assignee', 'due']} />}
              {activeTab === 'Improvements' && <TabContent items={improvements!} titleKey="title" metaKeys={['status']} />}
              {activeTab === 'Time' && <TabContent items={time!} titleKey="name" valueKey="hours" metaKeys={['person', 'date']} formatValue={v => `${v?.toFixed(2)} hrs`} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const DetailItem = ({ icon: Icon, label, value, href }: { icon: React.ElementType, label: string, value?: string | number, href?: string }) => (
  <div className="flex items-start gap-3">
    <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      {href ? 
        <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-400 hover:underline">{value}</a> :
        <p className="font-semibold">{value || '-'}</p>
      }
    </div>
  </div>
);

const DetailsTab = ({ project }: { project: ProjectFull['project'] }) => (
  <div className="space-y-6">
    <div className="card p-4">
      <h3 className="font-bold mb-4 text-lg">Key Info</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DetailItem icon={CheckSquare} label="Status" value={project.status} />
        <DetailItem icon={User} label="Client" value={project.client} />
        <DetailItem icon={Building} label="Builder" value={project.builder} />
        <DetailItem icon={MapPin} label="Address" value={project.location} href={project.location ? `http://maps.apple.com/?q=${encodeURIComponent(project.location)}` : undefined} />
      </div>
    </div>
    <div className="card p-4">
      <h3 className="font-bold mb-4 text-lg">Financials</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DetailItem icon={DollarSign} label="Budget" value={fmtMoney(project.budget)} />
        <DetailItem icon={DollarSign} label="Tracked Expenses" value={fmtMoney(project.totalExpenses)} />
        <DetailItem icon={DollarSign} label="Budget Spent (Rollup)" value={fmtMoney(project.spent)} />
        <DetailItem icon={Clock} label="Total Hours" value={`${project.totalHours?.toFixed(2) ?? '-'} hrs`} />
      </div>
    </div>
  </div>
);

const PhotosTab = ({ items }: { items: Photo[] }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
    {items.length > 0 ? items.map(it => (
      <div key={it.id} className="card overflow-hidden group">
        <a href={it.url} target="_blank" rel="noopener noreferrer" className="block relative">
          <img src={it.url} alt={it.description} className="w-full h-40 object-cover bg-secondary group-hover:scale-105 transition-transform duration-300" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
          <p className="absolute bottom-0 left-0 p-2 text-xs text-foreground">{it.description}</p>
        </a>
      </div>
    )) : <p className="text-sm text-muted-foreground col-span-full">No photos for this project yet.</p>}
  </div>
);

const TabContent = ({ items, titleKey, valueKey, metaKeys = [], formatValue }: { items: any[], titleKey: string, valueKey?: string, metaKeys?: string[], formatValue?: (v: any) => string }) => (
  <div className="space-y-2">
    {items.length > 0 ? items.map(it => (
      <div key={it.id} className="flex justify-between items-center p-2 rounded-md bg-secondary/50">
        <div className="min-w-0">
          <p className="font-medium truncate">{it[titleKey]}</p>
          <p className="text-xs text-muted-foreground truncate">{metaKeys.map(k => it[k]).filter(Boolean).join(' • ')}</p>
        </div>
        {valueKey && <p className="font-semibold ml-2">{formatValue ? formatValue(it[valueKey]) : it[valueKey]}</p>}
      </div>
    )) : <p className="text-sm text-muted-foreground">No items to display.</p>}
  </div>
);