'use client'

import React, { useState } from 'react';
import { Clock, FolderOpen, Camera, AlertCircle, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { PhotoUpload } from './PhotoUpload';
import { IssueReporter } from './IssueReporter';
import { OpenIssuesWidget } from '../dashboard/OpenIssuesWidget';
import { useApp } from '../../contexts/AppContext';

export const QuickActionsSidebar: React.FC = () => {
  const { recentlyViewed, projects } = useApp();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const recentProjects = recentlyViewed.map(id =>
    projects.find(p => p.id === id)
  ).filter(Boolean);

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-full'} transition-all duration-300 relative`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -left-3 top-1/2 transform -translate-y-1/2 bg-slate-700 rounded-full p-1.5 shadow-lg z-10 md:hidden"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
      
      <div className="space-y-6">
        {isCollapsed ? (
          // Collapsed view - just icons
          <div className="flex flex-col items-center space-y-8 pt-4">
            <button className="p-3 bg-blue-500 rounded-full">
              <Camera className="h-6 w-6 text-white" />
            </button>
            <button className="p-3 bg-amber-500 rounded-full">
              <AlertCircle className="h-6 w-6 text-white" />
            </button>
            <button className="p-3 bg-slate-700 rounded-full">
              <Menu className="h-6 w-6 text-white" />
            </button>
          </div>
        ) : (
          // Expanded view - full components
          <>
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
          </>
        )}
      </div>
    </div>
  );
};
