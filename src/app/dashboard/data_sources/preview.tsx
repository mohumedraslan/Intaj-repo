// src/app/dashboard/data_sources/preview.tsx
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/storageClient';

interface FileEntry {
  id?: string;
  name: string;
  created_at?: string;
}
export default function DataSourcePreview() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFiles = async () => {
      const { data, error } = await supabase.storage.from('files').list('public');
      if (!error && data) setFiles(data);
      setLoading(false);
    };
    fetchFiles();
  }, []);

  if (loading) return <div>Loading files...</div>;
  return (
    <div className="mt-6">
      <h2 className="font-semibold mb-2">Uploaded Files</h2>
      <ul className="space-y-1">
        {files.map(file => (
          <li key={file.name}>{file.name}</li>
        ))}
      </ul>
    </div>
  );
}
