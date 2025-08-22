'use client'

import React, { useState, useMemo, useEffect } from 'react';
import { AlertTriangle, Plus, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { Issue } from '../../types';
import { useNotifications } from '../../contexts/NotificationContext';

interface IssueListProps {
  projectId: string;
  searchTerm: string;
}

export const IssueList: React.FC<IssueListProps> = ({ projectId, searchTerm }) => {
  const { notify } = useNotifications();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIssue, setNewIssue] = useState({
    title: '',
    description: '',
    priority: 'Medium' as const
  });

  // Fetch issues for the project
  useEffect(() => {
    const fetchIssues = async () => {
      if (!projectId) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/projects/${projectId}/full`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch project issues: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.improvements && Array.isArray(data.improvements)) {
          setIssues(data.improvements.map((imp: any) => ({
            id: imp.id,
            title: imp.title,
            status: imp.status || 'Open',
            priority: imp.priority || 'Medium',
            description: imp.description,
            assignee: imp.assignee,
            projectId,
            projectName: data.project?.title
          })));
        } else if (data.issues && Array.isArray(data.issues)) {
          // Legacy format
          setIssues(data.issues);
        } else {
          setIssues([]);
        }
      } catch (err) {
        console.error('Error fetching project issues:', err);
        notify('Failed to load project issues', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchIssues();
  }, [projectId, notify]);

  const filteredIssues = useMemo(() => {
    if (!searchTerm) return issues;
    const term = searchTerm.toLowerCase();
    return issues.filter(issue => 
      issue.title.toLowerCase().includes(term) ||
      issue.description?.toLowerCase().includes(term) ||
      issue.priority?.toLowerCase().includes(term) ||
      issue.assignee?.toLowerCase().includes(term)
    );
  }, [issues, searchTerm]);

  const handleAddIssue = async () => {
    if (!newIssue.title.trim()) {
      notify('Please enter an issue title', 'warning');
      return;
    }

    try {
      const response = await fetch('/api/improvements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          title: newIssue.title.trim(),
          description: newIssue.description.trim(),
          priority: newIssue.priority,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create issue');
      }

      const data = await response.json();
      
      setIssues(prev => [...prev, {
        id: data.id,
        title: newIssue.title.trim(),
        description: newIssue.description.trim(),
        status: 'Open',
        priority: newIssue.priority,
        projectId
      }]);
      
      setNewIssue({
        title: '',
        description: '',
        priority: 'Medium'
      });
      
      setShowAddForm(false);
      notify('Issue created successfully', 'success');
    } catch (err) {
      console.error('Error creating issue:', err);
      notify('Failed to create issue', 'error');
    }
  };

  const handleDeleteIssue = async (issueId: string | number) => {
    if (!confirm('Are you sure you want to delete this issue?')) {
      return;
    }

    try {
      const response = await fetch(`/api/improvements/${issueId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete issue');
      }

      setIssues(prev => prev.filter(issue => issue.id !== issueId));
      notify('Issue deleted successfully', 'success');
    } catch (err) {
      console.error('Error deleting issue:', err);
      notify('Failed to delete issue', 'error');
    }
  };

  const getPriorityColor = (priority?: string) => {
    if (!priority) return 'text-slate-400 bg-slate-800';
    switch (priority.toLowerCase()) {
      case 'high':
        return 'text-red-400 bg-red-950/30';
      case 'medium':
        return 'text-amber-400 bg-amber-950/30';
      case 'low':
        return 'text-green-400 bg-green-950/30';
      default:
        return 'text-slate-400 bg-slate-800';
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'border-slate-700';
    switch (status.toLowerCase()) {
      case 'open':
        return 'border-amber-600/30';
      case 'in progress':
        return 'border-blue-600/30';
      case 'closed':
      case 'complete':
      case 'done':
        return 'border-emerald-600/30';
      default:
        return 'border-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white">Issues ({filteredIssues.length})</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded"
        >
          <Plus className="h-3 w-3" />
          New Issue
        </button>
      </div>

      {showAddForm && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
          <input
            type="text"
            value={newIssue.title}
            onChange={e => setNewIssue(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Issue title"
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm"
          />
          <textarea
            value={newIssue.description}
            onChange={e => setNewIssue(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Description (optional)"
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm h-20 resize-none"
          />
          <div className="flex justify-between">
            <select
              value={newIssue.priority}
              onChange={e => setNewIssue(prev => ({ ...prev, priority: e.target.value as any }))}
              className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm"
            >
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1 text-xs border border-slate-600 rounded hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddIssue}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500"
              >
                Add Issue
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredIssues.length > 0 ? (
        <div className="space-y-3">
          {filteredIssues.map(issue => (
            <div
              key={issue.id}
              className={`border ${getStatusColor(issue.status)} bg-slate-800/30 rounded-lg p-3 flex items-start gap-3`}
            >
              <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${getPriorityColor(issue.priority).split(' ')[0]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between">
                  <h3 className="font-medium text-white">{issue.title}</h3>
                  <button
                    onClick={() => handleDeleteIssue(issue.id)}
                    className="text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {issue.description && (
                  <p className="text-sm text-slate-400 mt-1">{issue.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(issue.priority)}`}>
                    {issue.priority || 'No Priority'}
                  </span>
                  <span className="text-xs text-slate-400">{issue.status || 'Open'}</span>
                  {issue.assignee && (
                    <span className="text-xs text-slate-400">Assigned to: {issue.assignee}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-800/30 rounded-lg border border-slate-700">
          <AlertTriangle className="h-12 w-12 text-slate-600 mb-3" />
          <p className="text-slate-400 mb-1">No issues found</p>
          <p className="text-xs text-slate-500">Issues and improvement requests will appear here</p>
        </div>
      )}
    </div>
  );
};
