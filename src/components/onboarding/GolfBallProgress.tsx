import React from 'react';
import { Check, X, Trophy, CheckCircle } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { cn } from '@/lib/utils';

export function GolfBallProgress() {
  const { state, currentStepInfo, skipOnboarding, finishTour, isStepCompleted } = useOnboarding();
  
  if (!state.enabled || state.skipped) {
    return null;
  }

  const progress = ((state.completedSteps.length) / 5) * 100;
  
  return (
    <div className="w-full bg-gray-900/80 backdrop-blur-sm border-b border-white/10 px-4 py-3">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-medium text-white">
              Getting Started - Step {state.currentStep} of 5
            </h3>
            <p className="text-xs text-white/60 mt-0.5">
              {currentStepInfo.description}
            </p>
          </div>
          {state.completedSteps.length === 5 ? (
            <button
              onClick={finishTour}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 animate-pulse"
            >
              <Trophy className="w-4 h-4" />
              Finish Tour
            </button>
          ) : (
            <button
              onClick={skipOnboarding}
              className="text-xs text-white/40 hover:text-white/60 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Skip Tour
            </button>
          )}
        </div>
        
        {/* Golf Course Progress Bar */}
        <div className="relative">
          {/* Track */}
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Holes */}
          <div className="absolute top-0 left-0 w-full h-2 flex justify-between">
            {[1, 2, 3, 4, 5].map((step) => {
              const isCompleted = isStepCompleted(step);
              const isCurrent = state.currentStep === step;
              const position = ((step - 1) / 4) * 100;
              
              return (
                <div
                  key={step}
                  className="absolute -top-2"
                  style={{ left: `${position}%` }}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                      isCompleted
                        ? "bg-green-500 border-green-400 scale-110"
                        : isCurrent
                        ? "bg-white border-primary animate-pulse"
                        : "bg-gray-700 border-gray-600"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-3 h-3 text-white" />
                    ) : (
                      <span className="text-xs font-bold text-gray-900">
                        {step}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Hole Flag - Fixed at the end */}
            <div
              className="absolute -top-8"
              style={{ left: '100%', transform: 'translateX(-50%)' }}
            >
              <div className="relative">
                <div className="w-0.5 h-6 bg-yellow-500" />
                <div className="absolute top-0 -right-0.5 w-4 h-3 bg-red-500 animate-wave origin-left" 
                  style={{
                    clipPath: 'polygon(0 0, 100% 20%, 85% 50%, 100% 80%, 0 100%, 0 0)'
                  }}
                />
              </div>
            </div>
          </div>
          
          {/* Golf Ball - Positioned at progress bar end */}
          <div
            className="absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-out"
            style={{
              left: `${progress}%`,
              transform: `translateX(-50%) translateY(-50%) ${progress > 0 ? 'rotate(360deg)' : ''}`
            }}
          >
            <div className="relative">
              <div className="w-4 h-4 bg-white rounded-full shadow-lg animate-bounce-subtle">
                {/* Dimples pattern */}
                <svg viewBox="0 0 16 16" className="w-full h-full">
                  <circle cx="5" cy="5" r="1" fill="#e5e5e5" />
                  <circle cx="11" cy="5" r="1" fill="#e5e5e5" />
                  <circle cx="8" cy="8" r="1" fill="#e5e5e5" />
                  <circle cx="5" cy="11" r="1" fill="#e5e5e5" />
                  <circle cx="11" cy="11" r="1" fill="#e5e5e5" />
                </svg>
              </div>
              {/* Trail effect */}
              <div className="absolute inset-0 w-4 h-4 bg-white/30 rounded-full animate-ping" />
            </div>
          </div>
        </div>
        
        {/* Step Labels */}
        <div className="flex justify-between mt-2">
          {[
            'Edit Bag',
            'Add Gear',
            'Share Post',
            'View Modes',
            'Share Bag'
          ].map((label, index) => {
            const step = index + 1;
            const isCompleted = isStepCompleted(step);
            const isCurrent = state.currentStep === step;
            
            return (
              <div
                key={step}
                className={cn(
                  "text-xs transition-colors",
                  isCompleted
                    ? "text-green-400 font-medium"
                    : isCurrent
                    ? "text-white font-medium"
                    : "text-white/40"
                )}
              >
                {label}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* CSS for animations */}
      <style jsx>{`
        @keyframes wave {
          0%, 100% { transform: scaleX(1); }
          50% { transform: scaleX(1.1); }
        }
        
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        
        .animate-wave {
          animation: wave 1s ease-in-out infinite;
        }
        
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}