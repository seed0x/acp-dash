'use client'

import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { Notification } from '../types';

const NotificationIcon: React.FC<{ type: Notification['type'] }> = ({ type }) => {
  switch (type) {
    case 'success':
      return <CheckCircle2 className="h-5 w-5" />;
    case 'error':
      return <AlertCircle className="h-5 w-5" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5" />;
    default:
      return <Info className="h-5 w-5" />;
  }
};

export const NotificationCenter: React.FC = () => {
  const { notifications, clearNotification } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`
            p-4 rounded-lg shadow-lg backdrop-blur-xl border animate-slide-up
            ${notification.type === 'success' ? 'bg-green-500/20 border-green-500 text-green-300' : ''}
            ${notification.type === 'error' ? 'bg-red-500/20 border-red-500 text-red-300' : ''}
            ${notification.type === 'warning' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300' : ''}
            ${notification.type === 'info' ? 'bg-blue-500/20 border-blue-500 text-blue-300' : ''}
          `}
        >
          <div className="flex items-start gap-3">
            <NotificationIcon type={notification.type} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{notification.message}</p>
              <p className="text-xs opacity-75 mt-1">
                {notification.timestamp.toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => clearNotification(notification.id)}
              className="opacity-50 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};