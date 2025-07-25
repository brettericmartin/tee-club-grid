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

**Performance-First Design:**
- Glassmorphism ONLY for navigation bars and primary bag cards
- Use solid grays (#1a1a1a, #2a2a2a, #3a3a3a) for content areas
- Minimize backdrop-filter usage to reduce GPU load
- Lazy load all images with blur placeholders
- Virtual scrolling for lists over 50 items

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
**Data Security**
- NEVER EVER DELETE DATA TIED TO USERS THAT THEY HAVE INPUT
- We MAY come up with a workflow to manually review posts/photos that are reported, but YOU may NEVER delete data that wasnt' created for demo purposes. This will lose users faster than anything else. 