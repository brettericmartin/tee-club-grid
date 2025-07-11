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

## Business Model & Monetization

Revenue Streams:
1. Primary: Affiliate Commissions (4-10% from golf brands) - 50/50 split with users who showcase equipment
2. Secondary: Premium Subscriptions ($9.99-19.99/month) - Advanced analytics, exclusive drops, enhanced customization
3. Future: Brand Partnerships - Sponsored showcases, exclusive launches, tournament sponsorships

## Design System & Visual Identity

Core Design Philosophy: Premium, Modern, Golf-Inspired - Dark theme with glassmorphism effects

Color Palette:
- Background: #000000 (True black for OLED)
- Foreground: #ffffff
- Primary: #10B981 (Signature green for CTAs)
- Secondary: #1f2937
- Border: rgba(255, 255, 255, 0.1)

Glassmorphism Standards:
- background: rgba(255, 255, 255, 0.1)
- backdrop-filter: blur(10px)
- border: 1px solid rgba(255, 255, 255, 0.2)
- box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3)

Component Standards:
- Border Radius: 12px for cards, 8px for smaller elements
- Transitions: 0.2s ease on all interactive elements
- Hover States: Slight scale (1.05) and increased opacity

## Technical Architecture

Tech Stack:
- Frontend: Vite + React + TypeScript
- Styling: Tailwind CSS + shadcn/ui + Custom Glassmorphism
- Database: Supabase (PostgreSQL) with Row Level Security
- State Management: TanStack Query + React Context
- Authentication: Supabase Auth (Email + Google OAuth)
- File Storage: Supabase Storage (user photos)

Database Schema:
- profiles -> user_bags -> bag_equipment -> equipment
- Social: follows, bag_likes, equipment_saves
- Content: feed_posts, equipment_photos, equipment_reviews
- Commerce: equipment_prices, wishlist, affiliate_tracking

Scripts System:
- All database operations use scripts in /scripts folder
- supabase-admin.js - Admin client with service key
- seed-*.js - Data seeding scripts
- migrate-*.js - Schema migration scripts

## Key Features

Bag Showcase System:
- Featured Equipment: Users select 6 clubs + 4 accessories to feature
- Visual Display: 3x2 grid with glassmorphism styling
- Interaction: Click equipment for details, click bag for full view

Dynamic Feed:
- Content Types: Bag photos, equipment updates, equipment showcases, AI suggestions
- Algorithm: Prioritizes followed users, mixes in discovery content
- Flippable cards revealing bag details

Equipment Browser:
- Filtering: By handicap, price, brand, specific clubs
- Sorting: Trending, newest, price, popularity
- Search: Show bags with specific equipment

Social Features:
- Following: Follow users AND equipment
- Engagement: Likes, saves, shares
- Discovery: Similar bags, popular in area

## Development Status & Priorities

Current Status:
- Bag builder and showcase complete
- Equipment browser complete
- Basic social features complete
- Glassmorphism design system complete
- Supabase integration in progress
- Authentication flow in progress

Next Steps:
1. Connect Supabase to fetch real data
2. Implement authentication
3. Add equipment API integration
4. Build photo upload functionality
5. Create dynamic feed algorithm

## Code Patterns

Glassmorphism Component:
className="bg-white/10 backdrop-blur-[10px] border border-white/20 rounded-xl p-6 shadow-[0_4px_6px_rgba(0,0,0,0.3)]"

Primary Button:
className="bg-primary hover:bg-primary/90 text-white"

Supabase Query:
const { data, error } = await supabase.from('user_bags').select('*, bag_equipment(*, equipment(*))').eq('user_id', userId)

## Environment Variables

VITE_SUPABASE_URL=https://kgleorvvtrqlgolzdbbw.supabase.co
VITE_SUPABASE_ANON_KEY=[configured]
SUPABASE_SERVICE_KEY=[in .env.local only]

## Target Audience

Primary (35%): Equipment Enthusiasts
- Age 25-45, Handicap 5-15
- Spend $2000+ annually
- Research extensively, love discussing gear

Secondary (40%): Social Golfers  
- Age 18-35, Handicap 10-20
- Spend $500-1500 annually
- Follow trends, influenced by peers

Tertiary (25%): Golf Influencers
- Age 20-40, Handicap Scratch to 10
- Create content, review equipment
- Monetization focused

## Success Metrics

User Engagement: DAU, bags created, photos uploaded, follows, time spent
Monetization: Affiliate clicks, conversion rate, revenue per user, commissions
Platform Health: Retention (D1/D7/D30), viral coefficient, content creation rate

## Future Vision

Year 1: Establish as THE golf equipment social platform
Year 2: Expand monetization and premium features
Year 3: International expansion and pro partnerships
Year 5: Multi-sport platform for all equipment enthusiasts