'use client';

import { useState } from 'react';

import '@/styles/pricing.css';

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="pt-32 pb-16 neural-grid relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float delay-2000"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <div className="animate-slide-up">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Simple, <span className="text-gradient">Transparent</span>
              <br />
              <span className="text-gradient">AI Automation</span> Pricing
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto">
              Choose the perfect plan to scale your business with intelligent automation. No hidden
              fees, cancel anytime.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center space-x-4 mb-12">
              <span className="text-gray-300">Monthly</span>
              <button
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${isAnnual ? 'bg-blue-600' : 'bg-gray-700'}`}
                onClick={() => setIsAnnual(!isAnnual)}
                aria-label="Toggle billing period"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${isAnnual ? 'translate-x-5' : 'translate-x-1'}`}
                />
              </button>
              <span className="text-white font-medium">Annual</span>
              <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium">
                Save 20%
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards Section */}
      <section id="pricing" className="py-20 bg-bg-secondary">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Starter Plan */}
            <div className="glass-card p-8 rounded-2xl pricing-card relative animate-scale-in">
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-2">Starter</h3>
                <p className="text-gray-400 mb-6">
                  Perfect for small businesses getting started with AI automation
                </p>
                <div className="flex items-end">
                  <span className="text-5xl font-bold">$0</span>
                  <span className="text-gray-400 ml-2 mb-1">/month</span>
                </div>
                <p className="text-sm text-gray-500">Forever free • No credit card required</p>
              </div>

              <ul className="space-y-4 mb-8">
                <PricingFeature text="1 AI Chatbot" included />
                <PricingFeature text="100 conversations/month" included />
                <PricingFeature text="Website widget integration" included />
                <PricingFeature text="Basic analytics" included />
                <PricingFeature text="Email support" included />
                <PricingFeature text="Multi-channel integrations" included={false} />
              </ul>

              <a href="/dashboard" className="block w-full">
                <button className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 px-6 rounded-lg font-medium transition-colors duration-200">
                  Get Started Free
                </button>
              </a>
            </div>

            {/* Professional Plan */}
            <div className="glass-card-popular p-8 rounded-2xl pricing-card relative animate-scale-in delay-200">
              <div className="popular-badge">Most Popular</div>

              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-2">Professional</h3>
                <p className="text-gray-400 mb-6">
                  Ideal for growing businesses ready to scale their automation
                </p>
                <div className="flex items-end">
                  <span className={`text-5xl font-bold text-gradient ${!isAnnual ? '' : 'hidden'}`}>
                    $49
                  </span>
                  <span className={`text-5xl font-bold text-gradient ${isAnnual ? '' : 'hidden'}`}>
                    $39
                  </span>
                  <span className="text-gray-400 ml-2 mb-1">/month</span>
                </div>
                <p className={`text-sm text-gray-500 ${!isAnnual ? '' : 'hidden'}`}>
                  Billed monthly • 14-day free trial
                </p>
                <p className={`text-sm text-gray-500 ${isAnnual ? '' : 'hidden'}`}>
                  Billed annually • Save $120/year
                </p>
              </div>

              <ul className="space-y-4 mb-8">
                <PricingFeature text="5 AI Chatbots" included />
                <PricingFeature text="5,000 conversations/month" included />
                <PricingFeature text="Multi-channel integrations" included />
                <PricingFeature text="Facebook & Instagram" included />
                <PricingFeature text="Advanced analytics" included />
                <PricingFeature text="Priority support" included />
                <PricingFeature text="API access" included />
              </ul>

              <a href="/pricing/checkout?plan=professional" className="block w-full">
                <button className="w-full gradient-neural text-white py-3 px-6 rounded-lg font-medium hover:opacity-90 transition-all duration-200 transform hover:-translate-y-1 shadow-lg hover:shadow-xl animate-glow">
                  Start Free Trial
                </button>
              </a>
            </div>

            {/* Enterprise Plan */}
            <div className="glass-card p-8 rounded-2xl pricing-card relative animate-scale-in delay-400">
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
                <p className="text-gray-400 mb-6">
                  For large organizations needing advanced automation and support
                </p>
                <div className="flex items-end">
                  <span className={`text-5xl font-bold text-gradient ${!isAnnual ? '' : 'hidden'}`}>
                    $149
                  </span>
                  <span className={`text-5xl font-bold text-gradient ${isAnnual ? '' : 'hidden'}`}>
                    $119
                  </span>
                  <span className="text-gray-400 ml-2 mb-1">/month</span>
                </div>
                <p className={`text-sm text-gray-500 ${!isAnnual ? '' : 'hidden'}`}>
                  Billed monthly • Custom setup included
                </p>
                <p className={`text-sm text-gray-500 ${isAnnual ? '' : 'hidden'}`}>
                  Billed annually • Save $360/year
                </p>
              </div>

              <ul className="space-y-4 mb-8">
                <PricingFeature text="Unlimited AI Chatbots" included />
                <PricingFeature text="50,000+ conversations/month" included />
                <PricingFeature text="All channel integrations" included />
                <PricingFeature text="WhatsApp Business API" included />
                <PricingFeature text="Custom integrations" included />
                <PricingFeature text="Dedicated account manager" included />
                <PricingFeature text="24/7 phone & chat support" included />
                <PricingFeature text="SLA & uptime guarantee" included />
              </ul>

              <a href="/pricing/checkout?plan=enterprise" className="block w-full">
                <button className="w-full gradient-automation text-white py-3 px-6 rounded-lg font-medium hover:opacity-90 transition-all duration-200 transform hover:-translate-y-1 shadow-lg hover:shadow-xl">
                  Contact Sales
                </button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-bg-secondary">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Frequently Asked <span className="text-gradient">Questions</span>
            </h2>
            <p className="text-xl text-gray-300">Everything you need to know about Intaj pricing</p>
          </div>

          <div className="space-y-6">
            <FaqItem
              question="How does the free trial work?"
              answer="Start with a 14-day free trial of our Professional plan. No credit card required. You can create chatbots, connect channels, and explore all features. After the trial, choose to upgrade or continue with our free Starter plan."
            />
            <FaqItem
              question="Can I change plans anytime?"
              answer="Yes! Upgrade or downgrade your plan anytime. Upgrades take effect immediately, and downgrades take effect at your next billing cycle. You'll always have access to your current plan features until the billing period ends."
            />
            <FaqItem
              question="What happens if I exceed my conversation limit?"
              answer="We'll notify you when you reach 80% of your limit. If you exceed it, your chatbots will continue working, but you'll be charged for additional conversations at $0.01 per conversation. You can upgrade your plan anytime to get a higher limit."
            />
            <FaqItem
              question="Do you offer custom enterprise solutions?"
              answer="Absolutely! For organizations with unique requirements, we offer custom enterprise solutions including on-premise deployment, custom integrations, dedicated infrastructure, and specialized support. Contact our sales team to discuss your needs."
            />
            <FaqItem
              question="Is there a setup fee?"
              answer="No setup fees for any plan. You only pay your monthly or annual subscription. Enterprise customers get complimentary setup assistance and onboarding support from our team."
            />
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-cyan-900/20">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Ready to <span className="text-gradient">Transform Your Business</span>?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of companies already automating their customer engagement with AI.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <button className="gradient-neural px-12 py-4 rounded-lg text-white font-bold text-xl hover:opacity-90 transition-all duration-300 transform hover:-translate-y-1 shadow-2xl animate-glow">
              Start Your Free Trial
            </button>
            <button className="flex items-center space-x-2 px-8 py-4 rounded-lg border border-gray-600 text-gray-200 hover:border-blue-500 transition-colors">
              <span>Talk to Sales</span>
            </button>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-8 text-gray-400 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>14-Day Free Trial</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>No Credit Card Required</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <span>Cancel Anytime</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Components
function PricingFeature({ text, included }: { text: string; included: boolean }) {
  return (
    <li className="flex items-center space-x-3">
      <div
        className={`w-5 h-5 ${included ? 'bg-blue-500' : 'bg-gray-500'} rounded-full flex items-center justify-center`}
      >
        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d={
              included
                ? 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                : 'M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'
            }
            clipRule="evenodd"
          />
        </svg>
      </div>
      <span className={`text-gray-200 ${!included && 'opacity-50'}`}>{text}</span>
    </li>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="glass-card p-6 rounded-xl">
      <button
        className="w-full text-left flex items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen ? 'true' : 'false'}
      >
        <h3 className="text-lg font-semibold">{question}</h3>
        <svg
          className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`mt-4 text-gray-300 ${isOpen ? 'block' : 'hidden'}`}>
        <p>{answer}</p>
      </div>
    </div>
  );
}
