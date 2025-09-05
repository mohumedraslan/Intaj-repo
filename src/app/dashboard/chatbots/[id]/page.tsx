// src/app/dashboard/chatbots/[id]/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabaseClient';
import { updateChatbot, deleteChatbot } from '../actions';

export default function EditChatbotPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  interface Chatbot {
    id: string;
    name: string;
    model: string;
    settings: Record<string, unknown>;
    created_at: string;
  }
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [name, setName] = useState('');
  const [model, setModel] = useState('gpt-3.5-turbo');
  const [settings, setSettings] = useState('{}');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChatbot = async () => {
      const supabase = createClient();
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;
      const { data, error } = await supabase
        .from('chatbots')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
      if (error) setError(error.message);
      else {
        setChatbot(data);
        setName(data.name);
        setModel(data.model);
        setSettings(JSON.stringify(data.settings || {}, null, 2));
      }
      setLoading(false);
    };
    if (id) fetchChatbot();
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await updateChatbot({ id, name, model, settings: JSON.parse(settings) });
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this chatbot?')) return;
    try {
      await deleteChatbot(id);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!chatbot) return <div className="p-8">Chatbot not found.</div>;

  return (
    <div className="max-w-xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Edit Chatbot</h1>
      <form onSubmit={handleUpdate} className="space-y-4">
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
          <textarea value={settings} onChange={e => setSettings(e.target.value)} rows={4} className="input input-bordered w-full font-mono" placeholder="{}" title="Settings JSON" />
        </div>
        <Button type="submit">Save</Button>
        <Button type="button" variant="destructive" onClick={handleDelete}>Delete</Button>
      </form>
    </div>
  );
}
