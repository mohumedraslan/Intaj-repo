'use client';

import AgentTemplates from '@/components/marketplace/AgentTemplates';

export default function TemplatesPage() {
  return (
    <div className="w-full min-h-screen bg-[#0a0a0b] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <AgentTemplates />
      </div>
    </div>
  );
}
