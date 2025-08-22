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
      const response = await fetch(`/api/projects/${id}/full`);
      const data = await response.json();
      
      if (response.ok) {
        setProject(data);
      } else {
        notify('Failed to load project: ' + (data.error || 'Unknown error'), 'error');
      }
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
      const response = await fetch(`/api/projects/${project.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        setProject(prev => prev ? { ...prev, status } : null);
        notify('Project status updated', 'success');
      } else {
        const data = await response.json();
        notify('Failed to update project status: ' + (data.error || 'Unknown error'), 'error');
      }
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