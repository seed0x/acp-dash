'use client'

import { useState, useCallback } from 'react';
import { Task } from '../types';
import { useNotifications } from '../contexts/NotificationContext';

export const useTasks = (projectId: string) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const { notify } = useNotifications();

  const addTask = useCallback(async (
    title: string, 
    assignee?: string, 
    priority?: string, 
    dueDate?: string
  ) => {
    if (!title.trim()) return;

    const optimisticTask: Task = {
      id: Date.now(),
      title,
      completed: false,
      assignee,
      priority,
      dueDate
    };

    // Optimistic update
    setTasks(prev => [...prev, optimisticTask]);

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId, 
          title, 
          assignee,
          priority,
          dueDate,
          status: 'Not started'
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create task');
      }
      
      const result = await response.json();
      
      // Update with real ID from server
      setTasks(prev => 
        prev.map(t => 
          t.id === optimisticTask.id 
            ? { ...t, id: result.id }
            : t
        )
      );
      
      notify('Task added', 'success');
    } catch (error) {
      // Rollback optimistic update
      setTasks(prev => prev.filter(t => t.id !== optimisticTask.id));
      notify(error instanceof Error ? error.message : 'Failed to add task', 'error');
    }
  }, [projectId, notify]);

  const toggleTask = useCallback(async (taskId: string | number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newCompletedState = !task.completed;

    // Optimistic update
    setTasks(prev => 
      prev.map(t => 
        t.id === taskId 
          ? { ...t, completed: newCompletedState }
          : t
      )
    );

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          completed: newCompletedState,
          status: newCompletedState ? 'Done' : 'In progress'
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update task');
      }
      
      // If task is now completed, show additional notification about moving to improvements
      if (newCompletedState) {
        notify('Task completed and moved to improvements!', 'success');
      } else {
        notify('Task reopened', 'success');
      }
    } catch (error) {
      // Rollback optimistic update
      setTasks(prev => 
        prev.map(t => 
          t.id === taskId 
            ? { ...t, completed: task.completed }
            : t
        )
      );
      notify(error instanceof Error ? error.message : 'Failed to update task', 'error');
    }
  }, [tasks, notify]);

  const updateTask = useCallback(async (taskId: string | number, updates: Partial<Task>) => {
    // Optimistic update
    setTasks(prev => 
      prev.map(task => 
        task.id === taskId 
          ? { ...task, ...updates }
          : task
      )
    );

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignee: updates.assignee,
          status: updates.completed ? 'Done' : (updates as any).status,
          completed: updates.completed
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update task');
      }
      
      notify('Task updated', 'success');
    } catch (error) {
      // Rollback optimistic update - we'd need to fetch the original state
      notify(error instanceof Error ? error.message : 'Failed to update task', 'error');
    }
  }, [notify]);

  const deleteTask = useCallback(async (taskId: string | number) => {
    try {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      notify('Task deleted', 'success');
    } catch (error) {
      notify('Failed to delete task', 'error');
    }
  }, [notify]);

  return {
    tasks,
    loading,
    addTask,
    toggleTask,
    updateTask,
    deleteTask
  };
};