// src/app/api/chat/stream/route.ts
import { NextRequest } from 'next/server';
import { supabase } from '@/lib/storageClient';
import { streamChatResponse } from '@/lib/openrouter';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const { chatbot_id, messages } = await req.json();
  // Save user message
  const userMsg = messages[messages.length - 1];
  await supabase.from('messages').insert({
    chatbot_id,
    role: 'user',
    content: userMsg.content,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let assistantContent = '';
      await streamChatResponse({
        model: 'gpt-3.5-turbo',
        messages,
        onToken(token: string) {
          assistantContent += token;
          controller.enqueue(encoder.encode(token));
        },
      });
      // Save assistant message
      await supabase.from('messages').insert({
        chatbot_id,
        role: 'assistant',
        content: assistantContent,
      });
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}
