// src/app/dashboard/chatbots/new/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import EditChatbotPage from '../[id]/page';

export default function NewChatbotPage() {
  const router = useRouter();
  
  // Pass null as the ID to indicate this is a new chatbot
  return <EditChatbotPage params={{ id: 'new' }} />;
}