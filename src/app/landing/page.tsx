// src/app/landing/page.tsx
'use client';

import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-white">
      <section className="w-full max-w-5xl flex flex-col items-center text-center py-16">
        <img src="/logo.svg" alt="Intaj Logo" className="h-20 w-20 mb-4" />
        <h1 className="text-5xl font-extrabold text-blue-700 mb-4">Welcome to Intaj Automation Platform</h1>
        <p className="mb-8 text-lg text-gray-700 max-w-2xl">
          Build, deploy, and manage AI chatbots, sales agents, marketing automations, and more. Start with chatbots, scale to full automation.
        </p>
        <div className="flex flex-wrap gap-4 justify-center mb-10">
          <Link href="/dashboard" className="px-6 py-3 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition">Dashboard</Link>
          <Link href="/agents" className="px-6 py-3 bg-gray-200 text-blue-700 rounded shadow hover:bg-gray-300 transition">Agents</Link>
          <Link href="/login" className="px-6 py-3 bg-gray-200 text-blue-700 rounded shadow hover:bg-gray-300 transition">Login</Link>
          <Link href="/signup" className="px-6 py-3 bg-gray-200 text-blue-700 rounded shadow hover:bg-gray-300 transition">Sign Up</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 w-full">
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
            <img src="/file.svg" alt="Chatbots" className="h-10 w-10 mb-2" />
            <h3 className="font-bold text-lg mb-1">AI Chatbots</h3>
            <p className="text-gray-500 text-sm">Conversational bots for support, sales, and automation.</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
            <img src="/window.svg" alt="Agents" className="h-10 w-10 mb-2" />
            <h3 className="font-bold text-lg mb-1">Automation Agents</h3>
            <p className="text-gray-500 text-sm">Sales, marketing, and content agents (coming soon).</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
            <img src="/globe.svg" alt="Integrations" className="h-10 w-10 mb-2" />
            <h3 className="font-bold text-lg mb-1">Integrations</h3>
            <p className="text-gray-500 text-sm">Connect to Facebook, WhatsApp, Instagram, and more.</p>
          </div>
        </div>
        {/* Testimonials */}
        <div className="mb-12 w-full">
          <h2 className="text-2xl font-bold mb-6 text-blue-700">What Our Users Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg p-6 shadow flex flex-col items-center">
              <div className="font-bold text-blue-700 mb-2">"Intaj made our sales team 2x more productive!"</div>
              <div className="text-gray-500 text-sm">— Sarah, Sales Lead</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-6 shadow flex flex-col items-center">
              <div className="font-bold text-blue-700 mb-2">"The chatbot widget is so easy to embed and customize."</div>
              <div className="text-gray-500 text-sm">— Ahmed, Startup Founder</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-6 shadow flex flex-col items-center">
              <div className="font-bold text-blue-700 mb-2">"We connected WhatsApp and Facebook in minutes!"</div>
              <div className="text-gray-500 text-sm">— Lina, Marketing Manager</div>
            </div>
          </div>
        </div>
        {/* Embeddable widget demo */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Live Chatbot Widget Demo</h2>
          <iframe
            src="https://intaj.nabih.tech/widget/demo"
            style={{ width: 350, height: 500, border: '1px solid #ccc', borderRadius: 12 }}
            title="Chatbot Widget Demo"
          />
        </div>
        <Link href="/dashboard" className="px-8 py-4 bg-blue-700 text-white rounded-lg shadow-lg text-xl font-bold hover:bg-blue-800 transition mt-4">Get Started</Link>
      </section>
    </div>
  );
}
