import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BadgeDisplay } from './BadgeDisplay';
import { Badge } from '@/services/badges';
import { X, Sparkles } from 'lucide-react';

interface BadgeNotificationToastProps {
  badge: Badge;
  isVisible: boolean;
  onClose: () => void;
}

export function BadgeNotificationToast({ 
  badge, 
  isVisible, 
  onClose 
}: BadgeNotificationToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000); // Auto-close after 5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="relative bg-gradient-to-r from-primary/20 to-primary/10 backdrop-blur-xl rounded-xl border border-primary/30 shadow-2xl p-6">
            <button
              onClick={onClose}
              className="absolute top-2 right-2 text-white/50 hover:text-white/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: 2 }}
                >
                  <BadgeDisplay badge={badge} size="lg" />
                </motion.div>
                <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-white mb-1">
                  New Badge Earned!
                </h3>
                <p className="text-lg text-white/90">{badge.name}</p>
                <p className="text-sm text-white/70 mt-1">{badge.description}</p>
              </div>
            </div>
            
            <motion.div
              className="absolute inset-0 rounded-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              style={{
                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}