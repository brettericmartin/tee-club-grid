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
    version: "1.2.0",
    date: "2025-08-17",
    title: "Equipment Modal & Performance Improvements",
    changes: [
      {
        category: "feature",
        description: "Added comprehensive equipment customization with shaft/grip search"
      },
      {
        category: "feature",
        description: "Added 'No preference' options for all equipment customizations"
      },
      {
        category: "fix",
        description: "Fixed modal UX issues - added X button, tap outside to close, fixed z-index"
      },
      {
        category: "feature",
        description: "Added loft editing for existing equipment in bags"
      },
      {
        category: "performance",
        description: "Optimized feed/equipment loading for anonymous users"
      },
      {
        category: "performance",
        description: "Fixed N+1 query problem in FeedItemCard"
      },
      {
        category: "improvement",
        description: "Reduced network requests and improved overall performance"
      },
      {
        category: "fix",
        description: "Changed dev server to port 3333 for better stability"
      }
    ]
  },
  {
    version: "1.1.0",
    date: "2025-08-16",
    title: "Forum Reactions & Follow System",
    changes: [
      {
        category: "fix",
        description: "Forum reactions now persist after page refresh"
      },
      {
        category: "fix",
        description: "Critical fixes for likes/tees and follow system"
      },
      {
        category: "feature",
        description: "Configure custom domain auth.teed.club for Supabase"
      },
      {
        category: "feature",
        description: "Add multi-equipment photo posts with masonry feed layout"
      }
    ]
  }
];