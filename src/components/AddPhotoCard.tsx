'use client';

import { useState } from 'react';

type ProjectOption = { id: string; title: string };

export default function AddPhotoCard({ projects, onPhotoAdded }: { projects: ProjectOption[], onPhotoAdded: () => void }) {
  const [projectId, setProjectId] = useState<string>(projects[0]?.id || '');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !projectId) {
      setError('Please select a project and a photo file.');
      return;
    }
    setIsUploading(true);
    setError(null);

    try {
      // The API route will handle uploading to blob storage and creating the Notion page
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);
      formData.append('description', description);

      const res = await fetch('/api/photos', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to upload photo.');
      }

      // Reset form and notify parent
      setDescription('');
      setFile(null);
      (document.getElementById('file-input') as HTMLInputElement).value = '';
      onPhotoAdded();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="card p-3 space-y-2">
      <h2 className="font-semibold">Add Photo to Lot</h2>
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            className="px-3 py-2 rounded bg-black/30 border border-[var(--border)] sm:w-72"
          >
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <input
            id="file-input"
            type="file"
            accept="image/*"
            onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
            className="px-3 py-1.5 rounded bg-black/30 border border-[var(--border)] flex-1 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-900/40 file:text-blue-300 hover:file:bg-blue-900/60"
          />
        </div>
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Photo description (optional)"
          className="w-full px-3 py-2 rounded bg-black/30 border border-[var(--border)]"
        />
        <button type="submit" disabled={isUploading} className="btn btn-primary w-full sm:w-auto">
          {isUploading ? 'Uploading…' : 'Upload Photo'}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>
    </section>
  );
}