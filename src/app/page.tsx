'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import DemoChatbot from '@/components/DemoChatbot';
import Header from '@/components/Header';

export default function Home() {
  useEffect(() => {
    // Animate counters for stats
    const animateCounter = (selector: string, target: number, format?: (n: number) => string) => {
      const el = document.querySelector(selector);
      if (!el) return;
      let current = 0;
      const increment = target / 60;
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        el.textContent = format ? format(current) : Math.floor(current).toString();
      }, 16);
    };
    animateCounter('#stat-messages', 2500000, n => (n / 1000000).toFixed(1) + 'M+');
    animateCounter('#stat-satisfaction', 98, n => Math.floor(n) + '%');
    animateCounter('#stat-availability', 24, n => Math.floor(n).toString());
    animateCounter('#stat-roi', 150, n => Math.floor(n) + '%');
  }, []);

  return (
    <main className="w-full min-h-screen bg-[#0a0a0b] text-[#f8fafc] font-sans antialiased">
      <Header />

      {/* Main Content */}
      <section className="w-full min-h-screen flex flex-col items-center justify-center pt-32 pb-12 px-0 bg-[#0a0a0b] relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 neural-grid opacity-20"></div>
          <div className="absolute top-0 left-0 w-full h-full">
            {/* Neural nodes will be added by JavaScript */}
          </div>
        </div>

        {/* Hero Content */}
        <div className="w-full flex flex-col md:flex-row items-center justify-between px-8 max-w-7xl mx-auto relative z-10">
          {/* Left Side - Text Content */}
          <div className="flex-1 flex flex-col items-center md:items-start">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-center md:text-left">
              The{' '}
              <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
                AI Automation
              </span>
              <br />
              Platform That{' '}
              <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
                Never Sleeps
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl text-center md:text-left">
              Transform your business with intelligent chatbots, automated workflows, and seamless
              multi-channel engagement. Built for the future of customer interaction.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link
                href="/signup"
                className="bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-4 rounded-lg text-white font-semibold text-lg hover:opacity-90 transition-all duration-300 transform hover:-translate-y-1 shadow-2xl animate-glow"
              >
                Get Started - Free for Limited Time
              </Link>
              <a
                href="#demo"
                className="flex items-center space-x-2 px-8 py-4 rounded-lg border border-gray-600 text-gray-200 hover:border-blue-500 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Try Demo</span>
              </a>
            </div>
            <div className="flex items-center space-x-8 text-gray-400 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>No Credit Card Required</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span>Setup in 5 Minutes</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                <span>24/7 AI Support</span>
              </div>
            </div>
          </div>

          {/* Right Side - Demo Chatbot */}
          <div
            id="demo"
            className="w-full md:w-auto mt-12 md:mt-0 flex justify-center md:justify-end"
          >
            <div className="transform hover:scale-105 transition-transform duration-300">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 rounded-xl blur opacity-30"></div>
                <DemoChatbot />
              </div>
            </div>
          </div>
        </div>

        {/* Floating Animation Elements */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl floating-element-1"></div>
        <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl floating-element-2"></div>
      </section>

      {/* Features Section */}
      <section id="features" className="w-full py-20 bg-[#18191c] flex justify-center">
        <div className="w-full max-w-6xl bg-[#18191c] rounded-2xl shadow-xl p-12 flex flex-col items-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-center">
            <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
              Powerful Features
            </span>{' '}
            for Modern Businesses
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto text-center mb-12">
            Everything you need to automate customer engagement, boost sales, and scale your
            operations
          </p>
          <div className="grid md:grid-cols-3 gap-8 w-full">
            {/* Feature 1 */}
            <div className="bg-[#23242a] p-8 rounded-2xl flex flex-col items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-center">AI-Powered Chatbots</h3>
              <p className="text-gray-300 mb-6 text-center">
                Deploy intelligent chatbots across websites, Facebook, Instagram, and WhatsApp.
                Handle unlimited conversations with human-like responses.
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  <span>Natural language processing</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  <span>Multi-channel deployment</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  <span>24/7 availability</span>
                </li>
              </ul>
            </div>
            {/* Feature 2 */}
            <div className="bg-[#23242a] p-8 rounded-2xl flex flex-col items-center">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-center">Sales & Marketing Automation</h3>
              <p className="text-gray-300 mb-6 text-center">
                Automate lead generation, nurturing, and conversion with intelligent workflows that
                adapt to customer behavior.
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                  <span>Lead scoring & qualification</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                  <span>Automated follow-ups</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                  <span>Conversion tracking</span>
                </li>
              </ul>
            </div>
            {/* Feature 3 */}
            <div className="bg-[#23242a] p-8 rounded-2xl flex flex-col items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center mb-6">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-center">Advanced Analytics</h3>
              <p className="text-gray-300 mb-6 text-center">
                Get deep insights into customer interactions, bot performance, and conversion
                metrics with real-time dashboards.
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full" />
                  <span>Real-time performance metrics</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full" />
                  <span>Customer journey mapping</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full" />
                  <span>ROI tracking</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="w-full py-20 bg-[#18191c] flex flex-col items-center">
        <div className="w-full max-w-6xl">
          <h2 className="text-4xl font-bold mb-4 text-center">
            Trusted by{' '}
            <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
              10,000+ Businesses
            </span>
          </h2>
          <p className="text-xl text-gray-300 text-center mb-12">
            Join the AI revolution and see why companies choose Intaj
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            <div className="text-center">
              <div
                id="stat-messages"
                className="text-4xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent mb-2"
              >
                2.5M+
              </div>
              <div className="text-gray-300">Messages Processed</div>
            </div>
            <div className="text-center">
              <div
                id="stat-satisfaction"
                className="text-4xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent mb-2"
              >
                98%
              </div>
              <div className="text-gray-300">Customer Satisfaction</div>
            </div>
            <div className="text-center">
              <div
                id="stat-availability"
                className="text-4xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent mb-2"
              >
                24/7
              </div>
              <div className="text-gray-300">AI Availability</div>
            </div>
            <div className="text-center">
              <div
                id="stat-roi"
                className="text-4xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent mb-2"
              >
                150%
              </div>
              <div className="text-gray-300">Average ROI Increase</div>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[#23242a] p-6 rounded-2xl">
              <div className="mb-4">
                <div>
                  <div className="font-semibold">Mohammed Al-Noor</div>
                  <div className="text-gray-400 text-sm">CTO, Future Tech Solutions</div>
                </div>
              </div>
              <p className="text-gray-300 italic">
                &quot;Intaj has transformed our customer support system. We now handle 10x more
                conversations with better satisfaction rates.&quot;
              </p>
            </div>
            <div className="bg-[#23242a] p-6 rounded-2xl">
              <div className="mb-4">
                <div>
                  <div className="font-semibold">Sarah Abdullah</div>
                  <div className="text-gray-400 text-sm">Marketing Director, Growth Co.</div>
                </div>
              </div>
              <p className="text-gray-300 italic">
                &quot;AI automation increased our lead conversion by 300%. It&apos;s like having a
                sales team that works around the clock.&quot;
              </p>
            </div>
            <div className="bg-[#23242a] p-6 rounded-2xl">
              <div className="mb-4">
                <div>
                  <div className="font-semibold">Abdullah Al-Rashid</div>
                  <div className="text-gray-400 text-sm">Founder, Trade Plus</div>
                </div>
              </div>
              <p className="text-gray-300 italic">
                &quot;The setup was incredibly easy. Within hours, we had AI agents working across
                all our social channels.&quot;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-20 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-cyan-900/20 flex flex-col items-center">
        <div className="w-full max-w-4xl text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Ready to{' '}
            <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
              Automate Everything
            </span>
            ?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of businesses already using AI to scale their operations and delight
            customers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/signup"
              className="bg-gradient-to-r from-blue-500 to-purple-500 px-12 py-4 rounded-lg text-white font-bold text-xl hover:opacity-90 transition-all duration-300 transform hover:-translate-y-1 shadow-2xl animate-glow"
            >
              Start Now - Free for Limited Time
            </Link>
            <p className="text-gray-400 text-sm">No Credit Card Required • 5-Minute Setup</p>
          </div>
          <div className="mt-12 text-center text-gray-400">
            <p className="mb-2">Contact Us:</p>
            <a
              href="mailto:nabih.ai.agency@gmail.com"
              className="hover:text-blue-400 transition-colors"
            >
              nabih.ai.agency@gmail.com
            </a>
            <p className="mt-1">
              <a href="tel:+201102481879" className="hover:text-blue-400 transition-colors">
                +20 110 248 1879
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
