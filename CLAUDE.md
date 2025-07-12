# CLAUDE.md - Teed.club Development Guide

## CRITICAL TASK EXECUTION RULES

**For ANY script or database operation:**
1. Provide EXACT terminal command: `node scripts/[filename].js`
2. Show expected output
3. Include troubleshooting steps
4. Always use scripts/ folder with './supabase-admin.js' import
5. Add error handling + console.log for progress

**Interaction Guidelines:**
- Execute scripts directly when possible
- Focus on specific task context, not entire project scope
- Provide working code examples with clear implementation steps

## Platform Vision

**Core Concept:** "Your golf bag IS your social profile"

**Key Success Factors:**
- $7.1B golf equipment market with no dedicated social platform
- Community-driven content with gamification rewards
- Clear monetization through affiliate revenue sharing

## Technical Foundation

**Stack:** Vite + React + TypeScript + Supabase + Tailwind CSS
**Design:** Mobile-first, glassmorphism, golf-themed interactions ("Tees" not "Likes")
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
- Glassmorphism effects: `backdrop-filter: blur(10px)`, `background: rgba(255,255,255,0.1)`
- Color Palette: Background #111111, Cards #1a1a1a, Primary #10B981 (green)
- Mobile-first: Touch targets 44x44px+, bottom navigation, single column layouts

**Platform Language:**
- "Tees" instead of "Likes" (golf ball on tee icon)
- "Teed this up" / "X people teed this"
- Database: bag_tees, equipment_tees tables