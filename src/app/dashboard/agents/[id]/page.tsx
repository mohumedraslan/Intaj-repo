// Redirect to the existing chatbots/[id] route for now
// This maintains backward compatibility while we transition
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AgentEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  useEffect(() => {
    // Redirect to the existing chatbots route
    if (id) {
      router.replace(`/dashboard/chatbots/${id}`);
    }
  }, [id, router]);

  return (
    <div className="w-full min-h-screen bg-[#0a0a0b] text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-48 mb-6"></div>
          <div className="h-64 bg-gray-700 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
}
