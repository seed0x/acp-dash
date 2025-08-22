'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Pin, PinOff, User, Building, MapPin, Calendar, 
  Archive, CheckCheck
} from 'lucide-react';
import { Project } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { useNotifications } from '../../contexts/NotificationContext';

interface ProjectGridProps {
  projects: Project[];
  onProjectClick: (projectId: string) => void;
}

interface ProjectCardProps {
  project: Project;
  isSelected: boolean;
  isPinned: boolean;
  onSelect: (projectId: string) => void;
  onPin: (projectId: string) => void;
  onProjectClick: (projectId: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  isSelected,
  isPinned,
  onSelect,
  onPin,
  onProjectClick
}) => {
  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-slate-700 text-slate-300';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('bidding')) return 'bg-blue-500/20 border-blue-500/30 text-blue-300';
    if (statusLower.includes('progress') || statusLower.includes('beam')) return 'bg-orange-500/20 border-orange-500/30 text-orange-300';
    if (statusLower.includes('trim')) return 'bg-purple-500/20 border-purple-500/30 text-purple-300';
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
                className="text-lg font-semibold text-white cursor-pointer hover:text-blue-400 transition-colors"
                onClick={() => onProjectClick(project.id)}
              >
                {project.title}
              </h3>
              {project.subdivision && (
                <p className="text-sm text-slate-400">{project.subdivision}</p>
              )}
            </div>
            <button
              onClick={() => onPin(project.id)}
              className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
            >
              {isPinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
            </button>
          </div>

          {project.status && (
            <div className="mb-3">
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                {project.status}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            {project.client && (
              <div className="flex items-center gap-2 text-slate-300">
                <User className="h-4 w-4 text-slate-400" />
                <span className="truncate">{project.client}</span>
              </div>
            )}
            {project.builder && (
              <div className="flex items-center gap-2 text-slate-300">
                <Building className="h-4 w-4 text-slate-400" />
                <span className="truncate">{project.builder}</span>
              </div>
            )}
            {project.location && (
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span className="truncate">{project.location}</span>
              </div>
            )}
            {project.jobNumber && (
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="truncate">{project.jobNumber}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProjectGrid: React.FC<ProjectGridProps> = ({ projects, onProjectClick }) => {
  const { selectedProjects, setSelectedProjects, pinnedProjects, togglePin } = useApp();
  const { notify } = useNotifications();
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

  const handleBulkStatusChange = (status: string) => {
    notify(`Updating ${selectedProjects.size} projects to ${status}...`, 'info');
    // API call would go here
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
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors flex items-center gap-1"
            >
              <CheckCheck className="h-4 w-4" />
              Mark Complete
            </button>
            <button
              onClick={() => handleBulkStatusChange('Archive')}
              className="px-3 py-1.5 bg-slate-600 text-white rounded-lg text-sm hover:bg-slate-700 transition-colors flex items-center gap-1"
            >
              <Archive className="h-4 w-4" />
              Archive
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">
          Projects ({projects.length})
        </h2>
        {projects.length > 0 && (
          <button
            onClick={handleSelectAll}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            {selectedProjects.size === projects.length ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      <div className="grid gap-4">
        {sortedProjects.map(project => (
          <ProjectCard
            key={project.id}
            project={project}
            isSelected={selectedProjects.has(project.id)}
            isPinned={pinnedProjects.has(project.id)}
            onSelect={(id) => {
              const newSelected = new Set(selectedProjects);
              if (newSelected.has(id)) {
                newSelected.delete(id);
              } else {
                newSelected.add(id);
              }
              setSelectedProjects(newSelected);
            }}
            onPin={togglePin}
            onProjectClick={onProjectClick}
          />
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400">No projects found</p>
        </div>
      )}
    </div>
  );
};