'use client';
import { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, ArrowLeft, Target, Lightbulb, Zap } from 'lucide-react';

interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void;
}

interface GuidedTourProps {
  tourId: string;
  steps: TourStep[];
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export default function GuidedTour({
  tourId,
  steps,
  isActive,
  onComplete,
  onSkip,
}: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !steps[currentStep]) return;

    const target = document.querySelector(steps[currentStep].target) as HTMLElement;
    if (target) {
      setTargetElement(target);
      calculateTooltipPosition(target, steps[currentStep].position);

      // Highlight the target element
      target.style.position = 'relative';
      target.style.zIndex = '1001';
      target.style.boxShadow =
        '0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.2)';
      target.style.borderRadius = '8px';

      // Scroll target into view
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return () => {
      if (target) {
        target.style.position = '';
        target.style.zIndex = '';
        target.style.boxShadow = '';
        target.style.borderRadius = '';
      }
    };
  }, [currentStep, isActive, steps]);

  const calculateTooltipPosition = (target: HTMLElement, position: string) => {
    const targetRect = target.getBoundingClientRect();
    const tooltipWidth = 320;
    const tooltipHeight = 200;
    const offset = 16;

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = targetRect.top - tooltipHeight - offset;
        left = targetRect.left + (targetRect.width - tooltipWidth) / 2;
        break;
      case 'bottom':
        top = targetRect.bottom + offset;
        left = targetRect.left + (targetRect.width - tooltipWidth) / 2;
        break;
      case 'left':
        top = targetRect.top + (targetRect.height - tooltipHeight) / 2;
        left = targetRect.left - tooltipWidth - offset;
        break;
      case 'right':
        top = targetRect.top + (targetRect.height - tooltipHeight) / 2;
        left = targetRect.right + offset;
        break;
    }

    // Keep tooltip within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < 16) left = 16;
    if (left + tooltipWidth > viewportWidth - 16) left = viewportWidth - tooltipWidth - 16;
    if (top < 16) top = 16;
    if (top + tooltipHeight > viewportHeight - 16) top = viewportHeight - tooltipHeight - 16;

    setTooltipPosition({ top, left });
  };

  const handleNext = () => {
    if (steps[currentStep].action) {
      steps[currentStep].action!();
    }

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

  if (!isActive || !steps[currentStep]) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 z-1000 pointer-events-none" />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-1002 bg-[#1a1b1e] border border-gray-700 rounded-xl shadow-2xl w-80 pointer-events-auto"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Target className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">{steps[currentStep].title}</h3>
              <p className="text-xs text-gray-400">
                Step {currentStep + 1} of {steps.length}
              </p>
            </div>
          </div>
          <button onClick={onSkip} className="text-gray-400 hover:text-white transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-300 text-sm leading-relaxed mb-4">{steps[currentStep].content}</p>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1 mb-4">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-blue-500 w-4'
                    : index < currentStep
                      ? 'bg-green-500'
                      : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-3 py-1.5 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <ArrowLeft className="w-3 h-3" />
            Back
          </button>

          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            Skip Tour
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-1.5 rounded-lg text-white font-medium hover:opacity-90 transition-opacity text-sm"
          >
            {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </>
  );
}

// Predefined tours for different pages
export const dashboardTour: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Your Dashboard',
    content:
      'This is your main dashboard where you can see an overview of all your chatbots, conversations, and key metrics.',
    target: "[data-tour='dashboard-overview']",
    position: 'bottom',
  },
  {
    id: 'chatbots',
    title: 'Your Chatbots',
    content:
      'Here you can see all your active chatbots. Click on any chatbot to view detailed analytics or make changes.',
    target: "[data-tour='chatbots-section']",
    position: 'top',
  },
  {
    id: 'analytics',
    title: 'Real-time Analytics',
    content:
      'Monitor your chatbot performance with real-time metrics including messages, satisfaction rates, and response times.',
    target: "[data-tour='analytics-cards']",
    position: 'left',
  },
  {
    id: 'quick-actions',
    title: 'Quick Actions',
    content:
      'Use these buttons to quickly create new chatbots, connect channels, or access important features.',
    target: "[data-tour='quick-actions']",
    position: 'bottom',
  },
];

export const chatbotTour: TourStep[] = [
  {
    id: 'create-chatbot',
    title: 'Create Your First Chatbot',
    content:
      'Click here to start creating a new AI chatbot. You can customize its personality, knowledge base, and behavior.',
    target: "[data-tour='create-chatbot-btn']",
    position: 'bottom',
  },
  {
    id: 'chatbot-settings',
    title: 'Chatbot Configuration',
    content:
      "Configure your chatbot's name, description, AI model, and system prompts to match your brand voice.",
    target: "[data-tour='chatbot-settings']",
    position: 'right',
  },
  {
    id: 'knowledge-base',
    title: 'Knowledge Base',
    content:
      'Upload documents, FAQs, and training data to make your chatbot more intelligent and context-aware.',
    target: "[data-tour='knowledge-base']",
    position: 'left',
  },
  {
    id: 'test-chatbot',
    title: 'Test Your Chatbot',
    content:
      'Use this preview to test your chatbot before deploying it. Make sure it responds correctly to different queries.',
    target: "[data-tour='chatbot-preview']",
    position: 'left',
  },
];

export const connectionsTour: TourStep[] = [
  {
    id: 'channels-overview',
    title: 'Channel Integrations',
    content:
      'Connect your chatbots to multiple messaging platforms. Each platform has its own setup process and features.',
    target: "[data-tour='channels-grid']",
    position: 'top',
  },
  {
    id: 'whatsapp-setup',
    title: 'WhatsApp Business',
    content:
      "Connect to WhatsApp Business API to reach customers on the world's most popular messaging platform.",
    target: "[data-tour='whatsapp-card']",
    position: 'bottom',
  },
  {
    id: 'website-widget',
    title: 'Website Chat Widget',
    content:
      'Add a chat widget to your website to provide instant customer support and lead generation.',
    target: "[data-tour='website-widget']",
    position: 'top',
  },
  {
    id: 'social-media',
    title: 'Social Media Integration',
    content:
      'Connect Facebook Messenger and Instagram DMs to manage all your social media conversations in one place.',
    target: "[data-tour='social-media']",
    position: 'left',
  },
];

// Hook for managing tours
export function useTour() {
  const [activeTour, setActiveTour] = useState<string | null>(null);
  const [completedTours, setCompletedTours] = useState<Set<string>>(new Set());

  useEffect(() => {
    const completed = localStorage.getItem('intaj-completed-tours');
    if (completed) {
      setCompletedTours(new Set(JSON.parse(completed)));
    }
  }, []);

  const startTour = (tourId: string) => {
    setActiveTour(tourId);
  };

  const completeTour = (tourId: string) => {
    const newCompleted = new Set([...completedTours, tourId]);
    setCompletedTours(newCompleted);
    localStorage.setItem('intaj-completed-tours', JSON.stringify([...newCompleted]));
    setActiveTour(null);
  };

  const skipTour = () => {
    setActiveTour(null);
  };

  const resetTours = () => {
    setCompletedTours(new Set());
    localStorage.removeItem('intaj-completed-tours');
  };

  return {
    activeTour,
    completedTours,
    startTour,
    completeTour,
    skipTour,
    resetTours,
  };
}
