'use client'

import React from 'react';
import { TrendingUp, AlertCircle, CheckSquare, CreditCard, Wifi, WifiOff } from 'lucide-react';
import { KPIs } from '../../types';
import { useApp } from '../../contexts/AppContext';

interface KPIBarProps {
  kpis: KPIs;
}

export const KPIBar: React.FC<KPIBarProps> = ({ kpis }) => {
  const { isOnline, pendingActions } = useApp();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-blue-400" />
          <div>
            <p className="text-2xl font-bold text-white">{kpis.activeBids}</p>
            <p className="text-sm text-slate-400">Active Bids</p>
          </div>
        </div>
      </div>
      
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <CheckSquare className="h-8 w-8 text-green-400" />
          <div>
            <p className="text-2xl font-bold text-white">{kpis.postAndBeam}</p>
            <p className="text-sm text-slate-400">Post & Beam</p>
          </div>
        </div>
      </div>
      
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <CreditCard className="h-8 w-8 text-orange-400" />
          <div>
            <p className="text-2xl font-bold text-white">{kpis.jobAccountsPending}</p>
            <p className="text-sm text-slate-400">Job Accounts Pending</p>
          </div>
        </div>
      </div>
      
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-8 w-8 text-red-400" />
          <div>
            <p className="text-2xl font-bold text-white">{kpis.openProblems}</p>
            <p className="text-sm text-slate-400">Open Problems</p>
          </div>
        </div>
      </div>

      {/* Status indicators */}
      <div className="col-span-2 md:col-span-4 flex items-center gap-4 px-4">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">
              <Wifi className="h-3 w-3" />
              Online
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded text-xs">
              <WifiOff className="h-3 w-3" />
              Offline
            </span>
          )}
        </div>
        
        {pendingActions.length > 0 && (
          <span className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs">
            {pendingActions.length} pending
          </span>
        )}
      </div>
    </div>
  );
};