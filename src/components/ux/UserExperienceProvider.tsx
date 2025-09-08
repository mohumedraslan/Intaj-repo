"use client";
import { useState, useEffect, ReactNode } from "react";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import GuidedTour, { useTour, dashboardTour, chatbotTour, connectionsTour } from "@/components/tours/GuidedTour";

interface UserExperienceProviderProps {
  children: ReactNode;
}

export default function UserExperienceProvider({ children }: UserExperienceProviderProps) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  
  const { activeTour, completedTours, startTour, completeTour, skipTour } = useTour();

  useEffect(() => {
    // Check if this is the user's first visit
    const hasVisited = localStorage.getItem('intaj-has-visited');
    const hasCompletedOnboarding = localStorage.getItem('intaj-onboarding-completed');
    
    if (!hasVisited) {
      setIsFirstVisit(true);
      setShowOnboarding(true);
      localStorage.setItem('intaj-has-visited', 'true');
    }
  }, []);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    localStorage.setItem('intaj-onboarding-completed', 'true');
    
    // Start dashboard tour after onboarding
    setTimeout(() => {
      if (!completedTours.has('dashboard')) {
        startTour('dashboard');
      }
    }, 1000);
  };

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
  };

  const getTourSteps = () => {
    switch (activeTour) {
      case 'dashboard':
        return dashboardTour;
      case 'chatbot':
        return chatbotTour;
      case 'connections':
        return connectionsTour;
      default:
        return [];
    }
  };

  return (
    <>
      {children}

      {/* Onboarding Flow */}
      {showOnboarding && (
        <OnboardingFlow
          onComplete={handleOnboardingComplete}
        />
      )}

      {/* Guided Tours */}
      {activeTour && (
        <GuidedTour
          tour={activeTour}
          onComplete={() => completeTour(activeTour)}
          onSkip={() => skipTour(activeTour)}
        />
      )}
    </>
  );
}

// Hook for managing UX features
export function useUserExperience() {
  const { startTour, completedTours } = useTour();

  const showOnboarding = () => {
    // Reset onboarding state and show it again
    localStorage.removeItem('intaj-onboarding-completed');
    window.location.reload();
  };

  const startDashboardTour = () => {
    startTour('dashboard');
  };

  const startChatbotTour = () => {
    startTour('chatbot');
  };

  const startConnectionsTour = () => {
    startTour('connections');
  };

  return {
    showOnboarding,
    startDashboardTour,
    startChatbotTour,
    startConnectionsTour,
    completedTours
  };
}
