import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface OnboardingState {
  enabled: boolean;
  currentStep: 1 | 2 | 3 | 4 | 5;
  completedSteps: number[];
  skipped: boolean;
  lastUpdated: string;
  viewedModes: string[];
  celebrated: boolean;
  badgeAwarded: boolean;
}

const ONBOARDING_STEPS = {
  1: {
    title: 'Edit Your Bag',
    description: 'Customize your bag name and description'
  },
  2: {
    title: 'Add Equipment',
    description: 'Add at least 3 pieces of equipment with photos'
  },
  3: {
    title: 'Create a Post',
    description: 'Share your equipment with the community'
  },
  4: {
    title: 'Explore Views',
    description: 'Check out gallery, list, and card views'
  },
  5: {
    title: 'Share Your Bag',
    description: 'Share via QR code or link'
  }
} as const;

interface OnboardingContextType {
  state: OnboardingState;
  isNewUser: boolean;
  currentStepInfo: typeof ONBOARDING_STEPS[1];
  toggleTips: (enabled: boolean) => void;
  advanceStep: () => void;
  completeStep: (step: number) => void;
  skipOnboarding: () => void;
  finishTour: () => void;
  resetOnboarding: () => void;
  recordViewMode: (mode: string) => void;
  isStepCompleted: (step: number) => boolean;
  showCelebration: boolean;
  setShowCelebration: (show: boolean) => void;
}

const defaultState: OnboardingState = {
  enabled: true,
  currentStep: 1,
  completedSteps: [],
  skipped: false,
  lastUpdated: new Date().toISOString(),
  viewedModes: [],
  celebrated: false,
  badgeAwarded: false
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const STORAGE_KEY = 'teed_onboarding_state';

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading onboarding state:', error);
    }
    return defaultState;
  });

  const [isNewUser, setIsNewUser] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    // Check if user is new (you can enhance this logic based on user creation date)
    const checkNewUser = async () => {
      try {
        // For now, check if they have no onboarding history
        const hasOnboardingHistory = localStorage.getItem(STORAGE_KEY);
        if (!hasOnboardingHistory) {
          setIsNewUser(true);
        }
      } catch (error) {
        console.error('Error checking new user status:', error);
      }
    };
    
    checkNewUser();
  }, []);

  useEffect(() => {
    // Save state to localStorage whenever it changes
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving onboarding state:', error);
    }
  }, [state]);

  // No longer auto-trigger celebration - it's now triggered by the Finish Tour button

  const toggleTips = (enabled: boolean) => {
    setState(prev => ({
      ...prev,
      enabled,
      lastUpdated: new Date().toISOString()
    }));
  };

  const advanceStep = () => {
    setState(prev => {
      const nextStep = Math.min(5, prev.currentStep + 1) as 1 | 2 | 3 | 4 | 5;
      return {
        ...prev,
        currentStep: nextStep,
        lastUpdated: new Date().toISOString()
      };
    });
  };

  const completeStep = (step: number) => {
    setState(prev => {
      if (prev.completedSteps.includes(step)) {
        return prev;
      }
      
      const newCompletedSteps = [...prev.completedSteps, step].sort();
      let newCurrentStep = prev.currentStep;
      
      // Auto-advance to next uncompleted step
      if (step === prev.currentStep) {
        for (let i = 1; i <= 5; i++) {
          if (!newCompletedSteps.includes(i)) {
            newCurrentStep = i as 1 | 2 | 3 | 4 | 5;
            break;
          }
        }
      }
      
      return {
        ...prev,
        completedSteps: newCompletedSteps,
        currentStep: newCurrentStep,
        lastUpdated: new Date().toISOString()
      };
    });
  };

  const skipOnboarding = () => {
    setState(prev => ({
      ...prev,
      skipped: true,
      enabled: false,
      lastUpdated: new Date().toISOString()
    }));
  };

  const finishTour = async () => {
    // If all steps are completed, trigger the celebration
    if (state.completedSteps.length === 5) {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          // Award the Tour Champion badge
          const { data, error } = await supabase.rpc('award_onboarding_badge', {
            p_user_id: user.id
          });
          
          if (!error && data?.success) {
            console.log('🏌️ Tour Champion badge awarded!');
            toast.success('Tour Champion badge earned! 🏆', {
              description: 'You completed the welcome tour!',
              duration: 5000
            });
            
            // Update state
            setState(prev => ({
              ...prev,
              badgeAwarded: true,
              celebrated: true,
              enabled: false,
              skipped: true,
              lastUpdated: new Date().toISOString()
            }));
          }
        } catch (error) {
          console.error('Error awarding badge:', error);
        }
      }
      
      // Show celebration animation regardless
      setShowCelebration(true);
    }
    
    // Disable the tour
    setState(prev => ({
      ...prev,
      enabled: false,
      skipped: true,
      lastUpdated: new Date().toISOString()
    }));
  };

  const resetOnboarding = () => {
    setState({
      ...defaultState,
      lastUpdated: new Date().toISOString()
    });
  };

  const recordViewMode = (mode: string) => {
    setState(prev => {
      if (prev.viewedModes.includes(mode)) {
        return prev;
      }
      
      const newViewedModes = [...prev.viewedModes, mode];
      
      // Check if step 4 is complete (viewed gallery, list, and card)
      const requiredModes = ['gallery', 'list', 'card'];
      const hasViewedAll = requiredModes.every(m => newViewedModes.includes(m));
      
      if (hasViewedAll && !prev.completedSteps.includes(4)) {
        return {
          ...prev,
          viewedModes: newViewedModes,
          completedSteps: [...prev.completedSteps, 4],
          currentStep: prev.currentStep === 4 ? 5 : prev.currentStep,
          lastUpdated: new Date().toISOString()
        } as OnboardingState;
      }
      
      return {
        ...prev,
        viewedModes: newViewedModes,
        lastUpdated: new Date().toISOString()
      };
    });
  };

  const isStepCompleted = (step: number) => {
    return state.completedSteps.includes(step);
  };

  const currentStepInfo = ONBOARDING_STEPS[state.currentStep];

  return (
    <OnboardingContext.Provider
      value={{
        state,
        isNewUser,
        currentStepInfo,
        toggleTips,
        advanceStep,
        completeStep,
        skipOnboarding,
        finishTour,
        resetOnboarding,
        recordViewMode,
        isStepCompleted,
        showCelebration,
        setShowCelebration
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}