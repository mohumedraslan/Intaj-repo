// src/app/dashboard/page.tsx
'use client';
// ...existing code...

import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="py-8">
      <h1 className="text-3xl font-extrabold text-blue-700 mb-8">Welcome to your Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
          <span className="text-2xl mb-2">🤖</span>
          <h3 className="font-bold text-lg mb-1">Chatbots</h3>
          <p className="text-gray-500 text-sm mb-2">Manage your AI chatbots and automations.</p>
          <Link href="/dashboard/chatbots" className="text-blue-600 hover:underline">Go to Chatbots</Link>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
          <span className="text-2xl mb-2">📄</span>
          <h3 className="font-bold text-lg mb-1">FAQs</h3>
          <p className="text-gray-500 text-sm mb-2">Edit your chatbot FAQs and knowledge base.</p>
          <Link href="/dashboard/faqs" className="text-blue-600 hover:underline">Edit FAQs</Link>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
          <span className="text-2xl mb-2">📁</span>
          <h3 className="font-bold text-lg mb-1">Data Sources</h3>
          <p className="text-gray-500 text-sm mb-2">Upload files and connect data sources.</p>
          <Link href="/dashboard/data_sources" className="text-blue-600 hover:underline">Upload Data</Link>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 rounded-lg p-6 shadow flex flex-col items-center">
          <h4 className="font-bold text-blue-700 mb-2">Quick Start</h4>
          <ul className="text-gray-700 text-sm list-disc list-inside">
            <li>Connect your first platform (WhatsApp, Facebook, etc)</li>
            <li>Create your first chatbot or agent</li>
            <li>Embed the widget on your website</li>
          </ul>
        </div>
        <div className="bg-blue-50 rounded-lg p-6 shadow flex flex-col items-center">
          <h4 className="font-bold text-blue-700 mb-2">Your Stats (coming soon)</h4>
          <div className="text-3xl font-bold text-blue-700 mb-2">--</div>
          <div className="text-gray-500">Usage, analytics, and more</div>
        </div>
      </div>
    </div>
  );
}
