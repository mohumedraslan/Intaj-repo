// src/app/dashboard/chatbots/page.tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';


export default function ChatbotsPage() {
  interface Chatbot {
    id: string;
    name: string;
    model: string;
    settings: Record<string, unknown>;
    created_at: string;
  }
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [model, setModel] = useState('gpt-3.5-turbo');
  const [settings, setSettings] = useState('{}');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChatbots = async () => {
      // supabase is already imported and ready to use
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;
      const { data, error } = await supabase
        .from('chatbots')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) setError(error.message);
      else setChatbots(data || []);
      setLoading(false);
    };
    fetchChatbots();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/chatbots/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, model, settings: JSON.parse(settings) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create chatbot');
      setChatbots([data.chatbot, ...chatbots]);
      setName('');
      setSettings('{}');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Your Chatbots</h1>
      <form onSubmit={handleCreate} className="mb-6 flex gap-2 items-end">
        <div>
          <label className="block text-sm">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} required className="input input-bordered w-full" placeholder="Chatbot name" title="Chatbot name" />
        </div>
        <div>
          <label className="block text-sm">Model</label>
          <select value={model} onChange={e => setModel(e.target.value)} className="input input-bordered" title="Model">
            <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
            <option value="gpt-4">gpt-4</option>
          </select>
        </div>
        <div>
          <label className="block text-sm">Settings (JSON)</label>
          <input value={settings} onChange={e => setSettings(e.target.value)} className="input input-bordered w-32" placeholder="{}" title="Settings JSON" />
        </div>
        <Button type="submit">Create</Button>
      </form>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : chatbots.length === 0 ? (
        <div>No chatbots yet.</div>
      ) : (
        <ul className="space-y-2">
          {chatbots.map(cb => (
            <li key={cb.id} className="border rounded p-3 flex justify-between items-center">
              <span>{cb.name} <span className="text-xs text-gray-400">({cb.model})</span></span>
              <Link href={`/dashboard/chatbots/${cb.id}`} className="text-blue-600 hover:underline">Edit</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
