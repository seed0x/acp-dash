'use client'

import React, { useState, useEffect } from 'react';
import { AlertCircle, Calendar, User, ArrowRight } from 'lucide-react';

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority?: string;
  assignee?: string;
  dueDate?: string;
  projectName?: string;
}

export const OpenIssuesWidget: React.FC = () => {
  const [openTasks, setOpenTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOpenTasks = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/tasks?openOnly=true');
        const data = await response.json();
        
        if (response.ok) {
          setOpenTasks(data.tasks || []);
          setError(null);
        } else {
          setError(data.error || 'Failed to fetch tasks');
          setOpenTasks([]);
        }
      } catch (err) {
        setError('Network error');
        setOpenTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOpenTasks();
  }, []);

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-slate-400';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return 'Overdue';
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays <= 7) return `${diffDays} days`;
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Open Issues
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="text-slate-400">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Open Issues
        </h3>
        <div className="text-center py-8">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4">
      <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        Open Issues ({openTasks.length})
      </h3>
      
      {openTasks.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-400">No open issues</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {openTasks.slice(0, 10).map(task => (
            <div
              key={task.id}
              className="p-3 bg-slate-700/30 border border-slate-600 rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-white truncate">
                    {task.title}
                  </h4>
                  {task.projectName && (
                    <p className="text-xs text-slate-400 truncate">
                      {task.projectName}
                    </p>
                  )}
                </div>
                {task.priority && (
                  <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(task.priority)} bg-slate-600/50`}>
                    {task.priority}
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  {task.assignee && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {task.assignee}
                    </span>
                  )}
                  {task.dueDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                </div>
                <span className="text-slate-500">{task.status}</span>
              </div>
            </div>
          ))}
          
          {openTasks.length > 10 && (
            <div className="text-center pt-2">
              <button className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mx-auto">
                View all {openTasks.length} issues
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};