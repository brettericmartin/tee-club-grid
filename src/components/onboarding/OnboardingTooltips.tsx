import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Camera, Share2, Eye, Edit3 } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { cn } from '@/lib/utils';

interface TooltipProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  targetSelector?: string;
  onDismiss?: () => void;
  onAction?: () => void;
  actionLabel?: string;
}

function Tooltip({ 
  title, 
  description, 
  icon,
  position = 'bottom',
  onDismiss,
  onAction,
  actionLabel
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Fade in after a short delay
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);
  
  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss?.(), 300);
  };
  
  return (
    <div
      className={cn(
        "absolute z-50 bg-gray-900 border border-primary/30 rounded-lg shadow-xl transition-all duration-300",
        "p-4 sm:p-6",
        "w-[90vw] sm:w-96 max-w-md",
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95",
        position === 'top' && "bottom-full mb-2",
        position === 'bottom' && "top-full mt-2",
        position === 'left' && "right-full mr-2",
        position === 'right' && "left-full ml-2"
      )}
    >
      {/* Arrow pointer */}
      <div
        className={cn(
          "absolute w-3 h-3 bg-gray-900 border-primary/30 transform rotate-45",
          position === 'top' && "bottom-[-6px] left-1/2 -translate-x-1/2 border-r border-b",
          position === 'bottom' && "top-[-6px] left-1/2 -translate-x-1/2 border-l border-t",
          position === 'left' && "right-[-6px] top-1/2 -translate-y-1/2 border-t border-r",
          position === 'right' && "left-[-6px] top-1/2 -translate-y-1/2 border-b border-l"
        )}
      />
      
      <div className="relative">
        <button
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
        >
          <X className="w-3 h-3 text-white/60" />
        </button>
        
        <div className="flex gap-4">
          {icon && (
            <div className="flex-shrink-0 w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
              {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6 text-primary" })}
            </div>
          )}
          <div className="flex-1">
            <h4 className="text-white font-bold text-lg mb-2">{title}</h4>
            <p className="text-white/80 text-base leading-relaxed">{description}</p>
            
            {actionLabel && (
              <button
                onClick={() => {
                  onAction?.();
                  handleDismiss();
                }}
                className="mt-4 text-primary hover:text-primary/80 font-semibold flex items-center gap-2 transition-colors text-base bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-lg"
              >
                {actionLabel}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function OnboardingTooltips({ 
  bagItems = [],
  isEditingBag = false,
  viewMode = 'gallery',
  onCreatePost,
  onAddEquipment,
  onShareBag
}: {
  bagItems?: any[];
  isEditingBag?: boolean;
  viewMode?: string;
  onCreatePost?: () => void;
  onAddEquipment?: () => void;
  onShareBag?: () => void;
}) {
  const { state, completeStep, recordViewMode } = useOnboarding();
  const [dismissedTips, setDismissedTips] = useState<number[]>([]);
  
  useEffect(() => {
    // Track view mode changes for step 4
    if (viewMode && state.currentStep === 4) {
      recordViewMode(viewMode);
    }
  }, [viewMode, state.currentStep, recordViewMode]);
  
  useEffect(() => {
    // Auto-complete step 1 if bag is being edited
    if (isEditingBag && state.currentStep === 1 && !state.completedSteps.includes(1)) {
      completeStep(1);
    }
  }, [isEditingBag, state.currentStep, state.completedSteps, completeStep]);
  
  useEffect(() => {
    // Auto-complete step 2 if 3+ items with photos are added
    const itemsWithPhotos = bagItems.filter(item => 
      item.custom_photo_url || item.equipment?.primaryPhoto || item.equipment?.image_url
    );
    if (itemsWithPhotos.length >= 3 && state.currentStep === 2 && !state.completedSteps.includes(2)) {
      completeStep(2);
    }
  }, [bagItems, state.currentStep, state.completedSteps, completeStep]);
  
  if (!state.enabled || state.skipped) {
    return null;
  }
  
  const dismissTip = (step: number) => {
    setDismissedTips(prev => [...prev, step]);
  };
  
  const tooltips: Record<number, React.ReactNode> = {
    1: !dismissedTips.includes(1) && state.currentStep === 1 && (
      <div className="fixed top-24 right-4 md:top-20 md:right-8 z-50">
        <Tooltip
          title="Customize Your Bag"
          description="Click the 'Edit Bag' button to personalize your bag's name, description, and background. Make it uniquely yours! Add a catchy name and tell others what makes your setup special."
          icon={<Edit3 className="w-5 h-5 text-primary" />}
          position="left"
          onDismiss={() => dismissTip(1)}
        />
      </div>
    ),
    
    2: !dismissedTips.includes(2) && state.currentStep === 2 && bagItems.length === 0 && (
      <div className="fixed top-24 right-4 md:top-20 md:right-8 z-50">
        <Tooltip
          title="Add Your Equipment"
          description="Start building your bag! Add at least 3 pieces of equipment with photos. Use AI to quickly add your clubs or search manually. Photos make your bag look amazing and help others discover great gear!"
          icon={<Camera className="w-5 h-5 text-primary" />}
          position="left"
          onDismiss={() => dismissTip(2)}
          onAction={onAddEquipment}
          actionLabel="Add Equipment"
        />
      </div>
    ),
    
    3: !dismissedTips.includes(3) && state.currentStep === 3 && bagItems.length >= 3 && (
      <div className="fixed bottom-24 md:bottom-32 left-1/2 -translate-x-1/2 z-50">
        <Tooltip
          title="Share Your Setup"
          description="Show off your equipment! Create a post to share with the Teed.club community. Get feedback, earn 'Tees', and inspire other golfers with your gear choices."
          icon={<Share2 className="w-5 h-5 text-primary" />}
          position="top"
          onDismiss={() => dismissTip(3)}
          onAction={onCreatePost}
          actionLabel="Create Post"
        />
      </div>
    ),
    
    4: !dismissedTips.includes(4) && state.currentStep === 4 && (
      <div className="fixed top-64 left-1/2 -translate-x-1/2 z-50">
        <Tooltip
          title="Explore View Options"
          description="Try different ways to view your bag! Gallery shows your photos, List gives detailed specs, and Card view creates a shareable bag snapshot. Find your favorite way to showcase your equipment."
          icon={<Eye className="w-5 h-5 text-primary" />}
          position="bottom"
          onDismiss={() => dismissTip(4)}
        />
      </div>
    ),
    
    5: !dismissedTips.includes(5) && state.currentStep === 5 && (
      <div className="fixed bottom-24 md:bottom-32 left-1/2 -translate-x-1/2 z-50">
        <Tooltip
          title="Share Your Bag"
          description="Ready to show off? Share your bag with friends via QR code or link. They can view your setup, get inspired, and even copy your equipment choices. Perfect for golf buddies and social media!"
          icon={<Share2 className="w-5 h-5 text-primary" />}
          position="top"
          onDismiss={() => dismissTip(5)}
          onAction={onShareBag}
          actionLabel="Share Bag"
        />
      </div>
    )
  };
  
  return (
    <>
      {Object.values(tooltips).filter(Boolean)}
    </>
  );
}