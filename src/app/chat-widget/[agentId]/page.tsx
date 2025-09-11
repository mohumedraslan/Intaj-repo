'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ChatWidget from '@/components/chat/ChatWidget';

interface Agent {
  id: string;
  name: string;
  description?: string;
  model: string;
  settings: {
    customInstructions?: string;
    welcomeMessage?: string;
    primaryColor?: string;
  };
  created_at: string;
}

export default function ChatWidgetEmbedPage() {
  const params = useParams();
  const agentId = params?.agentId as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) {
      setError("Agent ID is missing.");
      setLoading(false);
      return;
    }

    const fetchAgent = async () => {
      // This is a public page, so we fetch chatbot data without user authentication.
      // RLS policies on the 'chatbots' table must allow public read access.
      const { data, error } = await supabase
        .from('chatbots')
        .select('*')
        .eq('id', agentId)
        .single();

      if (error) {
        console.error("Error fetching agent:", error);
        setError("Could not load agent data. Please check the agent ID.");
      } else {
        setAgent(data);
      }
      setLoading(false);
    };

    fetchAgent();
  }, [agentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-transparent">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-red-100 text-red-700 p-4">
        <p>{error || "Agent not found."}</p>
      </div>
    );
  }

  const widgetConfig = {
    botName: agent.name,
    welcomeMessage: agent.settings?.welcomeMessage || `Hi! I'm ${agent.name}. How can I help you?`,
    primaryColor: agent.settings?.primaryColor || '#3b82f6',
    position: 'bottom-right' as const, // This prop might not be used if the parent window controls position
    allowFileUpload: false, // For simplicity, disable file uploads in this version
  };

  return (
    <div className="h-screen w-screen bg-transparent">
        <ChatWidget {...widgetConfig} />
    </div>
  );
}
