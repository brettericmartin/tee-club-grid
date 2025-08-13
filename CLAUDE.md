# CLAUDE.md - Teed.club Development Guide

## 🚨 CRITICAL DATA PROTECTION RULES 🚨

**NEVER DELETE USER DATA WITHOUT EXPLICIT PERMISSION**
- NEVER run cleanup scripts without explicit user confirmation showing exact data to be deleted
- NEVER truncate or delete from tables containing user-generated content
- ALWAYS ask "This will permanently delete X records. Are you absolutely sure?" with specific details
- ALWAYS prefer soft deletes or archiving over hard deletes
- ALWAYS check if data is user-generated vs seed data before ANY deletion
- ALWAYS warn if a script contains DELETE, TRUNCATE, or DROP statements

**Protected Tables (NEVER DELETE WITHOUT EXPLICIT PERMISSION):**
- equipment (if added_by_user_id is not null)
- equipment_photos (ALL rows - user uploads)
- user_bags (ALL rows)
- bag_equipment (ALL rows)
- profiles (ALL rows)
- feed_posts (ALL rows)
- Any table with user_id foreign key
- Any table with user-uploaded content

**Before Running ANY Cleanup Script:**
1. READ the entire script first
2. IDENTIFY all DELETE/TRUNCATE operations
3. WARN the user about what will be deleted
4. REQUIRE explicit confirmation with details
5. SUGGEST running a SELECT count first to show impact

## CRITICAL TASK EXECUTION RULES

**For ANY script or database operation:**
1. Provide EXACT terminal command: `node scripts/[filename].js`
2. Show expected output
3. Include troubleshooting steps
4. Always use scripts/ folder with './supabase-admin.js' import
5. Add error handling + console.log for progress

**BEFORE ANY DEVELOPMENT:**
- Run full schema check: `node scripts/check-schema.js`
- Review existing components and assets
- Verify table structures match implementation plans
- Check for existing utilities before creating new ones

**Interaction Guidelines:**
- Execute scripts directly when possible
- Focus on specific task context, not entire project scope
- Provide working code examples with clear implementation steps

## DESIGN CONSISTENCY REQUIREMENTS

**Component Reuse Mandate:**
- ALWAYS use existing components before creating new ones
- BagCompositeCard must be consistent across ALL contexts (feed, browser, profile)
- Equipment photos must use same source/sizing logic everywhere
- Feed posts must use standardized FeedItemCard component
- Navigation elements must be identical across all pages

**Asset Management:**
- Check for existing images/icons before adding new ones
- Use centralized image handling utilities
- Maintain single source of truth for equipment photos
- Prevent duplicate assets or redundant components

## 🚀 PERFORMANCE-FIRST DESIGN REQUIREMENTS

### **Critical Performance Rules**

**Glassmorphism Restrictions:**
- ✅ **ALLOWED ONLY ON:** Navigation bars (top nav only)
- ❌ **NEVER USE ON:** Feed cards, content areas, modals, buttons, stats cards
- **Replacement Strategy:** Use solid backgrounds (#1a1a1a, #2a2a2a, #3a3a3a)
- **Why:** Backdrop-filter causes 60%+ GPU load on mobile devices

**Color Palette for Performance:**
```css
/* Primary backgrounds - NO transparency */
--bg-primary: #111111;      /* Main background */
--bg-card: #1a1a1a;        /* Cards, modals */
--bg-elevated: #2a2a2a;    /* Buttons, inputs */
--bg-hover: #3a3a3a;       /* Hover states */

/* Borders - Minimal opacity */
--border-subtle: rgba(255,255,255,0.1);
--border-strong: rgba(255,255,255,0.2);
```

**Image Optimization Requirements:**
- **Max sizes:** Icons: 50KB, Hero images: 200KB, Product photos: 100KB
- **Formats:** Use WebP with JPEG fallback, SVG for icons
- **Loading:** `loading="lazy"` on ALL images except above-fold
- **Responsive:** Provide srcset for 1x, 2x displays
- **Current Issues:** dog.png (1.4MB), MYBAG.png (1.3MB) need immediate optimization

**Mobile-First Requirements:**
- **Touch targets:** Minimum 44x44px (WCAG AAA)
- **Text sizing:** Body 16px minimum, buttons 14px minimum
- **Spacing:** 16px minimum padding on mobile
- **Viewport:** Prevent horizontal scroll with `overflow-x-hidden`
- **Gestures:** Support swipe, pinch-zoom, pull-to-refresh

**React Performance Patterns:**
```tsx
// REQUIRED for heavy components
export default React.memo(ComponentName);

// REQUIRED for expensive calculations
const expensiveValue = useMemo(() => computeValue(data), [data]);

// REQUIRED for stable callbacks
const handleClick = useCallback(() => {}, [dependency]);

// AVOID: 20+ useState in single component
// USE: useReducer or split into smaller components
```

**CSS Performance Guidelines:**
- **Avoid:** Complex selectors, deep nesting, :has() pseudo-class
- **Use:** BEM naming, utility classes, CSS-in-JS for dynamic styles
- **GPU Acceleration:** Use `transform` and `opacity` for animations
- **Will-change:** Add only during animation, remove after

### **Performance Monitoring Metrics**

**Target Metrics:**
- **LCP (Largest Contentful Paint):** < 2.5s
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1
- **TTI (Time to Interactive):** < 3.5s
- **Bundle Size:** < 200KB initial, < 1MB total

**Testing Requirements:**
- Test on iPhone 12 mini (worst case iOS)
- Test on mid-range Android (Pixel 4a)
- Test on 3G connection speeds
- Test with CPU throttling (4x slowdown)

## Platform Vision

**Core Concept:** "Your golf bag IS your social profile"

**Key Success Factors:**
- $7.1B golf equipment market with no dedicated social platform
- Community-driven content with gamification rewards
- Clear monetization through affiliate revenue sharing

## Technical Foundation

**Stack:** Vite + React + TypeScript + Supabase + Tailwind CSS
**Design:** Mobile-first, performance-optimized, golf-themed interactions ("Tees" not "Likes")
**Database:** PostgreSQL with Row Level Security

## Business Model & Monetization Strategy

### Revenue Streams:
1. **Primary: Affiliate Commissions** (3-8% from golf brands) - 50/50 split with users who showcase equipment
2. **Premium Subscriptions** ($5/month target) - Multiple bags, advanced customization, dream bag builder
3. **Future: Brand Partnerships** - Sponsored showcases, exclusive launches, tournament sponsorships

### Affiliate Link Strategy:
- **Phase 1**: Direct manufacturer links (no commission) to build functionality
- **Phase 2**: Apply to individual brand affiliate programs (Callaway, TaylorMade, Ping, etc.)
- **Phase 3**: Integrate affiliate networks (Commission Junction, ShareASale)
- **Implementation**: Link management system to easily swap regular → affiliate links

### Premium Subscription Features:
- **Free Tier**: 1 bag per user
- **Premium Tier**: Unlimited bags, advanced customization, dream bag builder
- **Value Proposition**: Build value before introducing pricing

## Gamification & Community Engagement

### Badge System Architecture:
**Core Categories:**
- **Early Bird**: Early adopter recognition
- **Photo Mastery**: Tiered photo contributions (5, 50, 100+ photos)
 - Introductory → Advanced → Expert → Master
- **Equipment Connoisseur**: Adding equipment to platform
- **Brand Specialist**: 3+ pieces from same brand (brand-specific badges)
- **Brand Loyalist**: All clubs from single brand
- **Community Contributor**: Forum participation, reviews, helpful content

**Badge Implementation Requirements:**
- Expandable system for future badge types
- User action tracking and analytics
- Dramatic achievement notifications with feed post options
- Public badge display on profiles
- Badge-based credibility scoring

### Content Moderation & Quality:
- Equipment duplicate reporting system
- Community review for flagged content
- User-driven equipment additions with approval workflow
- Forum system for equipment discussions and "brand clubs"

## Personal Portfolio System

### User Contribution Curation:
**Public-Facing Portfolio Features:**
- Personal badge showcase
- Photo gallery (user-curated, removable content)
- Equipment additions to platform
- Contribution history and impact metrics
- Customizable personal brand presentation

**Privacy Controls:**
- User-controlled visibility settings
- Selective content display
- Portfolio customization tools

## AI-Enhanced Equipment Intelligence

### Equipment Data Strategy:
**Priority Information Hierarchy:**
1. **Specifications** - Technical details, materials, performance metrics
2. **Professional Usage** - Which pros use this equipment
3. **Tournament History** - Notable wins with equipment in bag
4. **Community Reviews** - User-generated insights

**AI Implementation Approach:**
- Specific, detailed prompt templates to prevent fabrication
- Real-time query system for equipment details
- Structured data collection and verification
- Integration with golf databases and tour information

### Equipment Value Proposition:
- Comprehensive club specifications
- Professional tour usage tracking
- Tournament performance correlation
- Investment and resale value insights

## Visual Bag Gallery System

### Dynamic Collage Layout:
**Equipment Size Hierarchy:**
- **1.5x**: Drivers and Putters (hero clubs)
- **1.25x**: Woods, Hybrids, Iron Sets
- **1.0x**: Accessories (balls, speakers, towels, etc.)
- **Visual Integration**: Vertical bag imagery to unify presentation

**Customization Features:**
- Pinterest-style dynamic grid layout
- Drag-and-drop tile positioning
- User-controlled sizing and arrangement
- Auto-arrange option with manual override
- Custom backgrounds and color schemes
- Save/share custom layouts

**Technical Requirements:**
- Mobile-responsive grid system
- Touch gesture support for repositioning
- Real-time preview during editing
- Gallery view optimized for social sharing

## Key Design Standards

**Visual Identity:**
- **Performance-Optimized Styling:**
 - Glassmorphism ONLY for: Nav bars, primary bag cards
 - Solid backgrounds for: Feed cards (#1a1a1a), content areas (#2a2a2a), modals (#1f1f1f)
 - Reduced blur effects: Only where absolutely necessary
- **Color Palette:** 
 - Background #111111
 - Card backgrounds #1a1a1a (no transparency)
 - Elevated surfaces #2a2a2a
 - Primary #10B981 (green CTAs)
- **Mobile-first:** 
 - Touch targets 44x44px minimum
 - Bottom navigation
 - Single column layouts
 - Optimized for one-handed use

**Platform Language:**
- "Tees" instead of "Likes" (golf ball on tee icon)
- "Teed this up" / "X people teed this"
- Database: bag_tees, equipment_tees tables

**Performance Standards:**
- Lazy load all images below the fold
- Use srcset for responsive images
- Implement virtual scrolling for long lists
- Minimize re-renders with proper React optimization
- Cache equipment data aggressively

## Animation & Interaction Standards

**Core Animation Principles:**
- **Performance First:** All animations must maintain 60fps
- **Golf-Themed:** Subtle references to golf physics (ball bounce, club swing curves)
- **Mobile Optimized:** Touch gestures and haptic-style feedback
- **Accessibility:** Respect prefers-reduced-motion settings

**Standard Animations:**

1. **Scroll Animations:**
   - Fade-in-up for feed cards (500ms, 20px translate)
   - Staggered delays for list items (50ms between items)
   - Intersection Observer with 10% threshold
   - Auto-play only when 50% visible

2. **Interaction Feedback:**
   - **Golf Ball Bounce:** 600ms cubic-bezier(0.68, -0.55, 0.265, 1.55)
     - Used for: Tee button clicks, achievements, celebrations
     - Scale sequence: 1 → 1.2 → 0.9 → 1.1 → 1
     - Y-axis movement: 0 → -8px → 3px → -2px → 0
   
3. **Hover Effects:**
   - **Primary Buttons:** Green glow (0 0 20px rgba(16,185,129,0.4)) + subtle lift (-2px)
   - **Cards:** Elevation change (4px lift) + shadow enhancement
   - **Equipment Tiles:** Scale(1.05) + border highlight
   - Transition: 300ms ease-out for all hovers

4. **Loading States:**
   - **Skeleton Screens:** Pulse animation for content placeholders
   - **Golf Ball Spinner:** Rotating golf ball with dimples
   - **Progress Bars:** Golf ball rolling along track

5. **Page Transitions:**
   - **Route Changes:** Fade + slide (300ms)
   - **Modal Opens:** Scale(0.95 → 1) + fade
   - **Tab Switches:** Horizontal slide with momentum

**Timing Functions:**
- **Smooth:** cubic-bezier(0.4, 0, 0.2, 1) - General transitions
- **Golf Swing:** cubic-bezier(0.87, 0, 0.13, 1) - Natural golf motion
- **Bounce:** cubic-bezier(0.68, -0.55, 0.265, 1.55) - Playful interactions

**Animation Utilities Location:**
- Central animations: `/src/utils/animations.ts`
- Tailwind animations: `tailwind.config.ts` (golf-bounce, fade-in-up, glow-pulse)
- Component-specific: Inline with clear comments

**Mobile Gesture Support:**
- Swipe left/right for navigation
- Pull-to-refresh with golf swing animation
- Pinch-to-zoom on equipment photos
- Long-press for context menus
- Drag-to-reorder for bag equipment
**Data Security**
- NEVER EVER DELETE DATA TIED TO USERS THAT THEY HAVE INPUT
- We MAY come up with a workflow to manually review posts/photos that are reported, but YOU may NEVER delete data that wasnt' created for demo purposes. This will lose users faster than anything else. 