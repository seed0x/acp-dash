'use client'

import React, { useState, useMemo } from 'react';
import { CheckSquare, Square, User, Plus, Trash2, Edit3 } from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import { useNotifications } from '../../contexts/NotificationContext';

interface TaskListProps {
  projectId: string;
  searchTerm: string;
}

export const TaskList: React.FC<TaskListProps> = ({ projectId, searchTerm }) => {
  const { tasks, addTask, toggleTask, deleteTask } = useTasks(projectId);
  const { notify } = useNotifications();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const filteredTasks = useMemo(() => {
    if (!searchTerm) return tasks;
    const term = searchTerm.toLowerCase();
    return tasks.filter(task => 
      task.title.toLowerCase().includes(term) ||
      task.assignee?.toLowerCase().includes(term)
    );
  }, [tasks, searchTerm]);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) {
      notify('Please enter a task title', 'warning');
      return;
    }

    await addTask(newTaskTitle, newTaskAssignee || undefined);
    setNewTaskTitle('');
    setNewTaskAssignee('');
    setShowAddForm(false);
  };

  const completedTasks = filteredTasks.filter(t => t.completed);
  const pendingTasks = filteredTasks.filter(t => !t.completed);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">
          Tasks ({filteredTasks.length})
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Task
        </button>
      </div>

      {showAddForm && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Task title..."
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 text-sm"
          />
          <input
            type="text"
            value={newTaskAssignee}
            onChange={(e) => setNewTaskAssignee(e.target.value)}
            placeholder="Assignee (optional)..."
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddTask}
              className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
            >
              Add Task
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewTaskTitle('');
                setNewTaskAssignee('');
              }}
              className="px-3 py-1.5 bg-slate-600 text-white rounded text-sm hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pending Tasks */}
      {pendingTasks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-300">
            Pending ({pendingTasks.length})
          </h4>
          {pendingTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={() => toggleTask(task.id)}
              onDelete={() => deleteTask(task.id)}
            />
          ))}
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-300">
            Completed ({completedTasks.length})
          </h4>
          {completedTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={() => toggleTask(task.id)}
              onDelete={() => deleteTask(task.id)}
            />
          ))}
        </div>
      )}

      {filteredTasks.length === 0 && (
        <div className="text-center py-8">
          <p className="text-slate-400">
            {searchTerm ? 'No tasks match your search' : 'No tasks yet'}
          </p>
        </div>
      )}
    </div>
  );
};

interface TaskItemProps {
  task: {
    id: string | number;
    title: string;
    completed: boolean;
    assignee?: string;
  };
  onToggle: () => void;
  onDelete: () => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onDelete }) => {
  return (
    <div className={`
      flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700
      ${task.completed ? 'opacity-60' : ''}
    `}>
      <button
        onClick={onToggle}
        className="text-blue-400 hover:text-blue-300 transition-colors"
      >
        {task.completed ? (
          <CheckSquare className="h-5 w-5" />
        ) : (
          <Square className="h-5 w-5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-white ${task.completed ? 'line-through' : ''}`}>
          {task.title}
        </p>
        {task.assignee && (
          <div className="flex items-center gap-1 mt-1">
            <User className="h-3 w-3 text-slate-400" />
            <span className="text-xs text-slate-400">{task.assignee}</span>
          </div>
        )}
      </div>

      <button
        onClick={onDelete}
        className="p-1 text-slate-400 hover:text-red-400 transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
};