# Teed.club - Complete Project Context

## <Ì Core Vision & Mission

**"Your golf bag IS your social profile"** - Instead of traditional profiles, golfers showcase their equipment setups as their digital identity. Every golfer's bag tells their story through the clubs they choose.

### Why Teed.club Will Succeed
- **$7.1 billion golf equipment market** with no dedicated social platform
- **Golfers are obsessed** with equipment discussions and gear optimization  
- **Clear monetization path** through affiliate revenue sharing
- **First-mover advantage** - No competitor exists in this space

## =° Business Model & Monetization

### Revenue Streams
1. **Primary: Affiliate Commissions** (4-10% from golf brands)
   - 50/50 split with users who showcase equipment
   - Users earn passive income from their bag displays
   
2. **Secondary: Premium Subscriptions** ($9.99-19.99/month)
   - Advanced analytics
   - Exclusive equipment drops
   - Enhanced customization options
   
3. **Future: Brand Partnerships**
   - Sponsored equipment showcases
   - Exclusive product launches
   - Tournament/event sponsorships

### User Value Proposition
- **For Equipment Geeks**: Discover and discuss the latest gear
- **For Social Golfers**: Connect with others through shared equipment passion
- **For Influencers**: Monetize equipment recommendations naturally
- **For All Golfers**: Find the perfect equipment based on similar players

## <¨ Design System & Visual Identity

### Core Design Philosophy
**Premium, Modern, Golf-Inspired** - Dark theme with glassmorphism effects creating a high-end feel that matches the premium nature of golf equipment.

### Color Palette
- Background: #000000 (True black for OLED)
- Foreground: #ffffff
- Primary: #10B981 (Signature green for CTAs)
- Secondary: #1f2937
- Accent: #10B981
- Muted: #374151
- Border: rgba(255, 255, 255, 0.1)

### Glassmorphism Standards
Standard glass effect for overlays:
- background: rgba(255, 255, 255, 0.1)
- backdrop-filter: blur(10px)
- border: 1px solid rgba(255, 255, 255, 0.2)
- box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3)

Darker glass for content areas:
- background: rgba(0, 0, 0, 0.7)
- backdrop-filter: blur(8px)
- border-top: 1px solid rgba(255, 255, 255, 0.1)

### Component Standards
- **Border Radius**: 12px (0.75rem) for cards, 8px for smaller elements
- **Transitions**: 0.2s ease on all interactive elements
- **Hover States**: Slight scale (1.05) and increased opacity
- **Shadows**: Subtle but present for depth

## <× Technical Architecture

### Tech Stack
- **Frontend**: Vite + React + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui + Custom Glassmorphism
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **State Management**: TanStack Query + React Context
- **Authentication**: Supabase Auth (Email + Google OAuth)
- **File Storage**: Supabase Storage (user photos)

### Database Schema Overview
- profiles ’ user_bags ’ bag_equipment ’ equipment
- Social: follows, bag_likes, equipment_saves
- Content: feed_posts, equipment_photos, equipment_reviews
- Commerce: equipment_prices, wishlist, affiliate_tracking

### Key Features Implementation

#### 1. Bag Showcase System
- **Featured Equipment**: Users select 6 clubs + 4 accessories to feature
- **Visual Display**: 3x2 grid with glassmorphism styling
- **Interaction**: Click equipment for details, click bag for full view

#### 2. Dynamic Feed
- **Content Types**:
  - Bag Gallery Photos (user showcases)
  - Equipment Updates (X added Y to their bag)
  - Equipment Photos (individual club shots)
  - Suggested Equipment (AI recommendations)
- **Algorithm**: Prioritizes followed users, mixes in discovery content
- **Interaction**: Flippable cards revealing bag details

#### 3. Equipment Browser
- **Filtering**: By handicap, price, brand, specific clubs
- **Sorting**: Trending, newest, price, popularity
- **Search**: "Show bags with Scotty Cameron putters"
- **Quick Actions**: Like, save, follow without leaving browse

#### 4. Social Features
- **Following System**: Follow users AND equipment
- **Engagement**: Likes, saves, shares
- **Discovery**: "Similar bags to yours", "Popular in your area"

## =ñ User Experience Flows

### Primary User Journeys

1. **New User Onboarding**
   Sign Up ’ Build First Bag ’ Feature Equipment ’ Discover Others ’ Follow Interesting Bags

2. **Equipment Research**
   Browse Bags ’ Filter by Handicap ’ Find Similar Player ’ View Their Equipment ’ Read Reviews ’ Purchase (Earn Affiliate)

3. **Social Engagement**
   Post Bag Photo ’ Followers See Update ’ Get Likes/Comments ’ Equipment Questions ’ Drive Affiliate Sales

4. **Monetization Journey**
   Showcase Bag ’ Others Discover ’ Click Equipment ’ Purchase ’ User Earns Commission ’ Motivation to Post More

## =€ Development Priorities

### Phase 1: Core Experience (Current)
-  Bag builder and showcase
-  Equipment browser
-  Basic social features
-  Glassmorphism design system
- = Supabase integration
- = Authentication flow

### Phase 2: Engagement Features
- Real equipment data via APIs
- Photo upload for bags
- Dynamic feed algorithm
- Email notifications
- Mobile optimization

### Phase 3: Monetization
- Affiliate link integration
- Commission tracking
- User dashboards
- Payment processing
- Premium features

### Phase 4: Scale
- AI equipment recommendations
- Tournament/event features
- Pro golfer partnerships
- International expansion
- Mobile apps

## =' Development Guidelines

### Code Standards
- **Components**: Functional components with TypeScript
- **Styling**: Tailwind utilities + component classes
- **State**: Server state in React Query, UI state in React
- **Forms**: React Hook Form + Zod validation
- **Errors**: User-friendly messages with recovery options

### Performance Requirements
- **LCP**: < 2.5s (Largest Contentful Paint)
- **FID**: < 100ms (First Input Delay)
- **CLS**: < 0.1 (Cumulative Layout Shift)
- **Image Loading**: Lazy load with blur placeholders
- **List Rendering**: Virtual scrolling for 50+ items

### Accessibility Standards
- **WCAG 2.1 AA** compliance minimum
- **Keyboard Navigation**: Full site navigable via keyboard
- **Screen Readers**: Proper ARIA labels and landmarks
- **Color Contrast**: 4.5:1 minimum for text
- **Focus Indicators**: Visible and consistent

## < Unique Selling Points

1. **Equipment as Identity**: First platform where gear IS the profile
2. **Monetization for Users**: Everyone can earn from their passion
3. **Visual Discovery**: See equipment in context, not just specs
4. **Handicap-Based Discovery**: Find relevant equipment for YOUR game
5. **Real Social Proof**: See what actual golfers play, not just pros

## =Ê Success Metrics

### User Engagement
- Daily Active Users (DAU)
- Bags created per user
- Photos uploaded per week
- Follow relationships created
- Time spent browsing

### Monetization
- Affiliate clicks per bag
- Conversion rate on equipment
- Revenue per user
- Commission payouts
- Premium subscription rate

### Platform Health
- User retention (Day 1, 7, 30)
- Viral coefficient (invites sent)
- Content creation rate
- Engagement rate (likes/follows)
- Equipment database growth

## <¯ Target Audience Profiles

### Primary: Equipment Enthusiasts (35%)
- Age: 25-45
- Handicap: 5-15
- Spend: $2,000+ annually on equipment
- Behavior: Research extensively, love discussing gear

### Secondary: Social Golfers (40%)
- Age: 18-35
- Handicap: 10-20
- Spend: $500-1,500 annually
- Behavior: Follow trends, influenced by peers

### Tertiary: Golf Influencers (25%)
- Age: 20-40
- Handicap: Scratch to 10
- Audience: 1K-100K followers
- Behavior: Create content, review equipment

## =. Future Vision

**Year 1**: Establish as THE golf equipment social platform
**Year 2**: Expand monetization and premium features
**Year 3**: International expansion and pro partnerships
**Year 5**: Multi-sport platform for all equipment enthusiasts

## Essential Code Patterns

### Glassmorphism Component
```jsx
className="bg-white/10 backdrop-blur-[10px] border border-white/20 rounded-xl p-6 shadow-[0_4px_6px_rgba(0,0,0,0.3)]"
```

### Primary CTA Button
```jsx
className="bg-primary hover:bg-primary/90 text-white"
```

### Affiliate Link Structure
```
https://partner.com/product?ref=teedclub&user=${userId}
```

## Current Project Status

- **Codebase**: Migrated from Lovable to local development
- **Database**: Supabase configured with complete schema
- **Auth**: Ready for implementation
- **UI**: Complete with glassmorphism design system
- **Next Steps**: Connect Supabase data, implement auth, add real equipment data

## Environment Variables
```
VITE_SUPABASE_URL=[configured]
VITE_SUPABASE_ANON_KEY=[configured]
VITE_AFFILIATE_KEY=[pending]
VITE_ALGOLIA_APP_ID=[pending]
VITE_STRIPE_PUBLIC_KEY=[pending]
```

## Key Commands

### Development
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

### Database
- Schema location: `/supabase/schema.sql`
- Migrations: `/supabase/*.sql`
- Sample data: `/sql/` directory

## Important Files & Directories

### Core Application
- `/src/App.tsx` - Main app component with routing
- `/src/lib/supabase.ts` - Supabase client configuration
- `/src/contexts/AuthContext.tsx` - Authentication state management

### Key Components
- `/src/components/Navigation.tsx` - Main navigation
- `/src/components/bag/` - Bag-related components
- `/src/components/equipment/` - Equipment components
- `/src/components/ui/` - shadcn/ui components

### Pages
- `/src/pages/Index.tsx` - Landing page
- `/src/pages/BagsBrowser.tsx` - Browse all bags
- `/src/pages/MyBagSupabase.tsx` - User's bag management
- `/src/pages/Equipment.tsx` - Equipment browser
- `/src/pages/Feed.tsx` - Social feed

### Services & Utilities
- `/src/services/` - Business logic and API calls
- `/src/hooks/` - Custom React hooks
- `/src/types/` - TypeScript type definitions
- `/src/lib/` - Utility functions

## Testing Approach
Currently no test framework is configured. When implementing tests:
1. Use Vitest for unit tests
2. React Testing Library for component tests
3. Playwright for E2E tests
4. Focus on critical user paths first

## Security Considerations
- Row Level Security (RLS) enabled on all tables
- Authentication required for write operations
- Public read access for bags/equipment
- User data isolation via RLS policies
- No sensitive data in client-side code

## Performance Optimizations
- Lazy loading for routes
- Image optimization with lazy loading
- React Query for server state caching
- Virtual scrolling for large lists
- Debounced search inputs

## Deployment Notes
- Build with `npm run build`
- Static hosting compatible (Vercel, Netlify)
- Environment variables required in production
- Supabase project must be configured
- Enable Google OAuth in Supabase dashboard

## Common Issues & Solutions

### Authentication Errors
- Check Supabase URL and anon key
- Verify RLS policies are correct
- Ensure profile creation trigger exists

### Image Upload Issues
- Verify Supabase storage buckets exist
- Check storage policies allow uploads
- Ensure file size limits are appropriate

### Performance Problems
- Enable React Query devtools in development
- Check for N+1 query problems
- Optimize large list rendering
- Use proper image formats and sizes