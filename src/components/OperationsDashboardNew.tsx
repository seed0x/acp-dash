'use client'

import React from 'react';
import { AppProvider } from '../contexts/AppContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { Dashboard } from './dashboard/Dashboard';
import { NotificationCenter } from './NotificationCenter';
import { ErrorBoundary } from './ErrorBoundary';
import { KPIs } from '../types';

interface OperationsDashboardProps {
  initialKpis?: KPIs;
}

const OperationsDashboard: React.FC<OperationsDashboardProps> = ({ 
  initialKpis = {
    activeBids: 5,
    postAndBeam: 12,
    jobAccountsPending: 3,
    openProblems: 8
  }
}) => {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AppProvider>
          <Dashboard kpis={initialKpis} />
          <NotificationCenter />
        </AppProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
};

export default OperationsDashboard;