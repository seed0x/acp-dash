'use client'

import { useState, useCallback } from 'react';
import { Task } from '../types';
import { useNotifications } from '../contexts/NotificationContext';

export const useTasks = (projectId: string) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const { notify } = useNotifications();

  const addTask = useCallback(async (title: string, assignee?: string) => {
    if (!title.trim()) return;

    const optimisticTask: Task = {
      id: Date.now(),
      title,
      completed: false,
      assignee
    };

    // Optimistic update
    setTasks(prev => [...prev, optimisticTask]);

    try {
      // API call would go here
      // const response = await fetch(`/api/projects/${projectId}/tasks`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ title, assignee })
      // });
      
      notify('Task added', 'success');
    } catch (error) {
      // Rollback optimistic update
      setTasks(prev => prev.filter(t => t.id !== optimisticTask.id));
      notify('Failed to add task', 'error');
    }
  }, [projectId, notify]);

  const toggleTask = useCallback(async (taskId: string | number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Optimistic update
    setTasks(prev => 
      prev.map(t => 
        t.id === taskId 
          ? { ...t, completed: !t.completed }
          : t
      )
    );

    try {
      // API call would go here
      // const response = await fetch(`/api/tasks/${taskId}`, {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ completed: !task.completed })
      // });
      
      notify(`Task ${!task.completed ? 'completed' : 'reopened'}`, 'success');
    } catch (error) {
      // Rollback optimistic update
      setTasks(prev => 
        prev.map(t => 
          t.id === taskId 
            ? { ...t, completed: task.completed }
            : t
        )
      );
      notify('Failed to update task', 'error');
    }
  }, [tasks, notify]);

  const updateTask = useCallback(async (taskId: string | number, updates: Partial<Task>) => {
    try {
      setTasks(prev => 
        prev.map(task => 
          task.id === taskId 
            ? { ...task, ...updates }
            : task
        )
      );
      notify('Task updated', 'success');
    } catch (error) {
      notify('Failed to update task', 'error');
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