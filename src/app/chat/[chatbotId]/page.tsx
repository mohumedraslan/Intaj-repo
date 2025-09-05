// src/app/chat/[chatbotId]/page.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/storageClient';
import { Button } from '@/components/ui/button';

interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: string;
}

export default function ChatPage({ params }: { params: { chatbotId: string } }) {
  const { chatbotId } = params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('chatbot_id', chatbotId)
        .order('created_at', { ascending: true });
      setMessages(data || []);
    };
    fetchMessages();
  }, [chatbotId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
  const newMessages: Message[] = [...messages, { role: 'user', content: input }];
  setMessages(newMessages);
    setInput('');
    // Stream response
    const res = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatbot_id: chatbotId, messages: newMessages }),
    });
    if (!res.body) return setLoading(false);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let assistantMsg = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      assistantMsg += decoder.decode(value);
      setMessages([...newMessages, { role: 'assistant', content: assistantMsg } as Message]);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 flex flex-col h-[80vh]">
      <div className="flex-1 overflow-y-auto border rounded p-4 bg-white">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'text-right mb-2' : 'text-left mb-2'}>
            <span className={msg.role === 'user' ? 'bg-blue-100 px-2 py-1 rounded' : 'bg-gray-100 px-2 py-1 rounded'}>
              {msg.content}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="flex gap-2 mt-4">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          className="input input-bordered flex-1"
          placeholder="Type your message..."
          title="Message input"
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          {loading ? 'Sending...' : 'Send'}
        </Button>
      </form>
    </div>
  );
}
