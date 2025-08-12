// Centralized animation utilities for Teed.club
// Performance-first approach with golf-themed interactions

import { useRef, useState, useEffect } from 'react';

export const springConfig = {
  tension: 200,
  friction: 25,
  mass: 1
};

export const easeConfig = {
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  golf: 'cubic-bezier(0.87, 0, 0.13, 1)' // Golf swing-inspired curve
};

export const animationDurations = {
  instant: 100,
  fast: 200,
  normal: 300,
  slow: 500,
  golf: 600 // Slightly longer for golf-themed animations
};

// Intersection Observer hook for scroll animations
export const useScrollAnimation = (threshold = 0.1) => {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const currentElement = ref.current;
    if (!currentElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold }
    );

    observer.observe(currentElement);

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [threshold]);

  return { ref, isVisible };
};

// Golf ball bounce animation for tee interactions
export const golfBallBounce = {
  initial: { scale: 1, y: 0 },
  tap: { scale: 0.95, y: 2 },
  bounce: {
    scale: [1, 1.2, 0.9, 1.1, 1],
    y: [0, -8, 3, -2, 0],
    transition: {
      duration: 0.6,
      times: [0, 0.2, 0.5, 0.8, 1],
      ease: 'easeInOut'
    }
  }
};

// Card entrance animations
export const cardAnimations = {
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: easeConfig.smooth }
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.4, ease: easeConfig.golf }
  },
  slideInFromRight: {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.5, ease: easeConfig.smooth }
  }
};

// Stagger animations for lists
export const staggerConfig = {
  container: {
    animate: {
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  },
  item: {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: easeConfig.smooth }
  }
};

// Hover effects with glow
export const hoverEffects = {
  glow: {
    boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
    transform: 'translateY(-2px)',
    transition: `all ${animationDurations.fast}ms ${easeConfig.smooth}`
  },
  lift: {
    transform: 'translateY(-4px) scale(1.02)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
    transition: `all ${animationDurations.normal}ms ${easeConfig.smooth}`
  },
  pulse: {
    animation: 'pulse 2s infinite',
    '@keyframes pulse': {
      '0%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.4)' },
      '70%': { boxShadow: '0 0 0 10px rgba(16, 185, 129, 0)' },
      '100%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)' }
    }
  }
};