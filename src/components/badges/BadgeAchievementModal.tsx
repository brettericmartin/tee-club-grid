import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UserBadgeWithDetails } from '@/services/badgeService';
import { BadgeService } from '@/services/badgeService';
import { toast } from 'sonner';

interface BadgeAchievementModalProps {
  badge: UserBadgeWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onShare?: () => void;
}

// Map icon names to components (simplified for modal)
const iconMap: Record<string, any> = {
  camera: Trophy,
  shield: Trophy,
  heart: Trophy,
  dollar: Trophy,
  flag: Trophy,
  sunrise: Trophy,
  trophy: Trophy,
  star: Trophy,
  'golf-club': Trophy,
  crown: Trophy,
  gem: Trophy,
  zap: Trophy,
  award: Trophy
};

// Rarity particle effects
const rarityParticles = {
  common: { count: 20, color: '#9CA3AF' },
  uncommon: { count: 30, color: '#10B981' },
  rare: { count: 40, color: '#3B82F6' },
  epic: { count: 50, color: '#8B5CF6' },
  legendary: { count: 60, color: '#F59E0B' }
};

const BadgeAchievementModal = ({ 
  badge, 
  isOpen, 
  onClose, 
  onShare 
}: BadgeAchievementModalProps) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);

  useEffect(() => {
    if (isOpen && badge) {
      // Mark notification as seen
      BadgeService.markBadgeNotificationSeen(badge.id);

      // Generate particles
      const rarity = badge.badge.rarity || 'common';
      const particleConfig = rarityParticles[rarity as keyof typeof rarityParticles];
      const newParticles = Array.from({ length: particleConfig.count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100
      }));
      setParticles(newParticles);
    }
  }, [isOpen, badge]);

  if (!badge) return null;

  const Icon = iconMap[badge.badge.icon_name || 'trophy'] || Trophy;
  const rarity = badge.badge.rarity || 'common';
  const particleConfig = rarityParticles[rarity as keyof typeof rarityParticles];

  const handleShare = () => {
    if (onShare) {
      onShare();
    } else {
      // Default share behavior
      toast.success('Badge shared to your feed!');
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', damping: 15 }}
            className="relative max-w-md w-full bg-gray-900 rounded-2xl p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Particle effects */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              {particles.map((particle) => (
                <motion.div
                  key={particle.id}
                  className="absolute w-1 h-1 rounded-full"
                  style={{
                    backgroundColor: particleConfig.color,
                    left: `${particle.x}%`,
                    top: `${particle.y}%`,
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1.5, 0],
                    y: -100,
                  }}
                  transition={{
                    duration: 2,
                    delay: particle.id * 0.02,
                    repeat: Infinity,
                    repeatDelay: 1,
                  }}
                />
              ))}
            </div>

            {/* Content */}
            <div className="relative text-center">
              {/* Achievement text */}
              <motion.h2
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold text-white mb-6"
              >
                Achievement Unlocked!
              </motion.h2>

              {/* Badge icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', delay: 0.3 }}
                className="relative inline-block mb-6"
              >
                <div
                  className={cn(
                    "relative w-32 h-32 rounded-2xl flex items-center justify-center",
                    "border-4",
                    rarity === 'common' && 'bg-gray-800 border-gray-600',
                    rarity === 'uncommon' && 'bg-green-900/50 border-green-600',
                    rarity === 'rare' && 'bg-blue-900/50 border-blue-600',
                    rarity === 'epic' && 'bg-purple-900/50 border-purple-600',
                    rarity === 'legendary' && 'bg-gradient-to-br from-yellow-900/50 to-orange-900/50 border-yellow-600'
                  )}
                  style={{
                    boxShadow: `0 0 ${rarity === 'legendary' ? 50 : rarity === 'epic' ? 40 : rarity === 'rare' ? 30 : 20}px ${particleConfig.color}40`
                  }}
                >
                  <Icon
                    className="w-16 h-16"
                    style={{ color: badge.badge.icon_color || '#10B981' }}
                  />
                </div>

                {/* Tier indicator */}
                {badge.badge.tier && badge.badge.tier > 1 && (
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-black rounded-full flex items-center justify-center border-2 border-white/20">
                    <span className="text-lg font-bold text-white">{badge.badge.tier}</span>
                  </div>
                )}
              </motion.div>

              {/* Badge details */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="space-y-2 mb-8"
              >
                <h3 className="text-xl font-semibold text-white">
                  {badge.badge.display_name}
                </h3>
                <p className="text-gray-400">
                  {badge.badge.description}
                </p>
                {badge.badge.category && (
                  <p className="text-sm text-gray-500">
                    {badge.badge.category.display_name}
                  </p>
                )}
                <div className="flex items-center justify-center gap-2 mt-3">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide",
                    rarity === 'common' && 'bg-gray-700 text-gray-300',
                    rarity === 'uncommon' && 'bg-green-900/50 text-green-400',
                    rarity === 'rare' && 'bg-blue-900/50 text-blue-400',
                    rarity === 'epic' && 'bg-purple-900/50 text-purple-400',
                    rarity === 'legendary' && 'bg-gradient-to-r from-yellow-900/50 to-orange-900/50 text-yellow-400'
                  )}>
                    {rarity}
                  </span>
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex gap-3"
              >
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onClose}
                >
                  Close
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90"
                  onClick={handleShare}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Achievement
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BadgeAchievementModal;