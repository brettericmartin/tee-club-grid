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
  }
];

// NOTE FOR FUTURE COMMITS:
// When making commits, please update this file with the new version and changes.
// Version numbering (Alpha phase):
// - We're in alpha (0.x.x) until the platform is feature-complete
// - Minor (0.X.0): New features or significant improvements
// - Patch (0.X.Y): Bug fixes and small improvements
// - Version 1.0.0 will be our official launch out of alpha