'use client'

import { useState, useCallback } from 'react';
import { Comment } from '../types';
import { useNotifications } from '../contexts/NotificationContext';

export const useComments = (projectId: string) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const { notify } = useNotifications();

  const addComment = useCallback(async (text: string, author: string = 'Current User') => {
    if (!text.trim()) return;

    const optimisticComment: Comment = {
      id: Date.now(),
      text,
      author,
      createdAt: new Date().toISOString()
    };

    // Optimistic update
    setComments(prev => [...prev, optimisticComment]);

    try {
      // API call would go here
      // const response = await fetch(`/api/projects/${projectId}/comments`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ text, author })
      // });
      
      notify('Comment added', 'success');
    } catch (error) {
      // Rollback optimistic update
      setComments(prev => prev.filter(c => c.id !== optimisticComment.id));
      notify('Failed to add comment', 'error');
    }
  }, [projectId, notify]);

  const updateComment = useCallback(async (commentId: string | number, text: string) => {
    try {
      setComments(prev => 
        prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, text }
            : comment
        )
      );
      notify('Comment updated', 'success');
    } catch (error) {
      notify('Failed to update comment', 'error');
    }
  }, [notify]);

  const deleteComment = useCallback(async (commentId: string | number) => {
    try {
      setComments(prev => prev.filter(c => c.id !== commentId));
      notify('Comment deleted', 'success');
    } catch (error) {
      notify('Failed to delete comment', 'error');
    }
  }, [notify]);

  return {
    comments,
    loading,
    addComment,
    updateComment,
    deleteComment
  };
};