'use client'

import React, { useState, useMemo } from 'react';
import { MessageSquare, Send, User, Clock } from 'lucide-react';
import { useComments } from '../../hooks/useComments';

interface CommentThreadProps {
  projectId: string;
  searchTerm: string;
}

export const CommentThread: React.FC<CommentThreadProps> = ({ projectId, searchTerm }) => {
  const { comments, addComment } = useComments(projectId);
  const [newComment, setNewComment] = useState('');

  const filteredComments = useMemo(() => {
    if (!searchTerm) return comments;
    const term = searchTerm.toLowerCase();
    return comments.filter(comment => 
      comment.text.toLowerCase().includes(term) ||
      comment.author.toLowerCase().includes(term)
    );
  }, [comments, searchTerm]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    await addComment(newComment);
    setNewComment('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleAddComment();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments ({filteredComments.length})
        </h3>
      </div>

      {/* Add Comment Form */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Add a comment... (Ctrl+Enter to send)"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
        <div className="flex justify-between items-center mt-3">
          <p className="text-xs text-slate-400">
            Use Ctrl+Enter to send quickly
          </p>
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-3">
        {filteredComments.map(comment => (
          <div key={comment.id} className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-slate-300" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-white">{comment.author}</span>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="h-3 w-3" />
                    {formatDate(comment.createdAt)}
                  </div>
                </div>
                
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {comment.text}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredComments.length === 0 && (
        <div className="text-center py-8">
          <MessageSquare className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">
            {searchTerm ? 'No comments match your search' : 'No comments yet'}
          </p>
          {!searchTerm && (
            <p className="text-slate-500 text-sm mt-1">
              Start a conversation about this project
            </p>
          )}
        </div>
      )}
    </div>
  );
};