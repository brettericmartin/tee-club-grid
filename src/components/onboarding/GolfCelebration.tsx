import React, { useEffect, useState } from 'react';
import { Trophy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface GolfCelebrationProps {
  isVisible: boolean;
  onComplete?: () => void;
}

export function GolfCelebration({ isVisible, onComplete }: GolfCelebrationProps) {
  const [showBall, setShowBall] = useState(false);
  const [showHole, setShowHole] = useState(false);
  const [ballInHole, setBallInHole] = useState(false);
  const [showFlag, setShowFlag] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    // Animation sequence
    const sequence = async () => {
      // Show hole first
      setShowHole(true);
      await delay(200);
      
      // Drop the ball
      setShowBall(true);
      await delay(1500);
      
      // Ball goes in hole
      setBallInHole(true);
      await delay(300);
      
      // Show flag and celebration
      setShowFlag(true);
      fireGolfConfetti();
      await delay(500);
      
      // Show badge and text
      setShowBadge(true);
      setShowText(true);
      
      // Complete after 4 seconds
      await delay(3000);
      onComplete?.();
    };

    sequence();
  }, [isVisible, onComplete]);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const fireGolfConfetti = () => {
    // Green confetti from the hole
    const colors = ['#10B981', '#059669', '#047857', '#065F46', '#064E3B'];
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.5, y: 0.6 },
      colors: colors,
      gravity: 1.2,
      ticks: 100,
      shapes: ['circle', 'square'],
      scalar: 0.8
    });

    // Additional burst
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0.3, y: 0.6 },
        colors: colors
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 0.7, y: 0.6 },
        colors: colors
      });
    }, 250);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60 animate-fade-in" />
      
      {/* Golf Scene Container */}
      <div className="relative w-full max-w-lg h-96">
        
        {/* Golf Hole */}
        {showHole && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              {/* Hole */}
              <div className="w-16 h-16 bg-gray-900 rounded-full border-4 border-gray-700 shadow-inner animate-scale-in" />
              
              {/* Flag pole and flag */}
              {showFlag && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-8">
                  <div className="relative animate-slide-up">
                    {/* Pole */}
                    <div className="w-1 h-32 bg-yellow-600 rounded-t" />
                    {/* Flag */}
                    <div 
                      className="absolute top-0 left-1 w-12 h-8 bg-red-500 animate-flag-wave"
                      style={{
                        clipPath: 'polygon(0 0, 100% 20%, 85% 50%, 100% 80%, 0 100%, 0 0)'
                      }}
                    >
                      <span className="text-white text-xs font-bold ml-1">18</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Golf Ball */}
        {showBall && (
          <div 
            className={cn(
              "absolute left-1/2 -translate-x-1/2 w-8 h-8",
              ballInHole ? "animate-ball-in-hole" : "animate-ball-drop-bounce"
            )}
          >
            <div className="w-full h-full bg-white rounded-full shadow-lg relative overflow-hidden">
              {/* Dimples */}
              <svg viewBox="0 0 32 32" className="w-full h-full">
                <circle cx="10" cy="10" r="2" fill="#e5e5e5" />
                <circle cx="22" cy="10" r="2" fill="#e5e5e5" />
                <circle cx="16" cy="16" r="2" fill="#e5e5e5" />
                <circle cx="10" cy="22" r="2" fill="#e5e5e5" />
                <circle cx="22" cy="22" r="2" fill="#e5e5e5" />
              </svg>
            </div>
          </div>
        )}
        
        {/* Badge Display */}
        {showBadge && (
          <div className="absolute left-1/2 top-3/4 -translate-x-1/2 animate-slide-up-fade">
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl shadow-2xl border-2 border-green-400 animate-badge-shine">
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Trophy className="w-12 h-12 text-white" />
                </div>
                <div className="text-center">
                  <h3 className="text-white font-bold text-xl">Tour Champion</h3>
                  <p className="text-white/90 text-sm mt-1">Welcome Tour Complete!</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Celebration Text */}
        {showText && (
          <div className="absolute left-1/2 top-16 -translate-x-1/2 text-center animate-fade-in-scale">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-2 animate-pulse">
              HOLE IN ONE!
            </h2>
            <p className="text-xl text-green-400 font-semibold">
              Tour Complete • 5 Under Par
            </p>
          </div>
        )}
      </div>
      
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scale-in {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
        
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes slide-up-fade {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes fade-in-scale {
          from { opacity: 0; transform: translateX(-50%) scale(0.8); }
          to { opacity: 1; transform: translateX(-50%) scale(1); }
        }
        
        @keyframes ball-drop-bounce {
          0% { 
            top: -100px;
            animation-timing-function: ease-in;
          }
          40% { 
            top: 50%;
            animation-timing-function: ease-out;
          }
          55% { 
            top: 35%;
            animation-timing-function: ease-in;
          }
          70% { 
            top: 50%;
            animation-timing-function: ease-out;
          }
          80% { 
            top: 45%;
            animation-timing-function: ease-in;
          }
          90% { 
            top: 50%;
            animation-timing-function: ease-out;
          }
          100% { 
            top: 48%;
          }
        }
        
        @keyframes ball-in-hole {
          from { 
            top: 48%;
            transform: translateX(-50%) scale(1);
            opacity: 1;
          }
          to { 
            top: 52%;
            transform: translateX(-50%) scale(0.5);
            opacity: 0;
          }
        }
        
        @keyframes flag-wave {
          0%, 100% { transform: scaleX(1); }
          25% { transform: scaleX(1.1); }
          75% { transform: scaleX(0.9); }
        }
        
        @keyframes badge-shine {
          0% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.5); }
          50% { box-shadow: 0 0 40px rgba(16, 185, 129, 0.8); }
          100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.5); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        
        .animate-scale-in {
          animation: scale-in 0.3s ease-out forwards;
        }
        
        .animate-slide-up {
          animation: slide-up 0.5s ease-out forwards;
        }
        
        .animate-slide-up-fade {
          animation: slide-up-fade 0.8s ease-out forwards;
        }
        
        .animate-fade-in-scale {
          animation: fade-in-scale 0.6s ease-out forwards;
        }
        
        .animate-ball-drop-bounce {
          animation: ball-drop-bounce 1.5s ease-in-out forwards;
        }
        
        .animate-ball-in-hole {
          animation: ball-in-hole 0.3s ease-in forwards;
        }
        
        .animate-flag-wave {
          animation: flag-wave 2s ease-in-out infinite;
        }
        
        .animate-badge-shine {
          animation: badge-shine 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}