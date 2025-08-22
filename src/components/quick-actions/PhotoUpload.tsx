'use client'

import React, { useState } from 'react';
import { Camera, Upload } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';

export const PhotoUpload: React.FC = () => {
  const { notify } = useNotifications();

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, this would upload to a service
      notify(`Photo "${file.name}" uploaded successfully!`, 'success');
    }
  };

  return (
    <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4">
      <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
        <Camera className="h-5 w-5" />
        Upload Photo
      </h3>
      
      <div className="space-y-3">
        <label className="block">
          <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-slate-500 transition-colors cursor-pointer">
            <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-300">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-slate-400 mt-1">
              PNG, JPG, GIF up to 10MB
            </p>
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
};