export interface PatchNote {
  version: string;
  date: string;
  title: string;
  changes: {
    category: 'feature' | 'fix' | 'improvement' | 'performance';
    description: string;
  }[];
}

export const patchNotes: PatchNote[] = [
  {
    version: "0.22.0",
    date: "2025-09-07",
    title: "Feed Experience Improvements",
    changes: [
      {
        category: "feature",
        description: "Added video support to feed - videos from bags now display with thumbnails and play buttons"
      },
      {
        category: "improvement",
        description: "Moved bag flip button to card header for better accessibility and cleaner image display"
      },
      {
        category: "improvement",
        description: "Improved text readability by moving captions below images with dedicated background sections"
      },
      {
        category: "improvement",
        description: "Removed post type badges for cleaner visual presentation"
      },
      {
        category: "improvement",
        description: "Optimized feed card padding for tighter, more efficient layout"
      },
      {
        category: "fix",
        description: "Fixed crashes when flipping video feed cards"
      },
      {
        category: "fix",
        description: "Restored masonry/mosaic layout with natural height variation for photos"
      },
      {
        category: "performance",
        description: "Improved mobile performance by displaying video thumbnails instead of embedded players"
      }
    ]
  },
  {
    version: "0.21.0",
    date: "2025-09-05",
    title: "Major Stability Update - Core Features Restored",
    changes: [
      {
        category: "fix",
        description: "🔥 CRITICAL: Fixed app-breaking dynamic import errors that prevented My Bag page from loading"
      },
      {
        category: "fix",
        description: "Fixed 'Tee' system (likes) - users can now properly like bags and posts again"
      },
      {
        category: "fix",
        description: "Restored equipment photos - fixed database permissions blocking photo display"
      },
      {
        category: "fix",
        description: "Share modal now properly displays bag contents with photos in both card and list views"
      },
      {
        category: "performance",
        description: "Removed all lazy loading to eliminate Suspense-related crashes and improve stability"
      },
      {
        category: "fix",
        description: "Fixed Equipment page 'Saved items only' filter not working correctly"
      },
      {
        category: "improvement",
        description: "Enhanced error handling throughout the app to prevent cascading failures"
      },
      {
        category: "fix",
        description: "Resolved Row Level Security (RLS) policies blocking critical database operations"
      }
    ]
  },
  {
    version: "0.20.0",
    date: "2025-08-29",
    title: "Critical Stability Fixes & Beta System Completion",
    changes: [
      {
        category: "fix",
        description: "Emergency fix for equipment null reference errors causing app crashes"
      },
      {
        category: "fix",
        description: "Identified and documented Row Level Security (RLS) issue blocking equipment table access"
      },
      {
        category: "fix",
        description: "Complete beta system overhaul - instant access after waitlist signup with password"
      },
      {
        category: "fix",
        description: "Removed all leaderboard references for cleaner, focused experience"
      },
      {
        category: "improvement",
        description: "Simplified invite system - removed complex referral tracking in favor of simple invite codes"
      },
      {
        category: "improvement",
        description: "Changed all CTAs from 'Apply for Beta' to 'Join the Beta' for better conversion"
      },
      {
        category: "feature",
        description: "Added Puppeteer testing suite for automated page validation"
      },
      {
        category: "fix",
        description: "Fixed authentication flow - proper redirects after signup and better error handling"
      }
    ]
  },
  {
    version: "0.19.0",
    date: "2025-08-25",
    title: "Mobile Excellence & Feed System Enhancements",
    changes: [
      {
        category: "feature",
        description: "Feed sorting system with Popular, New, and Following filters"
      },
      {
        category: "feature",
        description: "Multi-photo equipment posts with beautiful masonry grid layout"
      },
      {
        category: "feature",
        description: "Comprehensive forum system with nested comments and reactions"
      },
      {
        category: "improvement",
        description: "Major mobile UX overhaul - optimized touch targets, modals, and navigation"
      },
      {
        category: "improvement",
        description: "Feed quality filter - automatically removes posts without images"
      },
      {
        category: "fix",
        description: "Critical auth system fixes - resolved tab switching issues and session handling"
      },
      {
        category: "fix",
        description: "Fixed likes/tees persistence - reactions now save properly after refresh"
      },
      {
        category: "fix",
        description: "ShareModal now generates correct /bag/username/bagname URLs"
      },
      {
        category: "performance",
        description: "Implemented server-side pagination for equipment browser"
      },
      {
        category: "improvement",
        description: "Enhanced BagEquipmentModal with all photos displayed in gallery tab"
      }
    ]
  },
  {
    version: "0.18.0",
    date: "2025-08-22",
    title: "Enhanced Equipment Modal & Affiliate Links",
    changes: [
      {
        category: "feature",
        description: "Complete equipment management modal with affiliate links, videos, photos, reviews, and forums in one place"
      },
      {
        category: "feature",
        description: "Integrated affiliate link management directly in equipment modal for easy monetization"
      },
      {
        category: "feature",
        description: "Added comprehensive equipment editing: loft, shaft, grip, condition, notes, and custom photos"
      },
      {
        category: "feature",
        description: "Created Video Hub for discovering and sharing golf equipment videos"
      },
      {
        category: "improvement",
        description: "Mobile-optimized equipment modal with full-screen view and touch-friendly navigation"
      },
      {
        category: "improvement",
        description: "Featured equipment badge system for highlighting special items in your bag"
      },
      {
        category: "fix",
        description: "Fixed button overlap issues in modals and improved mobile responsiveness"
      },
      {
        category: "fix",
        description: "Implemented proper RLS (Row Level Security) policies for affiliate links and video features"
      }
    ]
  },
  {
    version: "0.17.0",
    date: "2025-08-21",
    title: "Deployment Optimizations & Share Feature Fix",
    changes: [
      {
        category: "fix",
        description: "Fixed BagShareView component by replacing html2canvas with html-to-image library"
      },
      {
        category: "fix",
        description: "Resolved Vercel deployment issues by consolidating API functions (12 function limit)"
      },
      {
        category: "fix",
        description: "Moved middleware and utils out of api folder to reduce function count"
      },
      {
        category: "fix",
        description: "Changed cron job frequency to daily (3 AM UTC) to comply with Vercel hobby plan"
      },
      {
        category: "fix",
        description: "Removed test/debug endpoints and fixed TypeScript errors for production"
      },
      {
        category: "fix",
        description: "Fixed duplicate variable declarations in App.tsx causing build errors"
      },
      {
        category: "feature",
        description: "Created comprehensive technical fixes repository documenting 127+ commits"
      }
    ]
  },
  {
    version: "0.16.0",
    date: "2025-08-20",
    title: "Beta System, Admin Dashboard & Critical Fixes",
    changes: [
      {
        category: "fix",
        description: "Fixed infinite recursion in Row Level Security policies preventing forum, feed, and bags from loading"
      },
      {
        category: "feature",
        description: "Comprehensive beta/waitlist application system with scoring (0-15 points) based on user answers"
      },
      {
        category: "feature",
        description: "Admin dashboard with centralized control panel for all administrative functions"
      },
      {
        category: "feature",
        description: "Beta information page documenting the entire application and approval process"
      },
      {
        category: "improvement",
        description: "Admin users now automatically have beta access without separate approval"
      },
      {
        category: "feature",
        description: "CLI tools for managing beta access: grant-beta-access.js and check-user-access.js"
      },
      {
        category: "improvement",
        description: "Updated landing page CTA from 'Join as a Founder' to 'Apply for the Beta'"
      },
      {
        category: "feature",
        description: "Admin-only menu option in profile dropdown for quick dashboard access"
      },
      {
        category: "fix",
        description: "Fixed useAdminAuth hook to check profiles table instead of non-existent admins table"
      },
      {
        category: "improvement",
        description: "Added clear messaging that 'Build My Bag' requires beta approval"
      },
      {
        category: "feature",
        description: "Waitlist admin page for reviewing and approving beta applications with scoring breakdown"
      },
      {
        category: "improvement",
        description: "BetaGuard component now properly handles admin users and shows appropriate messaging"
      }
    ]
  },
  {
    version: "0.15.0",
    date: "2025-08-18",
    title: "Authentication Simplification & Enhanced UX",
    changes: [
      {
        category: "fix",
        description: "Simplified authentication to prevent issues when switching browser tabs"
      },
      {
        category: "feature",
        description: "Username-based routing for cleaner share URLs (/@username instead of /bag/uuid)"
      },
      {
        category: "feature",
        description: "Equipment specifications (shaft, grip, loft) now visible in MyBag list view"
      },
      {
        category: "fix",
        description: "Removed aggressive auth monitoring that was causing site breakage"
      },
      {
        category: "improvement",
        description: "Basic session management without intrusive monitoring"
      },
      {
        category: "fix",
        description: "Fixed critical auth initialization error that was causing blank screen"
      },
      {
        category: "fix",
        description: "Disabled Supabase auth state listener that was firing incorrectly on tab switches"
      }
    ]
  },
  {
    version: "0.14.0",
    date: "2025-08-17",
    title: "Feed Quality Improvements",
    changes: [
      {
        category: "feature",
        description: "Feed now only shows posts with pictures for better visual experience"
      },
      {
        category: "feature",
        description: "Added cleanup script to remove old posts without pictures"
      },
      {
        category: "improvement",
        description: "Automatic filtering of pictureless posts in feed service"
      },
      {
        category: "feature",
        description: "Scheduled cleanup script for automated feed maintenance"
      }
    ]
  },
  {
    version: "0.13.3",
    date: "2025-08-17",
    title: "Google Authentication Profile Fixes",
    changes: [
      {
        category: "fix",
        description: "Fixed Google profile pictures being overwritten on profile updates"
      },
      {
        category: "fix",
        description: "Improved Google user profile creation with proper username and display name"
      },
      {
        category: "fix",
        description: "Prevented auth metadata from being unnecessarily updated for Google users"
      },
      {
        category: "improvement",
        description: "Added SQL migration to properly handle Google avatar URLs separately"
      }
    ]
  },
  {
    version: "0.13.2",
    date: "2025-08-17",
    title: "Auth Session & Loading Fixes",
    changes: [
      {
        category: "fix",
        description: "Fixed content not loading after a few actions due to auth token expiry"
      },
      {
        category: "fix",
        description: "Added automatic session refresh when JWT token expires"
      },
      {
        category: "improvement",
        description: "Better error handling for auth-related query failures"
      },
      {
        category: "performance",
        description: "Queries now retry automatically after session refresh"
      }
    ]
  },
  {
    version: "0.13.1",
    date: "2025-08-17",
    title: "Dialog X Button & Custom Specs Fix",
    changes: [
      {
        category: "fix",
        description: "Fixed missing X button on equipment edit dialogs"
      },
      {
        category: "fix",
        description: "Added custom_specs column to bag_equipment table for shaft/grip preferences"
      },
      {
        category: "improvement",
        description: "Enhanced dialog close button visibility with better styling"
      }
    ]
  },
  {
    version: "0.13.0",
    date: "2025-08-17",
    title: "Patch Notes System",
    changes: [
      {
        category: "feature",
        description: "Added patch notes page to track all updates and improvements"
      },
      {
        category: "feature",
        description: "Added Updates button to navigation (desktop and mobile)"
      },
      {
        category: "improvement",
        description: "Version history with categorized changes and badges"
      }
    ]
  },
  {
    version: "0.12.0",
    date: "2025-08-17",
    title: "Equipment Modal & Performance Overhaul",
    changes: [
      {
        category: "feature",
        description: "Comprehensive equipment customization with shaft/grip search"
      },
      {
        category: "feature",
        description: "'No preference' options for all equipment customizations"
      },
      {
        category: "feature",
        description: "Loft editing for existing equipment in bags"
      },
      {
        category: "fix",
        description: "Fixed modal UX - added X button, tap outside to close, z-index issues"
      },
      {
        category: "fix",
        description: "Critical UI and database stability improvements"
      },
      {
        category: "performance",
        description: "Optimized feed/equipment loading for anonymous users"
      },
      {
        category: "performance",
        description: "Fixed N+1 query problem reducing database calls"
      },
      {
        category: "fix",
        description: "Forum reactions now persist after page refresh"
      }
    ]
  },
  {
    version: "0.11.0",
    date: "2025-08-16",
    title: "Authentication & Social Features",
    changes: [
      {
        category: "fix",
        description: "Critical fixes for likes/tees and follow system"
      },
      {
        category: "feature",
        description: "Custom domain auth.teed.club for Supabase authentication"
      }
    ]
  },
  {
    version: "0.10.0",
    date: "2025-08-15",
    title: "Feed Enhancement & OAuth Fix",
    changes: [
      {
        category: "feature",
        description: "Multi-equipment photo posts with masonry feed layout"
      },
      {
        category: "fix",
        description: "Google OAuth authentication and profile editing"
      }
    ]
  },
  {
    version: "0.9.0",
    date: "2025-08-14",
    title: "Equipment Pricing System",
    changes: [
      {
        category: "feature",
        description: "Equipment pricing system with comparison and verification"
      },
      {
        category: "feature",
        description: "Price tracking across multiple retailers"
      },
      {
        category: "improvement",
        description: "Enhanced equipment detail pages with pricing data"
      }
    ]
  },
  {
    version: "0.8.0",
    date: "2025-08-13",
    title: "Forum Automation",
    changes: [
      {
        category: "feature",
        description: "Automated forum feedback agent workflow"
      },
      {
        category: "improvement",
        description: "Enhanced forum moderation capabilities"
      }
    ]
  },
  {
    version: "0.7.0",
    date: "2025-08-12",
    title: "Forum Feedback Implementation",
    changes: [
      {
        category: "fix",
        description: "Updated equipment photo priority logic"
      },
      {
        category: "fix",
        description: "Addressed multiple batches of forum feedback"
      },
      {
        category: "improvement",
        description: "Enhanced user experience based on community input"
      }
    ]
  },
  {
    version: "0.6.0",
    date: "2025-08-11",
    title: "Mobile UX & Feed Improvements",
    changes: [
      {
        category: "fix",
        description: "Equipment editor modal mobile responsiveness"
      },
      {
        category: "feature",
        description: "Animations and mobile optimizations throughout the app"
      },
      {
        category: "fix",
        description: "Simplified feed post creation - only create posts when adding photos"
      },
      {
        category: "fix",
        description: "Prevented duplicate feed posts when adding equipment photos"
      },
      {
        category: "feature",
        description: "Quick featured toggle for equipment items"
      },
      {
        category: "improvement",
        description: "Optimized modals for mobile devices"
      }
    ]
  },
  {
    version: "0.5.0",
    date: "2025-08-10",
    title: "Share Card Enhancement",
    changes: [
      {
        category: "fix",
        description: "Share card now uses actual BagCard component"
      },
      {
        category: "improvement",
        description: "Improved mobile scaling for share functionality"
      },
      {
        category: "improvement",
        description: "Better social sharing preview rendering"
      }
    ]
  },
  {
    version: "0.4.0",
    date: "2025-08-05",
    title: "Equipment Reviews & Tee System",
    changes: [
      {
        category: "feature",
        description: "Equipment review system with tee functionality"
      },
      {
        category: "fix",
        description: "Feed tee persistence across sessions"
      },
      {
        category: "feature",
        description: "Bag management features and organization"
      },
      {
        category: "fix",
        description: "Equipment page mobile layout improvements"
      }
    ]
  },
  {
    version: "0.3.0",
    date: "2025-07-25",
    title: "AI Bag Analyzer Integration",
    changes: [
      {
        category: "feature",
        description: "OpenAI Vision API integration for equipment detection"
      },
      {
        category: "feature",
        description: "Structured 3-step AI bag analysis workflow"
      },
      {
        category: "fix",
        description: "Robust JSON extraction for OpenAI responses"
      },
      {
        category: "fix",
        description: "Updated from gpt-4-vision-preview to gpt-4o model"
      }
    ]
  },
  {
    version: "0.2.0",
    date: "2025-07-19",
    title: "Forum System & Landing Page",
    changes: [
      {
        category: "feature",
        description: "Comprehensive forum system with mobile-optimized UI"
      },
      {
        category: "feature",
        description: "Redesigned landing page with real equipment showcase"
      },
      {
        category: "feature",
        description: "Nested comments and replies in forum"
      },
      {
        category: "fix",
        description: "Dynamic import errors and user profile enhancements"
      }
    ]
  },
  {
    version: "0.1.0",
    date: "2025-07-12",
    title: "Initial Platform Launch",
    changes: [
      {
        category: "feature",
        description: "Core platform with equipment management system"
      },
      {
        category: "feature",
        description: "User authentication with Supabase"
      },
      {
        category: "feature",
        description: "Golf ball on tee branding and Tees engagement metrics"
      },
      {
        category: "feature",
        description: "Mobile navigation with bottom navigation bar"
      },
      {
        category: "feature",
        description: "Equipment submission with smart autocomplete"
      }
    ]
  }
];

// NOTE FOR FUTURE COMMITS:
// When making commits, please update this file with the new version and changes.
// Version numbering (Alpha phase):
// - We're in alpha (0.x.x) until the platform is feature-complete
// - Minor (0.X.0): New features or significant improvements
// - Patch (0.X.Y): Bug fixes and small improvements
// - Version 1.0.0 will be our official launch out of alpha