'use client'

import React from 'react';
import { Clock, Star, FolderOpen } from 'lucide-react';
import { PhotoUpload } from './PhotoUpload';
import { IssueReporter } from './IssueReporter';
import { OpenIssuesWidget } from '../dashboard/OpenIssuesWidget';
import { useApp } from '../../contexts/AppContext';

export const QuickActionsSidebar: React.FC = () => {
  const { recentlyViewed, projects } = useApp();

  const recentProjects = recentlyViewed.map(id =>
    projects.find(p => p.id === id)
  ).filter(Boolean);

  return (
    <div className="space-y-6">
      <PhotoUpload />
      <IssueReporter />
      <OpenIssuesWidget />
      
      {recentProjects.length > 0 && (
        <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recently Viewed
          </h3>
          <div className="space-y-2">
            {recentProjects.map(project => (
              <div
                key={project?.id}
                className="flex items-center gap-2 p-2 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <FolderOpen className="h-4 w-4 text-slate-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{project?.title}</p>
                  <p className="text-xs text-slate-400 truncate">{project?.subdivision}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Star className="h-5 w-5" />
          Quick Tips
        </h3>
        <div className="space-y-2 text-xs text-slate-400">
          <p>• Use Ctrl+K to focus search</p>
          <p>• Use Ctrl+N to report an issue</p>
          <p>• Pin important projects</p>
          <p>• Select multiple projects for bulk actions</p>
        </div>
      </div>
    </div>
  );
};