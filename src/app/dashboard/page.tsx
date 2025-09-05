// src/app/dashboard/page.tsx
'use client';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 space-y-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <ul className="space-y-2">
        <li><Link href="/dashboard/chatbots" className="text-blue-600 hover:underline">Manage Chatbots</Link></li>
        <li><Link href="/dashboard/faqs" className="text-blue-600 hover:underline">Edit FAQs</Link></li>
        <li><Link href="/dashboard/data_sources" className="text-blue-600 hover:underline">Upload Data Sources</Link></li>
      </ul>
    </div>
  );
}
