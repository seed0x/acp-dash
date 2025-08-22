'use client'

import React, { useState, useMemo } from 'react';
import { AlertTriangle, Plus, Trash2, ExternalLink } from 'lucide-react';
import { Issue } from '../../types';
import { useNotifications } from '../../contexts/NotificationContext';

interface IssueListProps {
  projectId: string;
  searchTerm: string;
}

export const IssueList: React.FC<IssueListProps> = ({ projectId, searchTerm }) => {
  const { notify } = useNotifications();
  const [issues, setIssues] = useState<Issue[]>([
    { id: 1, title: 'Leak in bathroom', status: 'Open', priority: 'High' },
    { id: 2, title: 'Missing permits', status: 'In Progress', priority: 'Medium' }
  ]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIssue, setNewIssue] = useState({
    title: '',
    description: '',
    priority: 'medium' as const
  });

  const filteredIssues = useMemo(() => {
    if (!searchTerm) return issues;
    const term = searchTerm.toLowerCase();
    return issues.filter(issue => 
      issue.title.toLowerCase().includes(term) ||
      issue.description?.toLowerCase().includes(term) ||
      issue.priority?.toLowerCase().includes(term)
    );
  }, [issues, searchTerm]);

  const handleAddIssue = async () => {
    if (!newIssue.title.trim()) {
      notify('Please enter an issue title', 'warning');
      return;
    }

    const issue: Issue = {
      id: Date.now(),
      title: newIssue.title,
      description: newIssue.description,
      priority: newIssue.priority,
      status: 'Open'
    };

    setIssues(prev => [...prev, issue]);
    setNewIssue({ title: '', description: '', priority: 'medium' });
    setShowAddForm(false);
    notify('Issue added successfully', 'success');
  };

  const deleteIssue = (issueId: string | number) => {
    setIssues(prev => prev.filter(i => i.id !== issueId));
    notify('Issue deleted', 'success');
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
      case 'critical':
        return 'text-red-400 bg-red-500/20';
      case 'medium':
        return 'text-orange-400 bg-orange-500/20';
      case 'low':
        return 'text-green-400 bg-green-500/20';
      default:
        return 'text-slate-400 bg-slate-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'text-red-400 bg-red-500/20';
      case 'in progress':
        return 'text-orange-400 bg-orange-500/20';
      case 'resolved':
      case 'closed':
        return 'text-green-400 bg-green-500/20';
      default:
        return 'text-slate-400 bg-slate-500/20';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">
          Issues ({filteredIssues.length})
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Issue
        </button>
      </div>

      {showAddForm && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
          <input
            type="text"
            value={newIssue.title}
            onChange={(e) => setNewIssue(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Issue title..."
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 text-sm"
          />
          <textarea
            value={newIssue.description}
            onChange={(e) => setNewIssue(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Issue description..."
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 text-sm resize-none"
            rows={3}
          />
          <select
            value={newIssue.priority}
            onChange={(e) => setNewIssue(prev => ({ ...prev, priority: e.target.value as any }))}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
            <option value="critical">Critical</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleAddIssue}
              className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
            >
              Add Issue
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewIssue({ title: '', description: '', priority: 'medium' });
              }}
              className="px-3 py-1.5 bg-slate-600 text-white rounded text-sm hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filteredIssues.map(issue => (
          <div key={issue.id} className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-400" />
                <h4 className="font-medium text-white">{issue.title}</h4>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-1 text-slate-400 hover:text-blue-400 transition-colors">
                  <ExternalLink className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteIssue(issue.id)}
                  className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {issue.description && (
              <p className="text-slate-300 text-sm mb-3">{issue.description}</p>
            )}

            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(issue.status)}`}>
                {issue.status}
              </span>
              {issue.priority && (
                <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(issue.priority)}`}>
                  {issue.priority} Priority
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredIssues.length === 0 && (
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">
            {searchTerm ? 'No issues match your search' : 'No issues reported yet'}
          </p>
        </div>
      )}
    </div>
  );
};