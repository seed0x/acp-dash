'use client'

import { useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';

export const useKeyboardShortcuts = () => {
  const { notify } = useNotifications();
  
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Command/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('global-search') as HTMLInputElement;
        searchInput?.focus();
      }
      
      // Command/Ctrl + N for new issue
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        const issueInput = document.getElementById('quick-issue-input') as HTMLInputElement;
        issueInput?.focus();
      }
      
      // Escape to close panels
      if (e.key === 'Escape') {
        const closeButton = document.querySelector('.side-panel-close') as HTMLButtonElement;
        closeButton?.click();
      }
      
      // Command/Ctrl + B for bulk actions
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        notify('Use checkboxes to select multiple projects for bulk actions', 'info');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [notify]);
};