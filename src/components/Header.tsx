import React from 'react';
import { Home } from 'lucide-react';
import { KPIBar } from './dashboard/KPIBar';
import { KPIs } from '../types';

interface HeaderProps {
  kpis: KPIs;
}

export const Header: React.FC<HeaderProps> = ({ kpis }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Home className="h-5 w-5" />
              ACP Operations
            </h1>
          </div>
        </div>
        
        <KPIBar kpis={kpis} />
      </div>
    </header>
  );
};

export default Header;