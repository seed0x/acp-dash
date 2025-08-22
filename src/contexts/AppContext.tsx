'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AppContextType, Notification, QueuedAction, AppFilters, Project } from '../types';

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState(new Set<string>());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const [pinnedProjects, setPinnedProjects] = useState(new Set<string>());
  const [pendingActions, setPendingActions] = useState<QueuedAction[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<AppFilters>({
    phase: 'all',
    assignee: null,
    dateRange: null,
    priority: null
  });

  // Notification system
  const notify = useCallback((message: string, type: Notification['type'] = 'info', duration: number = 3000): number => {
    const id = Date.now();
    const notification: Notification = { id, message, type, timestamp: new Date() };
    setNotifications(prev => [...prev, notification]);
    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, duration);
    }
    return id;
  }, []);

  // Offline queue management
  const queueAction = useCallback((action: Omit<QueuedAction, 'id'>) => {
    const newAction: QueuedAction = { 
      id: Date.now(),
      type: action.type,
      ...action
    };
    setPendingActions(prev => [...prev, newAction]);
    notify('Action queued - will sync when online', 'warning');
  }, [notify]);

  // Recent items tracking
  const addToRecent = useCallback((projectId: string) => {
    setRecentlyViewed(prev => {
      const filtered = prev.filter(id => id !== projectId);
      return [projectId, ...filtered].slice(0, 5);
    });
  }, []);

  // Pin/unpin projects
  const togglePin = useCallback((projectId: string) => {
    setPinnedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
        notify('Project unpinned', 'info');
      } else {
        newSet.add(projectId);
        notify('Project pinned', 'success');
      }
      return newSet;
    });
  }, [notify]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      notify('Back online - syncing...', 'success');
      // Process pending queue
      pendingActions.forEach(action => {
        // Execute queued actions
        console.log('Processing queued action:', action);
      });
      setPendingActions([]);
    };

    const handleOffline = () => {
      setIsOnline(false);
      notify('Working offline - changes will sync when connection restored', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingActions, notify]);

  const value: AppContextType = {
    projects, setProjects,
    selectedProjects, setSelectedProjects,
    notifications, notify,
    isOnline, queueAction,
    recentlyViewed, addToRecent,
    pinnedProjects, togglePin,
    searchHistory, setSearchHistory,
    activeFilters, setActiveFilters,
    pendingActions
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};