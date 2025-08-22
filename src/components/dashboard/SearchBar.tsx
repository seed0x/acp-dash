'use client'

import React, { useState, useCallback } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useDebounce } from '../../hooks';

interface SearchBarProps {
  onSearch: (searchTerm: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const { activeFilters, setActiveFilters, searchHistory, setSearchHistory } = useApp();
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  React.useEffect(() => {
    onSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, onSearch]);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim() && !searchHistory.includes(searchTerm.trim())) {
      setSearchHistory([searchTerm.trim(), ...searchHistory.slice(0, 4)]);
    }
  }, [searchTerm, searchHistory, setSearchHistory]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    onSearch('');
  }, [onSearch]);

  const hasActiveFilters = Object.values(activeFilters).some(v => v && v !== 'all');

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearchSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            id="global-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects, clients, locations..."
            className="w-full pl-10 pr-20 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            {searchTerm && (
              <button
                type="button"
                onClick={clearSearch}
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded transition-colors ${
                hasActiveFilters || showFilters ? 'text-blue-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Filter className="h-5 w-5" />
            </button>
          </div>
        </div>
      </form>

      {showFilters && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <select
              value={activeFilters.phase}
              onChange={e => setActiveFilters({ ...activeFilters, phase: e.target.value })}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value="all">All Phases</option>
              <option value="bidding">Bidding</option>
              <option value="post-beam">Post & Beam</option>
              <option value="trim">Trim</option>
              <option value="complete">Complete</option>
            </select>

            <select
              value={activeFilters.priority || ''}
              onChange={e => setActiveFilters({ ...activeFilters, priority: e.target.value || null })}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value="">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>

            <select
              value={activeFilters.assignee || ''}
              onChange={e => setActiveFilters({ ...activeFilters, assignee: e.target.value || null })}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value="">All Assignees</option>
              <option value="mike">Mike</option>
              <option value="steve">Steve</option>
              <option value="admin">Admin</option>
            </select>

            <button
              onClick={() => setActiveFilters({ phase: 'all', assignee: null, dateRange: null, priority: null })}
              className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {searchHistory.length > 0 && searchTerm === '' && (
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-3">
          <p className="text-xs text-slate-400 mb-2">Recent searches:</p>
          <div className="flex flex-wrap gap-2">
            {searchHistory.map((term, index) => (
              <button
                key={index}
                onClick={() => {
                  setSearchTerm(term);
                  onSearch(term);
                }}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};