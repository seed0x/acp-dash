// src/components/TaskDetailModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  X, Calendar, User, Flag, MessageSquare, Edit3, Save, 
  CheckSquare, Clock, FileText, Plus, AlertCircle 
} from 'lucide-react';
import type { Task, Comment } from '@/types/ops';

interface TaskDetailModalProps {
  taskId: string;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdate?: (task: Task) => void;
}

const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const STATUS_OPTIONS = ['Open', 'In Progress', 'Done', 'Closed'];

export default function TaskDetailModal({ taskId, isOpen, onClose, onTaskUpdate }: TaskDetailModalProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  // Form state for editing
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    status: '',
    priority: '',
    assignee: '',
    dueDate: ''
  });

  useEffect(() => {
    if (isOpen && taskId) {
      loadTaskDetails();
      loadComments();
    }
  }, [isOpen, taskId]);

  const loadTaskDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}`);
      if (!response.ok) {
        throw new Error('Failed to load task details');
      }
      const data = await response.json();
      setTask(data.task);
      setEditForm({
        title: data.task.title || '',
        description: data.task.description || '',
        status: data.task.status || 'Open',
        priority: data.task.priority || '',
        assignee: data.task.assignee || '',
        dueDate: data.task.dueDate || ''
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (e) {
      console.error('Failed to load comments:', e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/improvements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          ...editForm
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      // Reload task details
      await loadTaskDetails();
      setEditing(false);
      
      // Notify parent of update
      if (onTaskUpdate && task) {
        const updatedTask: Task = { 
          ...task, 
          ...editForm, 
          status: editForm.status as Task['status'],
          priority: editForm.priority as Task['priority'] || undefined
        };
        onTaskUpdate(updatedTask);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    setAddingComment(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment,
          author: 'Current User' // In real app, get from auth context
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      setNewComment('');
      await loadComments();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAddingComment(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch('/api/improvements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          status: newStatus
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      await loadTaskDetails();
      if (onTaskUpdate && task) {
        onTaskUpdate({ ...task, status: newStatus as Task['status'] });
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'Critical': return 'text-red-400 bg-red-500/20';
      case 'High': return 'text-orange-400 bg-orange-500/20';
      case 'Medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'Low': return 'text-green-400 bg-green-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'text-blue-400 bg-blue-500/20';
      case 'In Progress': return 'text-yellow-400 bg-yellow-500/20';
      case 'Done': return 'text-green-400 bg-green-500/20';
      case 'Closed': return 'text-gray-400 bg-gray-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <CheckSquare className="h-6 w-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Task Details</h2>
          </div>
          <div className="flex items-center gap-2">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex overflow-hidden h-[calc(90vh-80px)]">
          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-6 bg-slate-800 rounded animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-4 rounded-lg">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            ) : task ? (
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Title</label>
                  {editing ? (
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400"
                    />
                  ) : (
                    <h3 className="text-xl font-bold text-white">{task.title}</h3>
                  )}
                </div>

                {/* Status and Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Status</label>
                    {editing ? (
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      >
                        {STATUS_OPTIONS.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                        {!editing && (
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white"
                          >
                            {STATUS_OPTIONS.map(status => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Priority</label>
                    {editing ? (
                      <select
                        value={editForm.priority}
                        onChange={(e) => setEditForm(prev => ({ ...prev, priority: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      >
                        <option value="">No Priority</option>
                        {PRIORITY_OPTIONS.map(priority => (
                          <option key={priority} value={priority}>{priority}</option>
                        ))}
                      </select>
                    ) : task.priority ? (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(task.priority)}`}>
                        <Flag className="h-3 w-3 inline mr-1" />
                        {task.priority}
                      </span>
                    ) : (
                      <span className="text-slate-500">No priority set</span>
                    )}
                  </div>
                </div>

                {/* Assignee and Due Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Assignee</label>
                    {editing ? (
                      <input
                        type="text"
                        value={editForm.assignee}
                        onChange={(e) => setEditForm(prev => ({ ...prev, assignee: e.target.value }))}
                        placeholder="Assign to..."
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400"
                      />
                    ) : task.assignee ? (
                      <div className="flex items-center gap-2 text-white">
                        <User className="h-4 w-4 text-slate-400" />
                        {task.assignee}
                      </div>
                    ) : (
                      <span className="text-slate-500">Unassigned</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Due Date</label>
                    {editing ? (
                      <input
                        type="date"
                        value={editForm.dueDate}
                        onChange={(e) => setEditForm(prev => ({ ...prev, dueDate: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    ) : task.dueDate ? (
                      <div className="flex items-center gap-2 text-white">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-slate-500">No due date</span>
                    )}
                  </div>
                </div>

                {/* Project */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Project</label>
                  <div className="text-white">{task.projectName || 'No project'}</div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Description</label>
                  {editing ? (
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      placeholder="Task description..."
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 resize-none"
                    />
                  ) : task.description ? (
                    <div className="text-white whitespace-pre-wrap">{task.description}</div>
                  ) : (
                    <span className="text-slate-500">No description</span>
                  )}
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Created</label>
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Clock className="h-4 w-4" />
                      {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'Unknown'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Last Updated</label>
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Clock className="h-4 w-4" />
                      {task.updatedAt ? new Date(task.updatedAt).toLocaleDateString() : 'Unknown'}
                    </div>
                  </div>
                </div>

                {/* Edit Actions */}
                {editing && (
                  <div className="flex gap-3 pt-4 border-t border-slate-700">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg font-medium"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Comments Sidebar */}
          <div className="w-1/3 border-l border-slate-700 p-6 overflow-y-auto bg-slate-950/50">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-slate-400" />
              <h3 className="font-semibold text-white">Comments</h3>
              <span className="text-sm text-slate-400">({comments.length})</span>
            </div>

            {/* Add Comment */}
            <div className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 resize-none text-sm"
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim() || addingComment}
                className="mt-2 w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg font-medium text-sm"
              >
                {addingComment ? 'Adding...' : 'Add Comment'}
              </button>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length > 0 ? (
                comments.map(comment => (
                  <div key={comment.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{comment.author}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No comments yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}