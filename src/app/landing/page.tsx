// src/app/landing/page.tsx
'use client';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-white">
      <h1 className="text-4xl font-bold mb-4">Welcome to Intaj Automation Platform</h1>
      <p className="mb-8 text-lg text-gray-700 max-w-xl text-center">
        Build, deploy, and manage AI chatbots, sales agents, marketing automations, and more. Start with chatbots, scale to full automation.
      </p>
      {/* Embeddable widget demo */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Live Chatbot Widget Demo</h2>
        <iframe
          src="https://intaj.nabih.tech/widget/demo"
          style={{ width: 350, height: 500, border: '1px solid #ccc', borderRadius: 12 }}
          title="Chatbot Widget Demo"
        />
      </div>
      <a href="/dashboard" className="px-6 py-3 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition">Go to Dashboard</a>
    </div>
  );
}
