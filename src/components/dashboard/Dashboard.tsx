'use client'

import React, { useState } from 'react';
import { Header } from '../Header';
import { SearchBar } from './SearchBar';
import { ProjectGrid } from './ProjectGrid';
import { QuickActionsSidebar } from '../quick-actions/QuickActionsSidebar';
import { ProjectDetailPanel } from '../project-detail/ProjectDetailPanel';
import { Project, KPIs } from '../../types';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

interface DashboardProps {
  kpis: KPIs;
}

export const Dashboard: React.FC<DashboardProps> = ({ kpis }) => {
  const [viewingProjectId, setViewingProjectId] = useState<string | null>(null);
  const [projects] = useState<Project[]>([
    { id: '1', title: 'Apple Ln', subdivision: 'Oak Ridge', status: 'Bidding', client: 'John Smith', builder: 'ABC Construction', location: '123 Apple Ln', jobNumber: '2024-001' },
    { id: '2', title: 'Pine St', subdivision: 'Westview', status: 'Post & Beam', client: 'Jane Doe', builder: 'XYZ Builders', location: '456 Pine St', jobNumber: '2024-002' },
    { id: '3', title: 'Oak Grove', subdivision: 'Eastside', status: 'Trim', client: 'Bob Johnson', builder: 'DEF Construction', location: '789 Oak Grove', jobNumber: '2024-003' },
  ]);
  const [filteredProjects, setFilteredProjects] = useState(projects);

  useKeyboardShortcuts();

  const handleSearch = (searchTerm: string) => {
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

  return (
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
    </div>
  );
};