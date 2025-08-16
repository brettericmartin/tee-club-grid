# Supabase Custom Domain Setup for Teed.club

## Environment Variables Updated
- `VITE_SUPABASE_URL` changed from `https://kgleorvvtrqlgolzdbbw.supabase.co` to `https://auth.teed.club`

## Code Changes Made
1. Created `/src/config/domain.ts` for centralized domain configuration
2. Updated `AuthContext.tsx` to use domain config for OAuth redirects
3. Updated share components to use production domain for sharing URLs

## Required Supabase Dashboard Configuration

### 1. Authentication Settings
Go to Supabase Dashboard → Authentication → URL Configuration

**Site URL:**
```
https://teed.club
```

**Redirect URLs (add all):**
```
https://teed.club/auth/callback
https://www.teed.club/auth/callback
http://localhost:3333/auth/callback
http://localhost:5173/auth/callback
https://auth.teed.club/auth/callback
```

### 2. Email Templates
Update all email templates to use `https://teed.club` instead of the Supabase domain.

### 3. OAuth Providers
For Google OAuth and any other providers:
- Update the authorized redirect URIs in Google Cloud Console
- Add: `https://auth.teed.club/auth/v1/callback`
- Add: `https://teed.club/auth/callback`

### 4. Custom Domain Configuration
In Supabase Dashboard → Settings → Custom Domains:
- Verify that `auth.teed.club` is properly configured
- Ensure SSL certificate is active

## Testing Checklist
- [ ] Test Google OAuth login on production
- [ ] Test email/password login
- [ ] Test password reset flow
- [ ] Test bag sharing URLs
- [ ] Test profile URLs
- [ ] Verify redirects work correctly

## Domain Configuration Object
The `DOMAIN_CONFIG` object in `/src/config/domain.ts` provides:
- `production`: Main production domain
- `auth`: Supabase auth domain
- `development`: Local development URL
- `getCurrentDomain()`: Returns appropriate domain based on environment
- `getAuthCallbackUrl()`: Returns correct auth callback URL
- `getBagShareUrl()`: Returns shareable bag URL
- `getProfileUrl()`: Returns user profile URL

## Notes
- The app automatically detects the current environment and uses appropriate URLs
- Share links always use the production domain for consistency
- Auth callbacks adapt based on the current domain being accessed