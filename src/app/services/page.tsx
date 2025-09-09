'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import '@/styles/services.css';

export default function ServicesPage() {
  useEffect(() => {
    // Intersection Observer for animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    };

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, observerOptions);

    // Observe all animated elements
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
      observer.observe(el);
    });

    // Add scroll progress indicator
    const progressBar = document.createElement('div');
    progressBar.className =
      'fixed top-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 z-50 transition-all duration-300';
    progressBar.style.width = '0%';
    document.body.appendChild(progressBar);

    const updateProgress = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = (window.scrollY / scrollHeight) * 100;
      progressBar.style.width = `${scrolled}%`;
    };

    window.addEventListener('scroll', updateProgress);

    return () => {
      window.removeEventListener('scroll', updateProgress);
      progressBar.remove();
    };
  }, []);

  return (
    <main className="w-full min-h-screen bg-[#0a0a0b] text-[#f8fafc] font-sans antialiased">
      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center neural-grid relative overflow-hidden pt-20">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-float"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-float delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl animate-float delay-4000"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <div className="animate-slide-up">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="text-gradient">AI-Powered Services</span>
              <br />
              That Transform Your <span className="text-gradient">Business</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto leading-relaxed">
              From intelligent chatbots to automated workflows, discover our comprehensive suite of
              AI services designed to streamline operations and boost growth.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link
                href="#services"
                className="gradient-neural px-8 py-4 rounded-lg text-white font-semibold text-lg hover:opacity-90 transition-all duration-300 transform hover:-translate-y-1 shadow-2xl animate-glow"
              >
                Explore All Services
              </Link>
              <Link
                href="/contact"
                className="flex items-center space-x-2 px-8 py-4 rounded-lg border border-gray-600 text-gray-200 hover:border-blue-500 transition-colors"
              >
                <span>Schedule Consultation</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Core Services Section */}
      <section id="services" className="py-20 bg-[#141517]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 animate-on-scroll">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-gradient">Complete AI Automation</span> Suite
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Everything you need to automate, scale, and optimize your business operations with
              cutting-edge AI technology
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Chatbots & Messaging */}
            <div className="animate-on-scroll">
              <div className="glass-card p-8 rounded-3xl feature-card group">
                <div className="flex items-center mb-6">
                  <div className="w-14 h-14 gradient-neural rounded-2xl flex items-center justify-center mr-4">
                    <svg
                      className="w-7 h-7 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      ></path>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold">AI Chatbots</h3>
                </div>
                <p className="text-gray-300 text-lg mb-6">
                  Intelligent conversational AI that understands your customers and provides
                  instant, accurate responses 24/7.
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center space-x-3">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-300">Natural language processing</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-300">Multi-channel support</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-300">Custom training</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Sales Automation */}
            <div className="animate-on-scroll">
              <div className="glass-card p-8 rounded-3xl feature-card group">
                <div className="flex items-center mb-6">
                  <div className="w-14 h-14 gradient-sales rounded-2xl flex items-center justify-center mr-4">
                    <svg
                      className="w-7 h-7 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      ></path>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold">Sales Automation</h3>
                </div>
                <p className="text-gray-300 text-lg mb-6">
                  Streamline your sales process with AI-powered lead qualification, follow-ups, and
                  conversion optimization.
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center space-x-3">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <span className="text-gray-300">Lead scoring & qualification</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <span className="text-gray-300">Automated follow-ups</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <span className="text-gray-300">Pipeline optimization</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="py-20 bg-[#18191c]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 animate-on-scroll">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Seamless <span className="text-gradient">Integrations</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Connect with your existing tools and platforms for a unified automation experience
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 mb-16">
            {/* Communication */}
            <div className="glass-card p-6 rounded-2xl text-center group hover:border-blue-500/50 transition-all duration-300 animate-on-scroll">
              <div className="w-16 h-16 gradient-neural rounded-2xl mx-auto mb-4 flex items-center justify-center group-hover:animate-pulse">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  ></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Communication</h3>
              <p className="text-gray-400 text-sm">
                WhatsApp, Facebook, Instagram, Telegram, Slack, Discord
              </p>
            </div>

            {/* CRM & Sales */}
            <div className="glass-card p-6 rounded-2xl text-center group hover:border-purple-500/50 transition-all duration-300 animate-on-scroll">
              <div className="w-16 h-16 bg-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center group-hover:animate-pulse">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  ></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">CRM & Sales</h3>
              <p className="text-gray-400 text-sm">
                Salesforce, HubSpot, Pipedrive, Zoho, Monday.com
              </p>
            </div>

            {/* E-commerce */}
            <div className="glass-card p-6 rounded-2xl text-center group hover:border-green-500/50 transition-all duration-300 animate-on-scroll">
              <div className="w-16 h-16 gradient-sales rounded-2xl mx-auto mb-4 flex items-center justify-center group-hover:animate-pulse">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  ></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">E-commerce</h3>
              <p className="text-gray-400 text-sm">
                Shopify, WooCommerce, Magento, BigCommerce, Stripe
              </p>
            </div>

            {/* Analytics */}
            <div className="glass-card p-6 rounded-2xl text-center group hover:border-cyan-500/50 transition-all duration-300 animate-on-scroll">
              <div className="w-16 h-16 gradient-automation rounded-2xl mx-auto mb-4 flex items-center justify-center group-hover:animate-pulse">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  ></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Analytics & Data</h3>
              <p className="text-gray-400 text-sm">
                Google Analytics, Mixpanel, Amplitude, Segment, Zapier
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-cyan-900/20">
        <div className="max-w-4xl mx-auto text-center px-6">
          <div className="glass-card p-12 rounded-3xl animate-on-scroll">
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Ready to <span className="text-gradient">Transform</span> Your Business?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of businesses already using AI automation to scale operations, boost
              sales, and delight customers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/signup"
                className="gradient-neural px-12 py-4 rounded-lg text-white font-bold text-xl hover:opacity-90 transition-all duration-300 transform hover:-translate-y-1 shadow-2xl animate-glow"
              >
                Start Free Trial
              </Link>
              <Link
                href="/contact"
                className="flex items-center space-x-2 px-8 py-4 rounded-lg border border-gray-600 text-gray-200 hover:border-blue-500 transition-colors"
              >
                Contact Sales
              </Link>
            </div>

            {/* Contact Information */}
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
        </div>
      </section>
    </main>
  );
}
