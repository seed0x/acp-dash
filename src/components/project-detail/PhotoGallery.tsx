'use client'

import React, { useMemo, useState, useEffect } from 'react';
import { Camera, Calendar, Eye, Download, Trash2, Edit3, Filter } from 'lucide-react';
import { Photo } from '../../types';

interface PhotoGalleryProps {
  projectId: string;
  searchTerm: string;
}

interface EnhancedPhoto extends Photo {
  category?: string;
  size?: number;
  photographer?: string;
  metadata?: {
    width?: number;
    height?: number;
    fileSize?: string;
  };
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ projectId, searchTerm }) => {
  const [photos, setPhotos] = useState<EnhancedPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load photos from API
  useEffect(() => {
    const loadPhotos = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/photos?projectId=${projectId}`);
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

    if (projectId) {
      loadPhotos();
    }
  }, [projectId]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = photos.map(p => p.category).filter(Boolean);
    return ['all', ...Array.from(new Set(cats))];
  }, [photos]);

  // Filter and sort photos
  const filteredAndSortedPhotos = useMemo(() => {
    let filtered = photos;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(photo => 
        photo.description?.toLowerCase().includes(term) ||
        photo.category?.toLowerCase().includes(term) ||
        photo.photographer?.toLowerCase().includes(term)
      );
    }

    // Apply category filter
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
  }, [photos, searchTerm, selectedCategory, sortBy, sortOrder]);

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
        <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
          <Camera className="h-4 w-4" />
          Add Photos
        </button>
      </div>

      {/* Filters and sorting */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center text-sm">
          {/* Category filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Sort options */}
          <div className="flex items-center gap-2">
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
        </div>
      )}

      {filteredAndSortedPhotos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedPhotos.map(photo => (
            <PhotoCard key={photo.id} photo={photo} />
          ))}
        </div>
      )}

      {filteredAndSortedPhotos.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <Camera className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">
            {searchTerm || selectedCategory !== 'all' 
              ? 'No photos match your filters' 
              : 'No photos yet'
            }
          </p>
          {!searchTerm && selectedCategory === 'all' && (
            <p className="text-slate-500 text-sm mt-1">
              Upload photos to document project progress
            </p>
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