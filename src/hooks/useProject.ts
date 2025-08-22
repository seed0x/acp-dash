'use client'

import { useState, useEffect, useCallback } from 'react';
import { Project, Task, Comment } from '../types';
import { useNotifications } from '../contexts/NotificationContext';

export const useProject = (projectId: string | null) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const { notify } = useNotifications();

  const loadProject = useCallback(async (id: string) => {
    if (!id) return;
    
    setLoading(true);
    try {
      // In a real app, this would be an API call
      // For now, using mock data
      setProject({
        id,
        title: 'Sample Project',
        client: 'John Doe',
        builder: 'ABC Construction',
        status: 'In Progress',
        jobNumber: '2024-001',
        tasks: [
          { id: 1, title: 'Install rough plumbing', completed: false, assignee: 'Mike' },
          { id: 2, title: 'Frame walls', completed: true, assignee: 'Steve' }
        ],
        issues: [
          { id: 1, title: 'Leak in bathroom', status: 'Open', priority: 'High' }
        ],
        comments: [
          { id: 1, text: 'Waiting on permits', author: 'Admin', createdAt: '2024-01-15' }
        ],
        photos: [
          { id: 1, url: '/api/placeholder/400/300', description: 'Foundation work', date: '2024-01-10' }
        ]
      });
    } catch (error) {
      notify('Failed to load project', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId, loadProject]);

  const updateProjectStatus = useCallback(async (status: string) => {
    if (!project) return;
    
    try {
      // API call would go here
      setProject(prev => prev ? { ...prev, status } : null);
      notify('Project status updated', 'success');
    } catch (error) {
      notify('Failed to update project status', 'error');
    }
  }, [project, notify]);

  return {
    project,
    loading,
    updateProjectStatus,
    refetch: () => projectId && loadProject(projectId)
  };
};