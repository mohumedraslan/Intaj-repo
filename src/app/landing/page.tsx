// src/app/landing/page.tsx
'use client';

import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="w-full min-h-screen bg-[#0a0a0b] text-[#f8fafc] flex flex-col items-center py-16 px-4 relative">
      <div className="absolute inset-0 overflow-hidden neural-grid">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-float delay-2000"></div>
      </div>
      <style jsx>{`
        .glass-card {
          background: rgba(31, 32, 36, 0.8);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(59, 130, 246, 0.1);
        }
        .text-gradient {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6, #06b6d4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .neural-grid {
          background-image: 
            radial-gradient(circle at 1px 1px, rgba(59, 130, 246, 0.15) 1px, transparent 0);
          background-size: 20px 20px;
        }
        @keyframes glow {
          0% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
          100% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.6); }
        }
        .animate-glow {
          animation: glow 2s ease-in-out infinite alternate;
        }
      `}</style>
      <section className="w-full max-w-[100vw] mx-auto flex flex-col items-center text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <div className="w-8 h-8 bg-white rounded-sm opacity-90"></div>
          </div>
          <span className="text-4xl font-bold text-gradient">Intaj</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4 text-gradient">
          Welcome to Intaj AI Platform
        </h1>
        <p className="mb-8 text-lg md:text-2xl text-gray-300 max-w-3xl font-medium mx-auto">
          Build, deploy, and manage AI chatbots, sales agents, marketing automations, and more. Start with chatbots, scale to full automation.
        </p>
        <div className="flex flex-col items-center gap-4 mb-10">
          <div className="flex flex-wrap gap-4 justify-center">
            <Link 
              href="/signup" 
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-lg hover:opacity-90 transition-all duration-300 transform hover:-translate-y-1 font-bold text-lg"
            >
              Start Now - Free Trial Available
            </Link>
            <Link 
              href="/features" 
              className="px-8 py-4 bg-white text-gray-800 border-2 border-gray-200 rounded-lg shadow-lg hover:border-blue-500 transition-all duration-300 transform hover:-translate-y-1 font-bold text-lg"
            >
              Features
            </Link>
          </div>
          <div className="text-sm text-gray-600 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Setup in 5 minutes</span>
            </div>
          </div>
        </div>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 w-full max-w-[100vw]">
          <div className="bg-gradient-to-br from-blue-50 via-white to-blue-100 rounded-2xl shadow-xl p-8 flex flex-col items-center border border-blue-100 hover:scale-105 transition-transform">
            <Image src="/ai-chatbots.svg" alt="AI Chatbots" width={56} height={56} className="mb-3" />
            <h3 className="font-bold text-lg mb-1 text-blue-700">AI Chatbots</h3>
            <p className="text-gray-600 text-sm">Conversational bots for support, sales, and automation.</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 via-white to-green-100 rounded-2xl shadow-xl p-8 flex flex-col items-center border border-green-100 hover:scale-105 transition-transform">
            <Image src="/automation-agents.svg" alt="Automation Agents" width={56} height={56} className="mb-3" />
            <h3 className="font-bold text-lg mb-1 text-green-700">Automation Agents</h3>
            <p className="text-gray-600 text-sm">Sales, marketing, and content agents (coming soon).</p>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 via-white to-indigo-100 rounded-2xl shadow-xl p-8 flex flex-col items-center border border-indigo-100 hover:scale-105 transition-transform">
            <Image src="/agents-coming-soon.svg" alt="Integrations" width={56} height={56} className="mb-3" />
            <h3 className="font-bold text-lg mb-1 text-indigo-700">Integrations</h3>
            <p className="text-gray-600 text-sm">Connect to Facebook, WhatsApp, Instagram, and more.</p>
          </div>
        </div>
        {/* Testimonials */}
        <div className="mb-12 w-full">
          <h2 className="text-2xl font-bold mb-6 text-gradient">What Our Users Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 rounded-xl hover:border-blue-500/30 transition-colors">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  S
                </div>
                <div>
                  <div className="font-semibold text-gray-800">Sarah Thompson</div>
                  <div className="text-sm text-gray-500">Sales Lead</div>
                </div>
              </div>
              <p className="text-gray-700">&quot;Intaj made our sales team 2x more productive! The AI automation has transformed how we handle customer inquiries.&quot;</p>
            </div>
            <div className="glass-card p-6 rounded-xl hover:border-purple-500/30 transition-colors">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                  M
                </div>
                <div>
                  <div className="font-semibold text-gray-800">Michael Chen</div>
                  <div className="text-sm text-gray-500">Startup Founder</div>
                </div>
              </div>
              <p className="text-gray-700">&quot;The chatbot widget is incredibly easy to embed and customize. It took us minutes to set up and start engaging with customers.&quot;</p>
            </div>
            <div className="glass-card p-6 rounded-xl hover:border-cyan-500/30 transition-colors">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold">
                  E
                </div>
                <div>
                  <div className="font-semibold text-gray-800">Emily Parker</div>
                  <div className="text-sm text-gray-500">Marketing Manager</div>
                </div>
              </div>
              <p className="text-gray-700">&quot;We connected our WhatsApp and Facebook channels in minutes! The omnichannel support has been a game-changer.&quot;</p>
            </div>
          </div>
        </div>
        <Link 
          href="/signup" 
          className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-lg text-xl font-bold hover:opacity-90 transition-all duration-300 transform hover:-translate-y-1 mt-4 animate-glow"
        >
          Start Your Free Trial Today
        </Link>
      </section>
    </div>

  );
}
