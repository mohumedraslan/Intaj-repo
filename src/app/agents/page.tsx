// src/app/agents/page.tsx
import Image from "next/image";

export default function AgentsPage() {
  return (
    <div className="py-8">
      <h1 className="text-3xl font-extrabold text-blue-700 mb-8">Your Automation Agents</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
          <Image src="/ai-chatbots.svg" alt="AI Chatbots" width={48} height={48} className="mb-2" />
          <h3 className="font-bold text-lg mb-1">Chatbot Agents</h3>
          <p className="text-gray-500 text-sm mb-2">Conversational AI for support, sales, and more.</p>
          <span className="text-xs text-blue-600">Active</span>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center opacity-60">
          <Image src="/automation-agents.svg" alt="Automation Agents" width={48} height={48} className="mb-2" />
          <h3 className="font-bold text-lg mb-1">Sales Agents</h3>
          <p className="text-gray-500 text-sm mb-2">Automate sales outreach and follow-up.</p>
          <span className="text-xs text-gray-400">Coming soon</span>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center opacity-60">
          <Image src="/agents-coming-soon.svg" alt="Agents Coming Soon" width={48} height={48} className="mb-2" />
          <h3 className="font-bold text-lg mb-1">Marketing Agents</h3>
          <p className="text-gray-500 text-sm mb-2">Automate campaigns and content creation.</p>
          <span className="text-xs text-gray-400">Coming soon</span>
        </div>
      </div>
      <div className="bg-blue-50 rounded-lg p-6 shadow flex flex-col items-center">
        <h4 className="font-bold text-blue-700 mb-2">What are agents?</h4>
        <p className="text-gray-700 text-sm">Agents are AI-powered automations for sales, marketing, support, and more. More types coming soon!</p>
      </div>
    </div>
  );
}
