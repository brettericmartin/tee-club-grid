# Teed.club Design System & Brand Guidelines

## 🏌️ Brand Identity

### Core Concept
**"Your golf bag IS your social profile"**

Teed.club is a modern, social-first platform that transforms golf equipment sharing into a vibrant community experience. We're building the Instagram meets Pinterest of golf gear, where bags become visual stories and equipment becomes social currency.

### Platform Language & Terminology
- **"Tees"** instead of "Likes" - Using golf ball on tee icon
- **"Teed this up"** / **"X people teed this"** - Engagement language
- **"Build My Bag"** - Primary CTA for new users
- **"Dream Bag"** - Aspirational feature for equipment wishlists
- **"Equipment Connoisseur"** - Achievement/badge terminology
- **"Brand Loyalist"** - Users with single-brand bags

## 🎨 Visual Design Philosophy

### Design Principles
1. **Performance-First**: Every design decision prioritizes 60fps performance
2. **Mobile-Native**: Designed for one-handed use on smartphones
3. **Golf-Elegant**: Sophisticated dark theme inspired by premium golf courses at dusk
4. **Minimalist Luxury**: Clean interfaces with selective premium touches
5. **Community-Driven**: Visual hierarchy emphasizes user-generated content

### Dark Mode Foundation
- **Not pure black** - Uses sophisticated charcoal (#0A0A0A - #1F1F1F)
- **Depth through elevation** - 5-tier elevation system instead of heavy shadows
- **Selective glassmorphism** - ONLY on navigation bars for premium feel
- **Green accent threading** - Subtle teed green (#10B981) highlights throughout

## 🎨 Color Palette

### Primary Colors
```css
/* Signature Green - The heart of Teed.club */
--teed-green: #10B981
--teed-green-dark: #0D8A65
--teed-green-darker: #0B7055
--teed-green-soft: rgba(16, 185, 129, 0.1)

/* Dark Theme Foundation */
--bg-base: #0A0A0A        /* Deep background */
--bg-card: #141414        /* Card surfaces */
--bg-elevated: #1C1C1C    /* Hover states */
--bg-modal: #1F1F1F       /* Modals and overlays */
--bg-tooltip: #242424     /* Tooltips */
```

### Performance-Optimized Backgrounds
```css
/* CRITICAL: No transparency on content areas for GPU performance */
--solid-card: #1a1a1a     /* Feed cards, content */
--solid-elevated: #2a2a2a /* Buttons, inputs */
--solid-hover: #3a3a3a    /* Hover states */
```

### Borders & Dividers
```css
--border-subtle: rgba(255, 255, 255, 0.06)
--border-default: rgba(255, 255, 255, 0.1)
--border-strong: rgba(255, 255, 255, 0.15)
--border-green: rgba(16, 185, 129, 0.3)
```

### Text Hierarchy
```css
--text-primary: #FAFAFA                  /* Main content */
--text-secondary: rgba(250, 250, 250, 0.7) /* Supporting text */
--text-muted: rgba(250, 250, 250, 0.5)    /* Subtle hints */
```

### Special Effects
```css
/* Green Glow for CTAs and achievements */
--shadow-green-glow: 0 0 20px rgba(16, 185, 129, 0.2)
--shadow-green-button: 0 2px 8px rgba(16, 185, 129, 0.3)

/* Navigation Glassmorphism (Limited Use) */
--nav-bg: rgba(10, 10, 10, 0.75)
--nav-blur: 16px
--nav-accent: rgba(16, 185, 129, 0.3)
```

## 🎯 Typography

### Font Stack
```css
--font-display: 'Playfair Display', serif  /* Headlines, premium feel */
--font-body: 'Inter', sans-serif          /* Clean, readable body text */
```

### Type Scale
- **Hero**: 48px - Landing page headlines
- **Title**: 32px - Page titles
- **Heading**: 24px - Section headers
- **Subheading**: 20px - Card titles
- **Body**: 16px - Main content (mobile minimum)
- **Caption**: 14px - Supporting text
- **Small**: 12px - Timestamps, metadata

## 🎭 Animation & Interactions

### Golf-Themed Animations
All animations reference golf physics and movements:

#### Golf Ball Bounce
```css
/* 600ms bounce for achievements, tees, celebrations */
cubic-bezier(0.68, -0.55, 0.265, 1.55)
- Scale: 1 → 1.2 → 0.9 → 1.1 → 1
- Y-axis: 0 → -8px → 3px → -2px → 0
```

#### Smooth Transitions
```css
--ease-luxury: cubic-bezier(0.23, 1, 0.32, 1)     /* Premium feel */
--ease-golf-swing: cubic-bezier(0.87, 0, 0.13, 1) /* Natural golf motion */
```

### Standard Interactions
- **Hover Effects**: Green glow + subtle lift (-2px translate)
- **Card Hover**: Elevation change + border highlight
- **Equipment Tiles**: Scale(1.05) + border glow
- **Page Transitions**: 300ms fade + slide
- **Loading States**: Golf ball spinner with dimples

## 📱 Mobile-First Requirements

### Touch Optimization
- **Minimum touch targets**: 44x44px (WCAG AAA)
- **Text sizing**: 16px body minimum, 14px button minimum
- **Padding**: 16px minimum on mobile containers
- **Bottom navigation**: Fixed, always accessible
- **Gesture support**: Swipe, pinch-zoom, pull-to-refresh

### Performance Standards
- **LCP**: < 2.5s (Largest Contentful Paint)
- **FID**: < 100ms (First Input Delay)
- **CLS**: < 0.1 (Cumulative Layout Shift)
- **60fps**: All animations and scrolling
- **Bundle**: < 200KB initial, < 1MB total

## 🏗️ Component Architecture

### Elevation System
```
elevation-0: Base background (#0A0A0A)
elevation-1: Cards (#141414)
elevation-2: Hover states (#1C1C1C)
elevation-3: Modals (#1F1F1F)
elevation-4: Tooltips (#242424)
```

### Card Patterns
1. **User-themed Card**: Standard content card with green accent line
2. **Equipment Card**: Gallery item with hover glow
3. **Stats Card**: Semi-transparent with green border accent
4. **Glass Card (Hero Only)**: Reserved for primary bag displays

### Button Hierarchy
1. **Primary**: Solid green (#10B981) with glow shadow
2. **Secondary**: Transparent with border
3. **Ghost**: No border, subtle hover
4. **Icon**: Circular, 44px minimum

## 🎯 Target Audience

### Primary Users (18-45 years)
- **Equipment Enthusiasts**: Love showcasing and discussing gear
- **Social Golfers**: Share their golf lifestyle and connect
- **Gear Collectors**: Track and display equipment collections
- **Brand Ambassadors**: Passionate about specific golf brands

### User Personas
1. **The Gear Head**: Knows every spec, loves comparing equipment
2. **The Socialite**: Uses platform to connect and share experiences  
3. **The Aspirational**: Building dream bags, following pros
4. **The Collector**: Documents and showcases rare/vintage equipment

## 🎪 Unique Design Elements

### Golf-Specific Touches
- **Tee Icons**: Custom golf ball on tee for engagement
- **Equipment Hierarchy**: Drivers/Putters displayed 1.5x larger
- **Bag Visualization**: Vertical bag imagery as unifying element
- **Achievement Badges**: Golf-themed iconography
- **Loading States**: Golf ball physics animations

### Visual Bag Gallery
- **Pinterest-style Grid**: Dynamic masonry layout
- **Size Hierarchy**: Hero clubs (Driver, Putter) larger
- **Drag-and-Drop**: User-controlled arrangement
- **Custom Backgrounds**: Personalization options

### Feed Design
- **Masonry Layout**: Variable height cards for visual interest
- **Photo-First**: Images take priority over text
- **Flip Cards**: 3D rotation to reveal equipment details
- **Video Support**: Thumbnail previews with play buttons

## 🚫 Design Don'ts

### Performance Killers (AVOID)
- ❌ Glassmorphism on feed cards (60%+ GPU load)
- ❌ Complex blur effects on content areas
- ❌ Deep CSS nesting or :has() selectors
- ❌ Animations without GPU acceleration
- ❌ Images without lazy loading

### Visual Anti-Patterns
- ❌ Pure black backgrounds (#000000)
- ❌ Heavy drop shadows on mobile
- ❌ Text over images without overlays
- ❌ Buttons smaller than 44px
- ❌ Low contrast text (< 4.5:1 ratio)

## 🎯 Business & Monetization Alignment

### Visual Hierarchy Supporting Revenue
1. **Affiliate Links**: Prominent "Shop This" buttons with green CTA
2. **Premium Features**: Gold accents for subscription content
3. **Brand Partnerships**: Dedicated showcase areas
4. **Creator Content**: Featured placement with attribution

### Gamification Visuals
- **Badge System**: Tiered visual progression
- **Achievement Notifications**: Dramatic golf ball bounce
- **Leaderboards**: Clean stats with green highlights
- **Progress Bars**: Golf ball rolling animation

## 🌟 The Teed.club Vibe

### Overall Atmosphere
- **Premium Golf Course at Dusk**: Deep greens, sophisticated darkness
- **Modern Country Club**: Exclusive but welcoming
- **Digital Pro Shop**: Equipment showcase meets social space
- **Golf Instagram**: Visual-first, story-driven content

### Emotional Design Goals
- **Aspiration**: "I want that in my bag"
- **Pride**: "Look at my setup"
- **Community**: "We all love this game"
- **Discovery**: "I never knew about this equipment"
- **Achievement**: "I earned this badge"

## 📐 Implementation Guidelines

### CSS Architecture
- **Utility-First**: Tailwind CSS for rapid development
- **Component Classes**: Reusable .glass-card, .btn-primary
- **CSS Variables**: Centralized theming control
- **Mobile Breakpoints**: 768px (tablet), 1280px (desktop)

### Image Standards
- **Formats**: WebP primary, JPEG fallback, SVG icons
- **Sizes**: Icons < 50KB, Heroes < 200KB, Products < 100KB
- **Loading**: Lazy load below fold, eager above
- **Optimization**: 2x srcset for retina displays

### Accessibility
- **WCAG AAA**: Touch targets, color contrast
- **Focus States**: 2px green outline
- **Screen Readers**: Proper ARIA labels
- **Reduced Motion**: Respect user preferences

## 🔄 Evolution & Future

### Planned Enhancements
- **AR Bag Visualization**: 3D equipment viewing
- **Live Streaming**: Tournament watch parties
- **AI Recommendations**: Smart equipment suggestions
- **Virtual Pro Shop**: Immersive shopping experience

### Design System Growth
- Regular user feedback integration
- A/B testing for engagement optimization
- Performance monitoring and optimization
- Seasonal themes and special events

---

*This design system is a living document that evolves with Teed.club's growth. Every design decision prioritizes performance, mobile experience, and the joy of golf equipment culture.*