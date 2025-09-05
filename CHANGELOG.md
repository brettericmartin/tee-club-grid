# Changelog

All notable changes to the Teed.club platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) during alpha (0.x.x versioning).

## [Unreleased]

## [0.21.0] - 2025-09-05
### Fixed
- **CRITICAL**: Resolved app-breaking dynamic import errors in App.tsx and MyBagSupabase.tsx
  - Removed all lazy loading and React.Suspense usage causing "Failed to fetch dynamically imported module" errors
  - Fixed syntax errors from incomplete Suspense removal (stray `}>` fragments)
  - My Bag page now loads without crashing
- **Tee System (Likes)**: Complete restoration of like functionality
  - Fixed RLS policies blocking bag_likes and likes table operations
  - Added proper INSERT policies for authenticated users
  - Fixed trigger functions for automatic count updates
- **Equipment Photos**: Restored photo display throughout the application
  - Fixed RLS policies on equipment_photos table blocking SELECT operations
  - Resolved photo URL access issues in equipment details and bag views
  - Fixed photo priority logic (custom → most liked → default)
- **Share Modal**: Fixed screenshot functionality
  - Card view now properly receives and displays equipment photos
  - List view correctly handles empty equipment arrays with fallback
  - Removed broken separate route approach in favor of integrated modal
- **Equipment Page**: Fixed "Saved items only" filter not triggering data reload

### Changed
- Completely removed dynamic imports and code splitting for stability
- Simplified component imports to direct imports instead of lazy loading
- Enhanced error boundaries and error handling throughout

### Technical Details
- Created migration: `20250904_fix_equipment_photos_rls.sql`
- Added comprehensive testing scripts for photo display and tee system
- Implemented Puppeteer tests for automated page validation

## [0.20.0] - 2025-08-29
### Fixed
- Emergency fix for equipment null reference errors causing app crashes
- Identified and documented Row Level Security (RLS) issue blocking equipment table access
- Complete beta system overhaul - instant access after waitlist signup with password
- Removed all leaderboard references for cleaner, focused experience
- Fixed authentication flow - proper redirects after signup and better error handling

### Changed
- Simplified invite system - removed complex referral tracking in favor of simple invite codes
- Changed all CTAs from 'Apply for Beta' to 'Join the Beta' for better conversion

### Added
- Puppeteer testing suite for automated page validation

## [0.19.0] - 2025-08-28
[Previous version content...]

## [0.18.0] - 2025-08-28
### Fixed
- Critical RLS (Row Level Security) issues preventing anonymous waitlist submissions
- Standardized admin system to use `profiles.is_admin` throughout the application
- Removed dual admin system conflict between frontend and API middleware
- Migrated legacy `admins` table users to `profiles.is_admin` column
- Simplified overly complex RLS policies causing recursive issues

### Changed
- Admin authentication now consistently uses `profiles.is_admin` flag
- API middleware updated to check `profiles` table instead of legacy `admins` table
- Consolidated 40+ RLS fix attempts into single comprehensive solution

### Added
- Comprehensive database schema and beta system audit scripts
- Admin system migration tool (`scripts/migrate-admin-system.js`)
- RLS status checking utilities for debugging policy issues
- Complete waitlist flow testing script
- Documentation for applying critical RLS fixes (`APPLY_RLS_FIX_NOW.md`)

### Technical Debt
- Identified 45+ SQL fix files and 250+ test scripts requiring cleanup
- Documented need to consolidate redundant migration files
- Marked legacy `admins` table for removal after verification

## [0.17.0] - 2025-08-21
### Fixed
- BagShareView component by replacing html2canvas with html-to-image library
- Vercel deployment issues by consolidating API functions (12 function limit)
- Moved middleware and utils out of api folder to reduce function count
- Changed cron job frequency to daily (3 AM UTC) to comply with Vercel hobby plan
- Removed test/debug endpoints and fixed TypeScript errors for production
- Duplicate variable declarations in App.tsx causing build errors

### Added
- Comprehensive technical fixes repository documenting 127+ commits

## [0.16.0] - 2025-08-20
### Fixed
- Infinite recursion in Row Level Security policies preventing forum, feed, and bags from loading
- useAdminAuth hook to check profiles table instead of non-existent admins table

### Added
- Comprehensive beta/waitlist application system with scoring (0-15 points)
- Admin dashboard with centralized control panel
- Beta information page documenting application process
- CLI tools for managing beta access: grant-beta-access.js and check-user-access.js
- Admin-only menu option in profile dropdown
- Waitlist admin page for reviewing and approving beta applications

### Changed
- Updated landing page CTA from 'Join as a Founder' to 'Apply for the Beta'
- Admin users now automatically have beta access without separate approval
- BetaGuard component now properly handles admin users

## [0.15.0] - 2025-08-18
### Fixed
- Simplified authentication to prevent issues when switching browser tabs
- Removed aggressive auth monitoring that was causing site breakage
- Critical auth initialization error causing blank screen
- Disabled Supabase auth state listener that was firing incorrectly on tab switches
- ShareModal now correctly generates /bag/username/bagname URLs
- Critical auth profile creation for new users
- Implement proper server-side pagination and null handling for Equipment page
- Complete auth rewrite following Supabase best practices
- Made auth completely lazy - no checks until needed

### Added
- Username-based routing for cleaner share URLs (/@username instead of /bag/uuid)
- Equipment specifications (shaft, grip, loft) now visible in MyBag list view
- Centralized auth events (AUTH_EVENTS constants)
- Token refresh mechanism

### Changed
- Basic session management without intrusive monitoring

## [0.14.0] - 2025-08-17
### Added
- Feed now only shows posts with pictures for better visual experience
- Cleanup script to remove old posts without pictures
- Automatic filtering of pictureless posts in feed service
- Scheduled cleanup script for automated feed maintenance
- Patch notes page to track all updates and improvements

### Fixed
- Feed filtering to check both media_urls and content.photo_url

## [0.13.3] - 2025-08-17
### Fixed
- Google profile pictures being overwritten on profile updates
- Improved Google user profile creation with proper username and display name
- Prevented auth metadata from being unnecessarily updated for Google users
- Added SQL migration to properly handle Google avatar URLs separately

## [0.13.2] - 2025-08-17
### Fixed
- Content not loading after a few actions due to auth token expiry
- Added automatic session refresh when JWT token expires
- Better error handling for auth-related query failures
- Queries now retry automatically after session refresh

## [0.13.1] - 2025-08-17
### Fixed
- Missing X button on equipment edit dialogs
- Added custom_specs column to bag_equipment table for shaft/grip preferences
- Enhanced dialog close button visibility with better styling

## [0.13.0] - 2025-08-17
### Added
- Patch notes page to track all updates and improvements
- Updates button to navigation (desktop and mobile)
- Version history with categorized changes and badges

## [0.12.0] - 2025-08-17
### Added
- Comprehensive equipment customization with shaft/grip search
- 'No preference' options for all equipment customizations
- Loft editing for existing equipment in bags

### Fixed
- Modal UX - added X button, tap outside to close, z-index issues
- Critical UI and database stability improvements
- N+1 query problem reducing database calls
- Forum reactions now persist after page refresh

### Performance
- Optimized feed/equipment loading for anonymous users

## [0.11.0] - 2025-08-16
### Fixed
- Critical fixes for likes/tees and follow system

### Added
- Custom domain auth.teed.club for Supabase authentication

## [0.10.0] - 2025-08-15
### Added
- Multi-equipment photo posts with masonry feed layout

### Fixed
- Google OAuth authentication and profile editing

## [0.9.0] - 2025-08-14
### Added
- Equipment pricing system with comparison and verification
- Price tracking across multiple retailers
- Enhanced equipment detail pages with pricing data

## [0.8.0] - 2025-08-13
### Added
- Automated forum feedback agent workflow
- Enhanced forum moderation capabilities

## [0.7.0] - 2025-08-12
### Fixed
- Updated equipment photo priority logic
- Addressed multiple batches of forum feedback
- Enhanced user experience based on community input

## [0.6.0] - 2025-08-11
### Fixed
- Equipment editor modal mobile responsiveness
- Simplified feed post creation - only create posts when adding photos
- Prevented duplicate feed posts when adding equipment photos

### Added
- Animations and mobile optimizations throughout the app
- Quick featured toggle for equipment items
- Optimized modals for mobile devices

## [0.5.0] - 2025-08-10
### Fixed
- Share card now uses actual BagCard component

### Improved
- Mobile scaling for share functionality
- Better social sharing preview rendering

## [0.4.0] - 2025-08-05
### Added
- Equipment review system with tee functionality
- Bag management features and organization

### Fixed
- Feed tee persistence across sessions
- Equipment page mobile layout improvements
- React.forwardRef undefined error in production build
- Revert Vite chunk config to fix production build error

## [0.3.0] - 2025-07-25
### Added
- OpenAI Vision API integration for equipment detection
- Structured 3-step AI bag analysis workflow

### Fixed
- Robust JSON extraction for OpenAI responses
- Updated from gpt-4-vision-preview to gpt-4o model
- Node.js version compatibility for Vercel deployment

## [0.2.0] - 2025-07-19
### Added
- Comprehensive forum system with mobile-optimized UI
- Redesigned landing page with real equipment showcase
- Nested comments and replies in forum

### Fixed
- Dynamic import errors and user profile enhancements
- Major UI/UX improvements and bug fixes

## [0.1.0] - 2025-07-12
### Added
- Core platform with equipment management system
- User authentication with Supabase
- Golf ball on tee branding and Tees engagement metrics
- Mobile navigation with bottom navigation bar
- Equipment submission with smart autocomplete
- Vercel deployment configuration

## [0.0.1] - 2025-07-06
### Added
- Initial commit - teed.club from Lovable
- Basic project structure
- Supabase integration setup

---

## Technical Details for Developers

For a comprehensive list of all technical fixes and implementation details, please refer to:
- `/docs/TECHNICAL_FIXES_REPOSITORY.md` - Complete historical record of all technical fixes
- `/src/data/patchNotes.ts` - User-facing patch notes displayed in the app

### Commit Categories
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Test additions or fixes
- **chore**: Build process or auxiliary tool changes

### Version Numbering (Alpha)
- We're in alpha (0.x.x) until the platform is feature-complete
- Minor (0.X.0): New features or significant improvements
- Patch (0.x.Y): Bug fixes and small improvements
- Version 1.0.0 will be our official launch out of alpha

[Unreleased]: https://github.com/brettericmartin/tee-club-grid/compare/v0.17.0...HEAD
[0.17.0]: https://github.com/brettericmartin/tee-club-grid/compare/v0.16.0...v0.17.0
[0.16.0]: https://github.com/brettericmartin/tee-club-grid/compare/v0.15.0...v0.16.0
[0.15.0]: https://github.com/brettericmartin/tee-club-grid/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/brettericmartin/tee-club-grid/compare/v0.13.3...v0.14.0
[0.13.3]: https://github.com/brettericmartin/tee-club-grid/compare/v0.13.2...v0.13.3
[0.13.2]: https://github.com/brettericmartin/tee-club-grid/compare/v0.13.1...v0.13.2
[0.13.1]: https://github.com/brettericmartin/tee-club-grid/compare/v0.13.0...v0.13.1
[0.13.0]: https://github.com/brettericmartin/tee-club-grid/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/brettericmartin/tee-club-grid/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/brettericmartin/tee-club-grid/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/brettericmartin/tee-club-grid/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/brettericmartin/tee-club-grid/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/brettericmartin/tee-club-grid/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/brettericmartin/tee-club-grid/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/brettericmartin/tee-club-grid/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/brettericmartin/tee-club-grid/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/brettericmartin/tee-club-grid/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/brettericmartin/tee-club-grid/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/brettericmartin/tee-club-grid/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/brettericmartin/tee-club-grid/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/brettericmartin/tee-club-grid/releases/tag/v0.0.1