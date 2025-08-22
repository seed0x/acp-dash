'use client'

import React, { useMemo } from 'react';
import { Camera, Calendar, Eye } from 'lucide-react';
import { Photo } from '../../types';

interface PhotoGalleryProps {
  projectId: string;
  searchTerm: string;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ projectId, searchTerm }) => {
  // Mock photos data - in a real app this would come from the project hook
  const photos: Photo[] = [
    { id: 1, url: '/api/placeholder/400/300', description: 'Foundation work', date: '2024-01-10' },
    { id: 2, url: '/api/placeholder/400/300', description: 'Framing progress', date: '2024-01-15' },
    { id: 3, url: '/api/placeholder/400/300', description: 'Electrical rough-in', date: '2024-01-20' }
  ];

  const filteredPhotos = useMemo(() => {
    if (!searchTerm) return photos;
    const term = searchTerm.toLowerCase();
    return photos.filter(photo => 
      photo.description?.toLowerCase().includes(term)
    );
  }, [photos, searchTerm]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Photos ({filteredPhotos.length})
        </h3>
        <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
          <Camera className="h-4 w-4" />
          Add Photos
        </button>
      </div>

      {filteredPhotos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPhotos.map(photo => (
            <PhotoCard key={photo.id} photo={photo} />
          ))}
        </div>
      )}

      {filteredPhotos.length === 0 && (
        <div className="text-center py-8">
          <Camera className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">
            {searchTerm ? 'No photos match your search' : 'No photos yet'}
          </p>
          {!searchTerm && (
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
  photo: Photo;
}

const PhotoCard: React.FC<PhotoCardProps> = ({ photo }) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [showFullScreen, setShowFullScreen] = React.useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <>
      <div className="bg-slate-800/30 border border-slate-700 rounded-lg overflow-hidden group">
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
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200">
            <button
              onClick={() => setShowFullScreen(true)}
              className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/70"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="p-3">
          {photo.description && (
            <p className="text-white text-sm font-medium mb-1">{photo.description}</p>
          )}
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Calendar className="h-3 w-3" />
            {formatDate(photo.date)}
          </div>
        </div>
      </div>

      {/* Full screen modal */}
      {showFullScreen && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowFullScreen(false)}
        >
          <div className="max-w-4xl max-h-full">
            <img
              src={photo.url}
              alt={photo.description || 'Project photo'}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            {photo.description && (
              <p className="text-white text-center mt-4">{photo.description}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
};