# Supabase Integration Guide

## ✅ What's Been Done

1. **Authentication Setup**
   - Created `AuthContext` with sign in/up functionality
   - Added auth modals (SignInModal, SignUpModal)
   - Updated Navigation with auth state

2. **TypeScript Types**
   - Generated types matching your existing Supabase schema
   - Includes all tables: profiles, equipment, user_bags, etc.

3. **Service Functions Created**
   - `services/bags.ts` - Bag CRUD operations
   - `services/equipment.ts` - Equipment browsing, reviews, photos
   - `services/users.ts` - Profile management, follows

4. **Example Component**
   - Created `MyBagSupabase.tsx` showing how to use Supabase

## 📋 Quick Start Steps

### 1. Test Authentication
```bash
npm run dev
```
- Click the user icon in nav
- Try signing up with email/password
- Check Supabase dashboard for new user

### 2. Replace Components Gradually

Start with these pages (easiest to hardest):

#### A. Equipment Page
Replace in `src/pages/Equipment.tsx`:
```tsx
import { getEquipment } from '@/services/equipment';

// In component:
const [equipment, setEquipment] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function load() {
    try {
      const data = await getEquipment({ 
        category: selectedCategory,
        sortBy: sortOption 
      });
      setEquipment(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }
  load();
}, [selectedCategory, sortOption]);
```

#### B. Bags Browser
Similar pattern for `BagsBrowser.tsx` using `getBags()` service

#### C. My Bag
Replace with `MyBagSupabase.tsx` or update existing

### 3. Handle Loading States
Add loading skeletons:
```tsx
if (loading) {
  return <Skeleton className="h-64 w-full" />;
}
```

### 4. Add Error Handling
Wrap service calls in try/catch:
```tsx
try {
  const data = await serviceFunction();
  // handle success
} catch (error) {
  toast.error('Something went wrong');
  console.error(error);
}
```

## 🔄 Data Migration

To populate your Supabase with sample data:

```sql
-- Add sample equipment if needed
INSERT INTO equipment (brand, model, category, msrp, image_url) VALUES
('TaylorMade', 'Stealth 2 Driver', 'drivers', 599.99, '/placeholder.svg'),
('Titleist', 'T100 Irons', 'irons', 1399.99, '/placeholder.svg');

-- Check what you have
SELECT * FROM equipment LIMIT 10;
```

## 🚨 Common Issues & Fixes

### RLS (Row Level Security) Errors
If you get "permission denied" errors:
```sql
-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'equipment';

-- Temporarily disable RLS for testing (re-enable later!)
ALTER TABLE equipment DISABLE ROW LEVEL SECURITY;
```

### Missing User Profile
The auth flow creates a user but not a profile. Add trigger:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Image URLs
Update image paths from local to Supabase Storage:
1. Upload images to Storage buckets
2. Update URLs in database
3. Or use external image CDN

## 📱 Test Checklist

- [ ] Sign up new user
- [ ] Sign in existing user
- [ ] View equipment list
- [ ] View bag details
- [ ] Create/edit my bag (authenticated)
- [ ] Add equipment to bag
- [ ] Like/save items
- [ ] Follow users

## 🎯 Next Steps

1. Replace one component at a time
2. Test thoroughly before moving to next
3. Add proper loading/error states
4. Consider adding real-time subscriptions for live updates

## Need Help?

- Check Supabase logs: Dashboard > Logs > API
- Enable RLS logging for debugging
- Use Supabase SQL Editor to test queries directly