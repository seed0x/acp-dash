'use client'

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Calendar, User, Clock } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';

interface OpenTask {
  id: string;
  title: string;
  status?: string;
  priority?: string;
  assignee?: string;
  description?: string;
  projectName?: string;
  dueDate?: string;
  completed: boolean;
}

export const OpenIssuesWidget: React.FC = () => {
  const { notify } = useNotifications();
  const [tasks, setTasks] = useState<OpenTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOpenTasks = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/tasks?openOnly=true');
        if (!response.ok) {
          throw new Error(`Failed to fetch tasks: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        
        setTasks(data.tasks || []);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load open issues';
        setError(errorMessage);
        console.error('Error fetching open tasks:', err);
        notify(errorMessage, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchOpenTasks();
  }, [notify]);

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
      
      if (diffDays < 0) {
        return <span className="text-red-400">Overdue</span>;
      } else if (diffDays === 0) {
        return <span className="text-orange-400">Due today</span>;
      } else if (diffDays <= 3) {
        return <span className="text-yellow-400">Due in {diffDays} days</span>;
      } else {
        return <span className="text-slate-400">Due {date.toLocaleDateString()}</span>;
      }
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Open Issues
        </h3>
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Open Issues
        </h3>
        <div className="text-red-400 text-sm">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4">
      <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" />
        Open Issues ({tasks.length})
      </h3>
      
      {tasks.length === 0 ? (
        <div className="text-center py-4">
          <AlertTriangle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No open issues</p>
          <p className="text-slate-500 text-xs mt-1">All tasks are complete!</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {tasks.slice(0, 10).map(task => (
            <div 
              key={task.id} 
              className="p-3 bg-slate-900/30 rounded-lg border border-slate-600/50 hover:border-slate-500 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="font-medium text-white text-sm line-clamp-1">
                  {task.title}
                </h4>
                {task.priority && (
                  <span className={`text-xs ${getPriorityColor(task.priority)} font-medium`}>
                    {task.priority}
                  </span>
                )}
              </div>
              
              {task.projectName && (
                <p className="text-slate-400 text-xs mb-1">{task.projectName}</p>
              )}
              
              <div className="flex items-center gap-4 text-xs text-slate-500">
                {task.assignee && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{task.assignee}</span>
                  </div>
                )}
                
                {task.dueDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(task.dueDate)}
                  </div>
                )}
                
                {task.status && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{task.status}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {tasks.length > 10 && (
            <div className="text-center pt-2">
              <p className="text-slate-400 text-xs">
                Showing 10 of {tasks.length} open issues
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};