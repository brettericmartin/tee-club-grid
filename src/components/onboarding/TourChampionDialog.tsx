import React, { useEffect } from 'react';
import { Trophy, Sparkles, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface TourChampionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TourChampionDialog({ isOpen, onClose }: TourChampionDialogProps) {
  useEffect(() => {
    if (isOpen) {
      // Fire confetti when dialog opens
      const colors = ['#10B981', '#059669', '#047857'];
      
      // Center burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { x: 0.5, y: 0.4 },
        colors: colors,
      });
      
      // Side bursts
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0.2, y: 0.5 },
          colors: colors,
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 0.8, y: 0.5 },
          colors: colors,
        });
      }, 250);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#1a1a1a] border-white/20">
        <DialogHeader className="text-center pb-4">
          <div className="mx-auto mb-4 relative">
            {/* Badge container with glow effect */}
            <div className="relative w-32 h-32 mx-auto">
              <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
              <div className="relative bg-gradient-to-br from-green-600 to-green-700 rounded-full p-6 shadow-2xl border-2 border-green-400/50">
                <Trophy className="w-20 h-20 text-white" />
              </div>
              {/* Sparkles around badge */}
              <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-pulse" />
              <Sparkles className="absolute -bottom-2 -left-2 w-5 h-5 text-yellow-400 animate-pulse delay-150" />
            </div>
          </div>
          
          <DialogTitle className="text-2xl font-bold text-white">
            Tour Champion!
          </DialogTitle>
          
          <DialogDescription className="text-white/80 space-y-4 pt-4">
            <p className="text-lg">
              🎉 Congratulations on completing the Teed.club tour!
            </p>
            
            <p className="text-base">
              Welcome to our growing community of golf enthusiasts. You've just earned your 
              <span className="text-green-400 font-semibold"> Tour Champion </span> 
              badge - the first of many achievements waiting for you.
            </p>
            
            <div className="bg-white/5 rounded-lg p-4 mt-4">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-white font-medium">What's Next?</span>
              </div>
              <ul className="space-y-2 text-sm text-white/70">
                <li>• Showcase your equipment and get feedback from the community</li>
                <li>• Discover new gear and connect with other golfers</li>
                <li>• Earn more badges as you engage and contribute</li>
                <li>• Build your reputation as a trusted member</li>
              </ul>
            </div>
            
            <p className="text-sm text-white/60 italic pt-2">
              Your Tour Champion badge has been added to your profile. 
              Keep exploring to unlock more achievements!
            </p>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-3 pt-4">
          <Button
            onClick={onClose}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            Let's Go! ⛳
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}