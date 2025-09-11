'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  action: string;
  link: string;
  completed: boolean;
  disabled: boolean;
}

interface OnboardingSteps {
  created_first_chatbot: boolean;
  added_data_source: boolean;
  connected_channel: boolean;
  has_dismissed: boolean;
}

interface OnboardingChecklistProps {
  userId: string;
  onboardingSteps: OnboardingSteps;
}

export default function OnboardingChecklist({ userId, onboardingSteps }: OnboardingChecklistProps) {
  const router = useRouter();
  const [dismissing, setDismissing] = useState(false);

  // Define the steps based on the onboarding progress
  const steps: OnboardingStep[] = [
    {
      id: 'created_first_chatbot',
      title: 'Create your first chatbot',
      description: 'Set up an AI chatbot with your preferred model and personality.',
      action: 'Create Chatbot',
      link: '/dashboard/chatbots/new',
      completed: onboardingSteps.created_first_chatbot,
      disabled: false
    },
    {
      id: 'added_data_source',
      title: 'Train your chatbot with data',
      description: 'Add documents, websites, or text to make your chatbot smarter.',
      action: 'Add Data',
      link: '/dashboard/chatbots', // This will be updated dynamically if they have a chatbot
      completed: onboardingSteps.added_data_source,
      disabled: !onboardingSteps.created_first_chatbot
    },
    {
      id: 'connected_channel',
      title: 'Connect a communication channel',
      description: 'Deploy your chatbot to your website, WhatsApp, or other platforms.',
      action: 'Connect',
      link: '/connections',
      completed: onboardingSteps.connected_channel,
      disabled: !onboardingSteps.created_first_chatbot
    }
  ];

  // Handle dismiss button click
  const handleDismiss = async () => {
    setDismissing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          onboarding_steps: {
            ...onboardingSteps,
            has_dismissed: true
          }
        })
        .eq('id', userId);

      if (error) {
        console.error('Error dismissing onboarding checklist:', error);
      }
    } catch (error) {
      console.error('Error dismissing onboarding checklist:', error);
    } finally {
      setDismissing(false);
    }
  };

  // Handle step button click
  const handleStepClick = (step: OnboardingStep) => {
    if (step.disabled) return;
    router.push(step.link);
  };

  return (
    <Card className="bg-[#141517]/50 backdrop-blur-xl border-gray-800/50 mb-8">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl text-white">Getting Started with Intaj AI</CardTitle>
        <Button 
          onClick={handleDismiss} 
          variant="destructive" 
          className="h-8 w-8 p-0 rounded-full"
          disabled={dismissing}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step) => (
            <div 
              key={step.id} 
              className={`p-4 rounded-lg border ${step.completed 
                ? 'bg-green-500/10 border-green-500/30' 
                : step.disabled 
                  ? 'bg-gray-800/30 border-gray-700/30' 
                  : 'bg-blue-500/10 border-blue-500/30'}`}
            >
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  {step.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-white mb-1">{step.title}</h3>
                  <p className="text-gray-400 text-sm mb-3">{step.description}</p>
                  <Button
                    onClick={() => handleStepClick(step)}
                    disabled={step.disabled || step.completed}
                    className={`${step.completed 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : step.disabled 
                        ? 'bg-gray-700 text-gray-300 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {step.completed ? 'Completed' : step.action}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}