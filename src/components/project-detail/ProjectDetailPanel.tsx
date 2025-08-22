'use client'

import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { TaskList } from './TaskList';
import { IssueList } from './IssueList';
import { CommentThread } from './CommentThread';
import { PhotoGallery } from './PhotoGallery';
import { ProjectOverview } from './ProjectOverview';
import { useProject } from '../../hooks/useProject';
import { ErrorBoundary } from '../ErrorBoundary';

interface ProjectDetailPanelProps {
  projectId: string;
  onClose: () => void;
}

type TabType = 'overview' | 'tasks' | 'issues' | 'comments' | 'photos';

export const ProjectDetailPanel: React.FC<ProjectDetailPanelProps> = ({ projectId, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchWithinPanel, setSearchWithinPanel] = useState('');
  const { project, loading } = useProject(projectId);

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'tasks', label: 'Tasks', count: project?.tasks?.length },
    { id: 'issues', label: 'Issues', count: project?.issues?.length },
    { id: 'comments', label: 'Comments', count: project?.comments?.length },
    { id: 'photos', label: 'Photos', count: project?.photos?.length },
  ];

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

  if (!project) {
    return null;
  }

  return (
    <ErrorBoundary>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div 
          className="absolute right-0 h-full w-full max-w-2xl bg-slate-900 border-l border-slate-800 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-800">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">{project.title}</h2>
                  {project.subdivision && (
                    <p className="text-slate-400">{project.subdivision}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="side-panel-close p-2 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Search within panel */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchWithinPanel}
                  onChange={(e) => setSearchWithinPanel(e.target.value)}
                  placeholder="Search within this project..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Tabs */}
              <div className="flex space-x-1">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className="ml-1 text-xs opacity-75">({tab.count})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'overview' && <ProjectOverview project={project} />}
              {activeTab === 'tasks' && (
                <TaskList 
                  projectId={projectId} 
                  searchTerm={searchWithinPanel} 
                />
              )}
              {activeTab === 'issues' && (
                <IssueList 
                  projectId={projectId} 
                  searchTerm={searchWithinPanel} 
                />
              )}
              {activeTab === 'comments' && (
                <CommentThread 
                  projectId={projectId} 
                  searchTerm={searchWithinPanel} 
                />
              )}
              {activeTab === 'photos' && (
                <PhotoGallery 
                  projectId={projectId} 
                  searchTerm={searchWithinPanel} 
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};