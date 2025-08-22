'use client'

import React from 'react';
import { TrendingUp, AlertCircle, CheckSquare, CreditCard, Wifi, WifiOff, Clipboard, FileCheck } from 'lucide-react';
import { KPIs } from '../../types';
import { useApp } from '../../contexts/AppContext';

interface KPIBarProps {
  kpis: KPIs;
}

export const KPIBar: React.FC<KPIBarProps> = ({ kpis }) => {
  const { isOnline, pendingActions } = useApp();

  // Helper function to format the KPI blocks
  const KpiBlock = ({ 
    icon, 
    value, 
    label, 
    color, 
    onClick 
  }: { 
    icon: React.ReactNode; 
    value: number; 
    label: string; 
    color: string;
    onClick?: () => void;
  }) => (
    <div 
      className={`bg-slate-800/50 border border-slate-700 rounded-xl p-4 ${onClick ? 'cursor-pointer hover:bg-slate-700/70 transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiBlock 
          icon={<TrendingUp className="h-8 w-8 text-blue-400" />}
          value={kpis.activeBids}
          label="Active Bids"
          color="text-blue-400"
        />
        
        <KpiBlock 
          icon={<CheckSquare className="h-8 w-8 text-green-400" />}
          value={kpis.postAndBeam}
          label="Post & Beam"
          color="text-green-400"
        />
        
        <KpiBlock 
          icon={<CreditCard className="h-8 w-8 text-orange-400" />}
          value={kpis.jobAccountsPending}
          label="Job Accounts Pending"
          color="text-orange-400"
        />
        
        <KpiBlock 
          icon={<AlertCircle className="h-8 w-8 text-red-400" />}
          value={kpis.openProblems}
          label="Open Problems"
          color="text-red-400"
        />
      </div>
      
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-slate-400">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-400" />
              <span className="text-sm text-slate-400">Offline · Changes will sync when connected</span>
            </>
          )}
        </div>
        
        {pendingActions?.length > 0 && (
          <div className="flex items-center gap-2 text-amber-400">
            <span className="text-xs font-medium">{pendingActions.length} pending action(s)</span>
          </div>
        )}
      </div>
    </>
  );
};
