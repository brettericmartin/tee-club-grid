# CLAUDE.md - Teed.club Complete Project Context

## CRITICAL WORKFLOW INSTRUCTIONS FOR CLAUDE

When creating ANY script or database operation, ALWAYS provide:
1. The EXACT terminal command to run
2. Expected output
3. Troubleshooting steps

Use this format:
- Created: scripts/[filename].js
- TO RUN: node scripts/[filename].js
- Expected output: [Show exact expected output]
- If it fails: [Specific troubleshooting steps]

For all database scripts:
- Always use the scripts/ folder
- Import from './supabase-admin.js'
- Include error handling
- Add console.log for progress

## Claude Interaction Guidelines

- Don't ask me to run a script unless there's a reason you can't run it yourself

## Core Vision & Mission

"Your golf bag IS your social profile" - Instead of traditional profiles, golfers showcase their equipment setups as their digital identity. Every golfer's bag tells their story through the clubs they choose.

Why Teed.club Will Succeed:
- $7.1 billion golf equipment market with no dedicated social platform
- Golfers are obsessed with equipment discussions and gear optimization  
- Clear monetization path through affiliate revenue sharing
- First-mover advantage - No competitor exists in this space

## MOBILE-FIRST DEVELOPMENT APPROACH

This is a MOBILE-FIRST application. Most users will access Teed.club on their phones while:
- At the golf course
- In the pro shop
- Browsing equipment during downtime
- Sharing quick bag updates

All UI decisions must prioritize mobile experience:
- Touch-friendly tap targets (minimum 44x44px)
- Thumb-reachable navigation
- Vertical scrolling preferred over horizontal
- Bottom navigation for primary actions
- Single column layouts on mobile
- Swipe gestures for common actions
- Large, readable text (16px minimum)
- Optimized images and lazy loading
- Offline-capable for course usage

Desktop is secondary and should be a scaled-up mobile experience, not a separate design.

## Business Model & Monetization

Revenue Streams:
1. Primary: Affiliate Commissions (4-10% from golf brands) - 50/50 split with users who showcase equipment
2. Future: Brand Partnerships - Sponsored showcases, exclusive launches, tournament sponsorships

## Design System & Visual Identity

Core Design Philosophy: Premium, Modern, Golf-Inspired - Softer dark theme with glassmorphism effects

Color Palette:
- Background: #0a0a0a (Near black) or #111111 (Softer dark gray)
- Card Background: #1a1a1a (Elevated surfaces)
- Foreground: #ffffff
- Primary: #10B981 (Signature green for CTAs)
- Secondary: #1f2937
- Border: rgba(255, 255, 255, 0.1)
- True Black: #000000 (Use sparingly for accents only)

Mobile-Specific Design:
- Bottom navigation bar (fixed)
- Full-width cards with 16px padding
- Stacked layouts, no side-by-side on mobile
- Pull-to-refresh on feed
- Swipe to tee/save
- Touch feedback on all interactive elements

Glassmorphism Standards:
- background: rgba(255, 255, 255, 0.1)
- backdrop-filter: blur(10px)
- border: 1px solid rgba(255, 255, 255, 0.2)
- box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3)

Component Standards:
- Border Radius: 12px for cards, 8px for smaller elements
- Transitions: 0.2s ease on all interactive elements
- Hover States: Slight scale (1.05) and increased opacity
- Touch States: Immediate visual feedback

## Unique Platform Language - "Teed"

Replace traditional "likes" with golf-themed "tees":
- "Like" action becomes "Tee" or "Tee up"
- "Liked" state becomes "Teed"
- Like count shows as "X tees" or "X teed this"
- Icon: Golf ball on tee (🏌️ or custom SVG)
- Hover text: "Tee this up" / "Teed"
- Past tense: "You teed this"
- Feed language: "Sarah teed your bag setup"

Implementation:
- Database: Rename like tables to tee tables (bag_tees, equipment_tees, photo_tees)
- UI: Replace heart icons with golf ball on tee icon
- Copy: Update all instances of "like/liked" to "tee/teed"

## Technical Architecture

Tech Stack:
- Frontend: Vite + React + TypeScript (with PWA capabilities)
- Styling: Tailwind CSS + shadcn/ui + Custom Glassmorphism
- Database: Supabase (PostgreSQL) with Row Level Security
- State Management: TanStack Query + React Context
- Authentication: Supabase Auth (Email + Google OAuth)
- File Storage: Supabase Storage (user photos)

Mobile Optimizations:
- PWA manifest for installability
- Service worker for offline capability
- Touch gesture handling
- Viewport meta tags
- Mobile-first responsive breakpoints

Database Schema:
- profiles -> user_bags -> bag_equipment -> equipment
- Social: follows, bag_tees (formerly likes), equipment_saves
- Content: feed_posts, equipment_photos, equipment_reviews
- Commerce: equipment_prices, wishlist, affiliate_tracking

Scripts System:
- All database operations use scripts in /scripts folder
- supabase-admin.js - Admin client with service key
- seed-*.js - Data seeding scripts
- migrate-*.js - Schema migration scripts

## Key Features (Mobile-First Implementation)

Bag Showcase System:
- Featured Equipment: 6 clubs + 4 accessories
- Mobile: 2x3 grid for clubs, horizontal scroll for accessories
- Tap to view details, long-press for quick actions
- Swipe between multiple bags

Dynamic Feed:
- Vertical scroll optimized
- Pull-to-refresh
- Infinite scroll with intersection observer
- Card-based layout full width on mobile
- Double-tap to tee

Equipment Browser:
- Single column on mobile
- Sticky filter bar that collapses on scroll
- Bottom sheet for detailed filters
- Search with mobile keyboard optimization

Social Features:
- Bottom tab navigation: Feed, Bags, Add, Equipment, Profile
- Quick action buttons thumb-reachable
- Swipe gestures for tee/save
- Native share sheets

## Development Status & Priorities

Current Status:
- Bag builder and showcase complete (needs mobile optimization)
- Equipment browser complete (needs mobile optimization)
- Basic social features complete
- Glassmorphism design system complete
- Supabase integration in progress
- Authentication flow in progress

Next Steps:
1. Redesign all components for mobile-first
2. Implement bottom navigation
3. Add touch gestures and haptic feedback
4. Update color scheme to softer grays
5. Implement "Tee" system replacing likes
6. Connect Supabase to fetch real data
7. Implement authentication with mobile-friendly flow
8. Build camera integration for photos
9. Create PWA manifest and service worker

## Code Patterns

Mobile-First Breakpoints:
```css
/* Mobile first - default styles for mobile */
/* sm: 640px - larger phones */
/* md: 768px - tablets */
/* lg: 1024px - desktop */