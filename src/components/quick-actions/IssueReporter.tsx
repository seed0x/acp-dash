'use client'

import React, { useState } from 'react';
import { AlertTriangle, Send, Hash } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useNotifications } from '../../contexts/NotificationContext';

export const IssueReporter: React.FC = () => {
  const { projects } = useApp();
  const { notify } = useNotifications();
  const [issueText, setIssueText] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [priority, setPriority] = useState('medium');

  const handleSubmitIssue = async () => {
    if (!issueText.trim()) {
      notify('Please enter an issue description', 'warning');
      return;
    }
    
    if (!selectedProject) {
      notify('Please select a project', 'warning');
      return;
    }

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: selectedProject,
          title: issueText,
          category: 'Issue',
          priority
        }),
      });

      const result = await response.json();

      if (response.ok) {
        notify('Issue reported and task created successfully!', 'success');
        setIssueText('');
        setSelectedProject('');
        setPriority('medium');
      } else {
        notify(result.error || 'Failed to create task', 'error');
      }
    } catch (error) {
      notify('Network error - please try again', 'error');
    }
  };

  return (
    <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4">
      <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" />
        Report Issue
      </h3>
      
      <div className="space-y-3">
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
        >
          <option value="">Select Project</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {p.title} - {p.subdivision}
            </option>
          ))}
        </select>

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
        >
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
          <option value="critical">Critical</option>
        </select>

        <textarea
          id="quick-issue-input"
          value={issueText}
          onChange={(e) => setIssueText(e.target.value)}
          placeholder="Describe the issue..."
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 text-sm resize-none"
          rows={3}
        />

        <button
          onClick={handleSubmitIssue}
          disabled={!issueText.trim() || !selectedProject}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="h-4 w-4" />
          Report Issue
        </button>

        <div className="text-xs text-slate-400">
          <p className="flex items-center gap-1">
            <Hash className="h-3 w-3" />
            Tip: Use Ctrl+N to quickly focus this input
          </p>
        </div>
      </div>
    </div>
  );
};