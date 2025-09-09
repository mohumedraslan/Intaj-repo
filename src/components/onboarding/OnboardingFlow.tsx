'use client';
import { useState, useEffect } from 'react';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Bot,
  MessageSquare,
  Users,
  BarChart3,
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface OnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function OnboardingFlow({ isOpen, onClose, onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Intaj AI',
      description: 'Your AI automation platform that never sleeps',
      icon: <Sparkles className="w-8 h-8 text-blue-500" />,
      content: (
        <div className="text-center space-y-6">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white mb-4">
              Welcome to the Future of AI Automation
            </h3>
            <p className="text-gray-300 text-lg leading-relaxed">
              Intaj AI helps you automate customer engagement across multiple channels with
              intelligent chatbots, seamless integrations, and powerful analytics. Let's get you
              started!
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <div className="text-blue-400 font-semibold">Multi-Channel</div>
              <div className="text-gray-300 text-sm">WhatsApp, Facebook, Instagram, Website</div>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <div className="text-purple-400 font-semibold">24/7 AI Support</div>
              <div className="text-gray-300 text-sm">Never miss a customer inquiry</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'chatbots',
      title: 'Create Your First Chatbot',
      description: 'Build intelligent AI assistants for your business',
      icon: <Bot className="w-8 h-8 text-purple-500" />,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">AI-Powered Chatbots</h3>
            <p className="text-gray-300">
              Create intelligent chatbots that understand context and provide human-like responses.
            </p>
          </div>

          <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700">
            <h4 className="font-semibold text-white mb-4">Key Features:</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-400" />
                <span className="text-gray-300">Natural language processing</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-400" />
                <span className="text-gray-300">Custom knowledge base integration</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-400" />
                <span className="text-gray-300">Multi-language support</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-400" />
                <span className="text-gray-300">Automated workflows</span>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity">
              Create Your First Chatbot
            </button>
          </div>
        </div>
      ),
    },
    {
      id: 'channels',
      title: 'Connect Your Channels',
      description: 'Integrate with WhatsApp, Facebook, Instagram, and more',
      icon: <MessageSquare className="w-8 h-8 text-cyan-500" />,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Multi-Channel Integration</h3>
            <p className="text-gray-300">
              Connect your chatbots to all major messaging platforms and your website.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div className="font-semibold text-white">WhatsApp</div>
              <div className="text-green-400 text-sm">Business API</div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div className="font-semibold text-white">Facebook</div>
              <div className="text-blue-400 text-sm">Messenger</div>
            </div>
            <div className="bg-pink-500/10 border border-pink-500/20 rounded-lg p-4 text-center">
              <div className="w-12 h-12 bg-pink-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div className="font-semibold text-white">Instagram</div>
              <div className="text-pink-400 text-sm">Direct Messages</div>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 text-center">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div className="font-semibold text-white">Website</div>
              <div className="text-purple-400 text-sm">Chat Widget</div>
            </div>
          </div>

          <div className="text-center">
            <button className="bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity">
              Connect Your First Channel
            </button>
          </div>
        </div>
      ),
    },
    {
      id: 'team',
      title: 'Invite Your Team',
      description: 'Collaborate with team members and manage permissions',
      icon: <Users className="w-8 h-8 text-green-500" />,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Team Collaboration</h3>
            <p className="text-gray-300">
              Invite team members and manage roles to work together effectively.
            </p>
          </div>

          <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700">
            <h4 className="font-semibold text-white mb-4">Team Roles:</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">Owner</div>
                  <div className="text-gray-400 text-sm">Full access to all features</div>
                </div>
                <div className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">
                  Full Access
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">Admin</div>
                  <div className="text-gray-400 text-sm">Manage chatbots and team members</div>
                </div>
                <div className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs">
                  Admin
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">Agent</div>
                  <div className="text-gray-400 text-sm">Handle conversations and support</div>
                </div>
                <div className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                  Limited
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity">
              Invite Team Members
            </button>
          </div>
        </div>
      ),
    },
    {
      id: 'analytics',
      title: 'Track Your Success',
      description: 'Monitor performance with detailed analytics and insights',
      icon: <BarChart3 className="w-8 h-8 text-orange-500" />,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Advanced Analytics</h3>
            <p className="text-gray-300">
              Get insights into your chatbot performance and customer interactions.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/30 rounded-lg p-4 text-center border border-gray-700">
              <div className="text-2xl font-bold text-orange-400 mb-1">98%</div>
              <div className="text-gray-300 text-sm">Customer Satisfaction</div>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-4 text-center border border-gray-700">
              <div className="text-2xl font-bold text-blue-400 mb-1">24/7</div>
              <div className="text-gray-300 text-sm">AI Availability</div>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-4 text-center border border-gray-700">
              <div className="text-2xl font-bold text-green-400 mb-1">2.5M+</div>
              <div className="text-gray-300 text-sm">Messages Processed</div>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-4 text-center border border-gray-700">
              <div className="text-2xl font-bold text-purple-400 mb-1">150%</div>
              <div className="text-gray-300 text-sm">ROI Increase</div>
            </div>
          </div>

          <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700">
            <h4 className="font-semibold text-white mb-4">Analytics Features:</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-400" />
                <span className="text-gray-300">Real-time conversation monitoring</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-400" />
                <span className="text-gray-300">Customer satisfaction tracking</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-400" />
                <span className="text-gray-300">Performance metrics and KPIs</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-400" />
                <span className="text-gray-300">Custom reports and exports</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1b1e] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Getting Started with Intaj AI</h2>
              <p className="text-gray-400 text-sm">
                Step {currentStep + 1} of {steps.length}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => handleStepClick(index)}
                className={`flex-1 h-2 rounded-full transition-all ${
                  index <= currentStep
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                    : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            {steps.map((step, index) => (
              <span key={step.id} className={`${index === currentStep ? 'text-blue-400' : ''}`}>
                {step.title}
              </span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[60vh]">{steps[currentStep].content}</div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex items-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-blue-500 w-6'
                    : completedSteps.has(index)
                      ? 'bg-green-500'
                      : 'bg-gray-600'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-2 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity"
          >
            {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
