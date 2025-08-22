'use client'

import React, { useState, useEffect } from 'react';
import { Header } from '../Header';
import { SearchBar } from './SearchBar';
import { ProjectGrid } from './ProjectGrid';
import { QuickActionsSidebar } from '../quick-actions/QuickActionsSidebar';
import { ProjectDetailPanel } from '../project-detail/ProjectDetailPanel';
import { Project, KPIs } from '../../types';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useNotifications } from '../../contexts/NotificationContext';
import { useApp } from '../../contexts/AppContext';

interface DashboardProps {
  kpis: KPIs;
}

export const Dashboard: React.FC<DashboardProps> = ({ kpis }) => {
  const [viewingProjectId, setViewingProjectId] = useState<string | null>(null);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { notify } = useNotifications();
  const { projects, setProjects } = useApp();

  useKeyboardShortcuts();

  // Function to map API response to Project interface
  const mapApiDataToProject = (apiItem: any): Project => ({
    id: apiItem.id,
    title: apiItem.title,
    subdivision: apiItem.subdivision,
    status: apiItem.status,
    client: apiItem.client,
    builder: apiItem.builder,
    location: apiItem.location,
    deadline: apiItem.deadline,
    budget: apiItem.budget,
    // Note: jobNumber is not provided by the API, so we omit it
    // Additional fields like tasks, issues, comments, photos are not included in board view
  });

  // Fetch projects data from API
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/projects/board');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch projects: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        // Map API response items to Project interface
        const mappedProjects = data.items.map(mapApiDataToProject);
        setProjects(mappedProjects);
        setFilteredProjects(mappedProjects);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load projects';
        setError(errorMessage);
        console.error('Error fetching projects:', err);
        notify(errorMessage, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [notify]);

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
            
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                  <p className="text-slate-400">Loading projects...</p>
                </div>
              </div>
            )}
            
            {error && !loading && (
              <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
                <p className="text-red-400">
                  <strong>Error:</strong> {error}
                </p>
                <p className="text-slate-400 text-sm mt-2">
                  Please try refreshing the page or contact support if the issue persists.
                </p>
              </div>
            )}
            
            {!loading && !error && (
              <ProjectGrid 
                projects={filteredProjects} 
                onProjectClick={setViewingProjectId}
              />
            )}
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