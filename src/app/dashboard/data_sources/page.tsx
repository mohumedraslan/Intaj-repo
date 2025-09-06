// src/app/dashboard/data_sources/page.tsx
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import DataSourcePreview from './preview';
import { supabase } from '@/lib/storageClient';

export default function DataSourcesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
  };

  // Add title to file input
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      // Upload to Supabase Storage bucket 'files'
      const { data, error } = await supabase.storage.from('files').upload(`public/${file.name}`, file, {
        cacheControl: '3600',
        upsert: true,
      });
      if (error) throw error;
      // Save metadata to DB
      const res = await fetch('/api/data_sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_name: file.name,
          file_url: data?.path,
          file_type: file.type,
        }),
      });
      if (!res.ok) throw new Error('Failed to save metadata');
      setUploaded(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Upload Data Source</h1>
      <form onSubmit={handleUpload} className="mb-4">
        <input 
          type="file" 
          accept=".pdf,.docx" 
          onChange={handleFileChange} 
          className="mb-2 block"
          title="Upload file" 
        />
        <Button type="submit" disabled={uploading || !file}>
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
      </form>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {uploaded && <div className="text-green-600">Uploaded: {uploaded}</div>}
      <DataSourcePreview />
    </div>
  );
}
