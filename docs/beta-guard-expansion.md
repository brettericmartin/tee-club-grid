# Beta Guard Expansion - Implementation Guide

## Summary
Expanded beta access control from single route (`/my-bag`) to action-level gating across the app. Non-approved users can browse but cannot create content.

## New Utilities Created

### `/src/lib/betaAccess.ts`
Centralized beta access utilities that complement the existing `BetaGuard` component:

- **`useBetaAccess()`** - Hook to check beta access status
- **`useBetaGuard()`** - Hook providing `requireBetaAccess()` function for action guards
- **`BetaGated`** - Component for conditional rendering based on access
- **`withBetaGuard()`** - HOC for wrapping components

## Integration Examples

### 1. Feed Page (Already Partially Implemented)
The Feed page already checks beta access. We can refactor it to use the new hook:

```tsx
// Before (in Feed.tsx)
const [betaAccess, setBetaAccess] = useState<boolean | null>(null);
// ... manual checking logic

// After
import { useBetaAccess } from '@/lib/betaAccess';

const { hasBetaAccess, loading } = useBetaAccess();
```

### 2. Equipment Page - Submit Equipment
```tsx
import { useBetaGuard } from '@/lib/betaAccess';

function Equipment() {
  const { requireBetaAccess } = useBetaGuard();
  
  const handleSubmitClick = () => {
    if (!requireBetaAccess('submit equipment')) {
      return;
    }
    setShowSubmitModal(true);
  };
  
  // Button shows for all, but clicks are guarded
  <Button onClick={handleSubmitClick}>
    Submit Equipment
  </Button>
}
```

### 3. Forum - Create Thread
```tsx
import { BetaGated } from '@/lib/betaAccess';

function ForumLayout() {
  return (
    <>
      {/* Create button only shows for beta users */}
      <BetaGated
        fallback={
          <Button onClick={() => navigate('/waitlist')}>
            Join Beta to Post
          </Button>
        }
      >
        <Button onClick={() => setShowCreateThread(true)}>
          Create Thread
        </Button>
      </BetaGated>
    </>
  );
}
```

### 4. Comments
```tsx
import { useBetaGuard } from '@/lib/betaAccess';

function CommentInput() {
  const { requireBetaAccess } = useBetaGuard();
  
  const handleSubmit = () => {
    if (!requireBetaAccess('post comments')) {
      return;
    }
    // Submit comment logic
  };
}
```

## Migration Strategy

### Phase 1: Non-Breaking Integration
1. Add `useBetaAccess` hook to components that already check manually
2. Keep existing behavior, just centralize the logic

### Phase 2: Add Guards to Write Actions
Priority order:
1. ✅ Feed posting (already done)
2. Equipment submission
3. Forum thread creation  
4. Comment creation
5. Bag publishing

### Phase 3: Clean Up
1. Remove duplicate beta checking logic
2. Standardize error messages
3. Add consistent analytics tracking

## Key Design Decisions

### Why Not Replace BetaGuard Component?
- `BetaGuard` works well for route-level protection
- This adds complementary action-level protection
- Maintains backward compatibility
- Different UX patterns (redirect vs toast)

### Why Cache Feature Flags?
- Reduces database queries
- Consistent with existing `BetaGuard` implementation
- 5-minute cache is reasonable for feature flags
- Can be cleared manually if needed

### Why Allow Browse but Block Write?
- Increases engagement and FOMO
- Users can see what they're missing
- Reduces friction for conversion
- Better UX than blocking everything

## Testing Checklist

### Unit Tests
- [ ] `useBetaAccess` returns correct access status
- [ ] Cache invalidation works correctly
- [ ] Admin bypass works
- [ ] Public beta flag works

### E2E Tests  
- [ ] Non-beta user sees "Join Beta" instead of create buttons
- [ ] Beta user can create content
- [ ] Admin can always create content
- [ ] Proper analytics events fire

### Manual Testing
1. As anonymous user:
   - Can browse all content
   - Cannot create posts/equipment/threads
   - Sees "Sign in" prompts

2. As non-beta authenticated user:
   - Can browse all content
   - Cannot create content
   - Sees "Join waitlist" prompts
   - Gets redirected to waitlist on write attempts

3. As beta user:
   - Full access to all features
   - No waitlist prompts

4. As admin:
   - Full access regardless of beta status
   - No restrictions

## Implementation Status

### ✅ Completed
- Created `/src/lib/betaAccess.ts` utilities
- Documented integration patterns

### 🔄 In Progress
- Feed page already has beta checking (can be refactored)

### 📋 To Do
- [ ] Integrate with Equipment page
- [ ] Integrate with Forum pages
- [ ] Integrate with Comment components
- [ ] Add unit tests
- [ ] Add E2E test

## Files Changed

### New Files
- `/src/lib/betaAccess.ts` - Beta access utilities

### Files to Update (Examples)
- `/src/pages/Equipment.tsx` - Add submit guard
- `/src/components/forum/ForumLayout.tsx` - Add create thread guard
- `/src/components/comments/CommentInput.tsx` - Add comment guard
- `/src/pages/Feed.tsx` - Refactor to use hook (optional)

## Notes

- The existing `BetaGuard` component in `/src/components/auth/BetaGuard.tsx` remains unchanged
- This is additive, not a replacement
- All changes are backward compatible
- No database migrations needed
- Uses existing `feature_flags` and `profiles` tables

## Example PR Description

```
feat: Expand beta access control to action-level gating

- Add centralized beta access utilities in /src/lib/betaAccess.ts
- Implement useBetaAccess() hook for checking access status  
- Add useBetaGuard() hook for action-level protection
- Create BetaGated component for conditional rendering
- Maintain backward compatibility with existing BetaGuard

Non-beta users can now browse all content but cannot:
- Create posts in feed
- Submit equipment
- Create forum threads
- Post comments
- Publish bags

All write actions show appropriate messaging and redirect to waitlist.
```