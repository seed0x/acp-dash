'use client'

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Camera, Calendar, Eye, Download, Trash2, Edit3, Filter, X, Search, MapPin } from 'lucide-react';
import { Photo } from '../../types';

// Debounce utility function
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface PhotoGalleryProps {
  projectId?: string; // Make projectId optional for global search
  searchTerm?: string; // Keep for backward compatibility
}

interface EnhancedPhoto extends Photo {
  category?: string;
  size?: number;
  photographer?: string;
  projectId?: string;
  projectName?: string;
  projectLocation?: string;
  metadata?: {
    width?: number;
    height?: number;
    fileSize?: string;
  };
}

interface SearchFilters {
  search: string;
  category: string;
  photographer: string;
  dateFrom: string;
  dateTo: string;
  projectName: string;
  location: string;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ projectId, searchTerm = '' }) => {
  const [photos, setPhotos] = useState<EnhancedPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  
  // Advanced search filters
  const [filters, setFilters] = useState<SearchFilters>({
    search: searchTerm,
    category: '',
    photographer: '',
    dateFrom: '',
    dateTo: '',
    projectName: '',
    location: ''
  });

  // Update search when external searchTerm changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
  }, [searchTerm]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((searchFilters: SearchFilters) => {
      loadPhotos(searchFilters);
    }, 300),
    [projectId]
  );

  // Load photos with search filters
  const loadPhotos = async (searchFilters: SearchFilters = filters) => {
    try {
      setIsLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (projectId) params.append('projectId', projectId);
      if (searchFilters.search.trim()) params.append('search', searchFilters.search.trim());
      if (searchFilters.category && searchFilters.category !== 'all') params.append('category', searchFilters.category);
      if (searchFilters.photographer.trim()) params.append('photographer', searchFilters.photographer.trim());
      if (searchFilters.dateFrom) params.append('dateFrom', searchFilters.dateFrom);
      if (searchFilters.dateTo) params.append('dateTo', searchFilters.dateTo);
      if (searchFilters.projectName.trim()) params.append('projectName', searchFilters.projectName.trim());
      if (searchFilters.location.trim()) params.append('location', searchFilters.location.trim());
      
      const response = await fetch(`/api/photos?${params.toString()}`);
      const data = await response.json();
      
      if (response.ok) {
        setPhotos(data.photos || []);
      } else {
        console.error('Failed to load photos:', data.error);
        setPhotos([]);
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
      setPhotos([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load and when projectId changes
  useEffect(() => {
    loadPhotos();
  }, [projectId]);

  // Handle filter changes with debouncing
  useEffect(() => {
    debouncedSearch(filters);
  }, [filters, debouncedSearch]);

  // Handle filter updates
  const updateFilter = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      photographer: '',
      dateFrom: '',
      dateTo: '',
      projectName: '',
      location: ''
    });
  };

  // Check if any advanced filters are active
  const hasActiveFilters = useMemo(() => {
    return filters.category || filters.photographer || filters.dateFrom || 
           filters.dateTo || filters.projectName || filters.location;
  }, [filters]);

  // Initial load and when projectId changes
  useEffect(() => {
    if (projectId) {
      loadPhotos();
    }
  }, [projectId]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = photos.map(p => p.category).filter(Boolean);
    return ['all', ...Array.from(new Set(cats))];
  }, [photos]);

  // Filter and sort photos (now primarily for sorting since filtering is done server-side)
  const filteredAndSortedPhotos = useMemo(() => {
    let filtered = [...photos];

    // Apply category filter (if using the legacy category selector)
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(photo => photo.category === selectedCategory);
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      let aVal: string | number, bVal: string | number;
      
      if (sortBy === 'date') {
        aVal = new Date(a.date).getTime();
        bVal = new Date(b.date).getTime();
      } else {
        aVal = a.description || '';
        bVal = b.description || '';
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        return sortOrder === 'asc' 
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      }
    });
  }, [photos, selectedCategory, sortBy, sortOrder]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Photos
          </h3>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Photos ({filteredAndSortedPhotos.length})
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              showAdvancedSearch || hasActiveFilters
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Filter className="h-4 w-4" />
            Advanced Search
            {hasActiveFilters && <span className="ml-1 px-1.5 py-0.5 bg-blue-500 text-xs rounded-full">!</span>}
          </button>
          {projectId && (
            <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
              <Camera className="h-4 w-4" />
              Add Photos
            </button>
          )}
        </div>
      </div>

      {/* Basic Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search photos by description, project, location..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
        />
        {filters.search && (
          <button
            onClick={() => updateFilter('search', '')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Advanced Search Panel */}
      {showAdvancedSearch && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-white font-medium">Advanced Search Filters</h4>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-slate-400 hover:text-white text-sm flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear All
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => updateFilter('category', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Categories</option>
                {categories.filter(cat => cat !== 'all').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Photographer Filter */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Photographer</label>
              <input
                type="text"
                placeholder="Enter photographer name"
                value={filters.photographer}
                onChange={(e) => updateFilter('photographer', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Project Name Filter */}
            {!projectId && (
              <div>
                <label className="block text-sm text-slate-400 mb-1">Project Name</label>
                <input
                  type="text"
                  placeholder="Enter project name"
                  value={filters.projectName}
                  onChange={(e) => updateFilter('projectName', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}

            {/* Location Filter */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">
                <MapPin className="inline h-3 w-3 mr-1" />
                Location
              </label>
              <input
                type="text"
                placeholder="Enter location"
                value={filters.location}
                onChange={(e) => updateFilter('location', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.category && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded">
              Category: {filters.category}
              <button onClick={() => updateFilter('category', '')} className="hover:text-gray-200">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.photographer && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded">
              Photographer: {filters.photographer}
              <button onClick={() => updateFilter('photographer', '')} className="hover:text-gray-200">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.projectName && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded">
              Project: {filters.projectName}
              <button onClick={() => updateFilter('projectName', '')} className="hover:text-gray-200">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.location && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded">
              Location: {filters.location}
              <button onClick={() => updateFilter('location', '')} className="hover:text-gray-200">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.dateFrom && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded">
              From: {formatDate(filters.dateFrom)}
              <button onClick={() => updateFilter('dateFrom', '')} className="hover:text-gray-200">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.dateTo && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded">
              To: {formatDate(filters.dateTo)}
              <button onClick={() => updateFilter('dateTo', '')} className="hover:text-gray-200">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Sorting Options */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center text-sm">
          <span className="text-slate-400">Sort by:</span>
          <button
            onClick={() => setSortBy('date')}
            className={`px-2 py-1 rounded ${
              sortBy === 'date' 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Date
          </button>
          <button
            onClick={() => setSortBy('name')}
            className={`px-2 py-1 rounded ${
              sortBy === 'name' 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Name
          </button>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-2 py-1 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      )}

      {/* Photo Grid */}
      {filteredAndSortedPhotos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedPhotos.map(photo => (
            <PhotoCard key={photo.id} photo={photo} />
          ))}
        </div>
      )}

      {/* No Results State */}
      {filteredAndSortedPhotos.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <Camera className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">
            {hasActiveFilters || filters.search
              ? 'No photos match your search criteria' 
              : 'No photos yet'
            }
          </p>
          {!hasActiveFilters && !filters.search && projectId && (
            <p className="text-slate-500 text-sm mt-1">
              Upload photos to document project progress
            </p>
          )}
          {(hasActiveFilters || filters.search) && (
            <button
              onClick={clearFilters}
              className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

interface PhotoCardProps {
  photo: EnhancedPhoto;
}

const PhotoCard: React.FC<PhotoCardProps> = ({ photo }) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [showFullScreen, setShowFullScreen] = React.useState(false);
  const [showActions, setShowActions] = React.useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = photo.url;
    link.download = photo.description || 'photo';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div 
        className="bg-slate-800/30 border border-slate-700 rounded-lg overflow-hidden group"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="relative aspect-video bg-slate-800">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
            </div>
          )}
          <img
            src={photo.url}
            alt={photo.description || 'Project photo'}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
          />
          
          {/* Action buttons overlay */}
          <div className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${
            showActions ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className="absolute top-2 right-2 flex gap-1">
              <button
                onClick={() => setShowFullScreen(true)}
                className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                title="View full size"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Category badge */}
          {photo.category && (
            <div className="absolute top-2 left-2">
              <span className="px-2 py-1 bg-black/70 text-white text-xs rounded">
                {photo.category}
              </span>
            </div>
          )}
        </div>
        
        <div className="p-3">
          {photo.description && (
            <p className="text-white text-sm font-medium mb-1 line-clamp-2">{photo.description}</p>
          )}
          
          {/* Project name and location (for global search) */}
          {photo.projectName && (
            <p className="text-blue-400 text-xs mb-1 truncate" title={photo.projectName}>
              📋 {photo.projectName}
            </p>
          )}
          
          {photo.projectLocation && (
            <p className="text-green-400 text-xs mb-1 flex items-center gap-1 truncate" title={photo.projectLocation}>
              <MapPin className="h-3 w-3" />
              {photo.projectLocation}
            </p>
          )}
          
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(photo.date)}
            </div>
            {photo.metadata?.fileSize && (
              <span>{photo.metadata.fileSize}</span>
            )}
          </div>
          
          {photo.photographer && (
            <p className="text-xs text-slate-500 mt-1">
              by {photo.photographer}
            </p>
          )}
        </div>
      </div>

      {/* Full screen modal */}
      {showFullScreen && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowFullScreen(false)}
        >
          <div className="max-w-6xl max-h-full relative">
            {/* Close button */}
            <button
              onClick={() => setShowFullScreen(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <img
              src={photo.url}
              alt={photo.description || 'Project photo'}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Photo info overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-4">
              {photo.description && (
                <h3 className="font-semibold mb-2">{photo.description}</h3>
              )}
              <div className="flex flex-wrap gap-4 text-sm">
                <span>Date: {formatDate(photo.date)}</span>
                {photo.photographer && <span>Photographer: {photo.photographer}</span>}
                {photo.category && <span>Category: {photo.category}</span>}
                {photo.projectName && <span>Project: {photo.projectName}</span>}
                {photo.projectLocation && <span>Location: {photo.projectLocation}</span>}
                {photo.metadata && (
                  <>
                    {photo.metadata.width && photo.metadata.height && (
                      <span>Size: {photo.metadata.width} × {photo.metadata.height}</span>
                    )}
                    {photo.metadata.fileSize && <span>File: {photo.metadata.fileSize}</span>}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};