'use client'

import React, { useState, useCallback } from 'react';
import { Camera, Upload, X, Check, AlertCircle } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { useApp } from '../../contexts/AppContext';

interface PhotoFile {
  file: File;
  id: string;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

interface PhotoUploadProps {
  maxFiles?: number;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({ 
  maxFiles = 10 
}) => {
  const { notify } = useNotifications();
  const { projects } = useApp();
  const [selectedFiles, setSelectedFiles] = useState<PhotoFile[]>([]);
  const [description, setDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (selectedFiles.length + files.length > maxFiles) {
      notify(`Maximum ${maxFiles} files allowed`, 'warning');
      return;
    }

    const newFiles: PhotoFile[] = files.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      preview: URL.createObjectURL(file),
      status: 'pending'
    }));

    setSelectedFiles(prev => [...prev, ...newFiles]);
    
    // Reset the input
    e.target.value = '';
  }, [selectedFiles.length, maxFiles, notify]);

  const removeFile = useCallback((id: string) => {
    setSelectedFiles(prev => {
      const updated = prev.filter(f => f.id !== id);
      // Clean up object URL for removed file
      const removedFile = prev.find(f => f.id === id);
      if (removedFile) {
        URL.revokeObjectURL(removedFile.preview);
      }
      return updated;
    });
  }, []);

  const uploadFiles = async () => {
    if (!selectedProjectId) {
      notify('Project selection is required for upload', 'error');
      return;
    }

    if (selectedFiles.length === 0) {
      notify('Please select at least one photo', 'warning');
      return;
    }

    setIsUploading(true);
    const uploadPromises = selectedFiles.map(async (photoFile) => {
      try {
        // Update status to uploading
        setSelectedFiles(prev => 
          prev.map(f => 
            f.id === photoFile.id 
              ? { ...f, status: 'uploading' as const }
              : f
          )
        );

        const formData = new FormData();
        formData.append('file', photoFile.file);
        formData.append('projectId', selectedProjectId);
        formData.append('description', description || `Photo - ${photoFile.file.name}`);

        const response = await fetch('/api/photos', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }

        const result = await response.json();

        // Update status to success
        setSelectedFiles(prev => 
          prev.map(f => 
            f.id === photoFile.id 
              ? { ...f, status: 'success' as const }
              : f
          )
        );

        return result.url;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        
        // Update status to error
        setSelectedFiles(prev => 
          prev.map(f => 
            f.id === photoFile.id 
              ? { ...f, status: 'error' as const, errorMessage }
              : f
          )
        );
        
        throw error;
      }
    });

    try {
      const uploadedUrls = await Promise.allSettled(uploadPromises);
      const successfulUrls = uploadedUrls
        .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
        .map(result => result.value);
      
      const failedCount = uploadedUrls.length - successfulUrls.length;
      
      if (successfulUrls.length > 0) {
        notify(`${successfulUrls.length} photo(s) uploaded successfully!`, 'success');
        // Clear form on success
        setDescription('');
        setSelectedProjectId('');
      }
      
      if (failedCount > 0) {
        notify(`${failedCount} photo(s) failed to upload`, 'error');
      }

      // Clean up successful uploads after a delay
      setTimeout(() => {
        setSelectedFiles(prev => prev.filter(f => f.status !== 'success'));
      }, 2000);

    } catch (error) {
      notify('Some photos failed to upload', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Cleanup object URLs on unmount
  React.useEffect(() => {
    return () => {
      selectedFiles.forEach(file => {
        URL.revokeObjectURL(file.preview);
      });
    };
  }, []);

  const getStatusIcon = (status: PhotoFile['status']) => {
    switch (status) {
      case 'pending':
        return <Upload className="h-4 w-4 text-slate-400" />;
      case 'uploading':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400" />;
      case 'success':
        return <Check className="h-4 w-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
    }
  };

  return (
    <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4">
      <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
        <Camera className="h-5 w-5" />
        Upload Photos ({selectedFiles.length}/{maxFiles})
      </h3>
      
      <div className="space-y-3">
        {/* File input */}
        <label className="block">
          <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-slate-500 transition-colors cursor-pointer">
            <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-300">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-slate-400 mt-1">
              PNG, JPG, GIF up to 10MB each (max {maxFiles} files)
            </p>
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={selectedFiles.length >= maxFiles}
          />
        </label>

        {/* Project selection */}
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
        >
          <option value="">Select a project</option>
          {projects.map(project => (
            <option key={project.id} value={project.id}>
              {project.title} {project.subdivision ? `- ${project.subdivision}` : ''}
            </option>
          ))}
        </select>

        {/* Description input */}
        <input
          type="text"
          placeholder="Optional description for all photos"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400"
        />

        {/* Selected files preview */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-300">Selected Photos:</h4>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {selectedFiles.map((photoFile) => (
                <div key={photoFile.id} className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-lg">
                  <img 
                    src={photoFile.preview} 
                    alt="Preview"
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{photoFile.file.name}</p>
                    <p className="text-xs text-slate-400">
                      {(photoFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {photoFile.status === 'error' && photoFile.errorMessage && (
                      <p className="text-xs text-red-400">{photoFile.errorMessage}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(photoFile.status)}
                    {photoFile.status === 'pending' && (
                      <button
                        onClick={() => removeFile(photoFile.id)}
                        className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload button */}
        {selectedFiles.length > 0 && (
          <button
            onClick={uploadFiles}
            disabled={isUploading || !selectedProjectId}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} Photo(s)`}
          </button>
        )}

        {!selectedProjectId && selectedFiles.length > 0 && (
          <p className="text-xs text-amber-400">
            Select a project to enable photo upload
          </p>
        )}
      </div>
    </div>
  );
};