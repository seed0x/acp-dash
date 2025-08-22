'use client';

import { useState } from 'react';
import { Camera, X, Upload, Check, AlertCircle } from 'lucide-react';

type ProjectOption = { id: string; title: string };

interface PhotoUploadItem {
  file: File;
  id: string;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

export default function AddPhotoCard({ projects, onPhotoAdded }: { projects: ProjectOption[], onPhotoAdded: () => void }) {
  const [projectId, setProjectId] = useState<string>(projects[0]?.id || '');
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<PhotoUploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxFiles = 10;
    
    if (selectedFiles.length + files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newFiles: PhotoUploadItem[] = files.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      preview: URL.createObjectURL(file),
      status: 'pending'
    }));

    setSelectedFiles(prev => [...prev, ...newFiles]);
    setError(null);
    
    // Reset the input
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setSelectedFiles(prev => {
      const updated = prev.filter(f => f.id !== id);
      // Clean up object URL for removed file
      const removedFile = prev.find(f => f.id === id);
      if (removedFile) {
        URL.revokeObjectURL(removedFile.preview);
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0 || !projectId) {
      setError('Please select a project and at least one photo file.');
      return;
    }
    
    setIsUploading(true);
    setError(null);

    try {
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
          formData.append('projectId', projectId);
          formData.append('description', description || `Photo - ${photoFile.file.name}`);

          const res = await fetch('/api/photos', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Failed to upload photo.');
          }

          // Update status to success
          setSelectedFiles(prev => 
            prev.map(f => 
              f.id === photoFile.id 
                ? { ...f, status: 'success' as const }
                : f
            )
          );

          return photoFile.id;
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

      const results = await Promise.allSettled(uploadPromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        // Reset form for successful uploads
        setDescription('');
        onPhotoAdded();
        
        // Remove successful uploads after a delay
        setTimeout(() => {
          setSelectedFiles(prev => prev.filter(f => f.status !== 'success'));
        }, 2000);
      }

      if (failCount > 0) {
        setError(`${failCount} photo(s) failed to upload. Check individual errors above.`);
      }

    } catch (e: any) {
      setError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusIcon = (status: PhotoUploadItem['status']) => {
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
    <section className="card p-3 space-y-2">
      <h2 className="font-semibold flex items-center gap-2">
        <Camera className="h-5 w-5" />
        Add Photos to Project ({selectedFiles.length}/10)
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            className="px-3 py-2 rounded bg-black/30 border border-[var(--border)] sm:w-72"
          >
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          
          <label className="flex-1">
            <div className="px-3 py-2 rounded bg-black/30 border border-[var(--border)] border-dashed hover:border-blue-500 transition-colors cursor-pointer text-center">
              <span className="text-sm text-slate-300">
                Select Photos (max 10)
              </span>
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              disabled={selectedFiles.length >= 10}
              className="hidden"
            />
          </label>
        </div>

        {/* Selected files preview */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-300">Selected Photos:</h4>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {selectedFiles.map((photoFile) => (
                <div key={photoFile.id} className="flex items-center gap-3 p-2 bg-black/20 rounded border border-[var(--border)]">
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
                        type="button"
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

        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Optional description for all photos"
          className="w-full px-3 py-2 rounded bg-black/30 border border-[var(--border)]"
        />
        
        <button 
          type="submit" 
          disabled={isUploading || selectedFiles.length === 0} 
          className="btn btn-primary w-full sm:w-auto disabled:opacity-50"
        >
          {isUploading ? 'Uploading…' : `Upload ${selectedFiles.length} Photo(s)`}
        </button>
        
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>
    </section>
  );
}