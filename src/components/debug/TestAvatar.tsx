import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function TestAvatar() {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  useEffect(() => {
    if (!user) return;

    const loadAvatar = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
      
      if (profile?.avatar_url) {
        setAvatarUrl(profile.avatar_url);
      }
    };

    loadAvatar();
  }, [user]);

  if (!avatarUrl) return null;

  return (
    <div className="fixed top-20 right-4 bg-white p-4 rounded-lg shadow-lg z-50">
      <h3 className="font-bold mb-2">Avatar Tests:</h3>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold">1. Direct img tag:</p>
          <img 
            src={avatarUrl} 
            alt="Test 1" 
            className="w-20 h-20 rounded border"
            onLoad={() => console.log('Test 1: Direct img loaded successfully')}
            onError={(e) => console.error('Test 1: Direct img failed', e)}
          />
        </div>

        <div>
          <p className="text-sm font-semibold">2. With crossOrigin:</p>
          <img 
            src={avatarUrl} 
            alt="Test 2" 
            className="w-20 h-20 rounded border"
            crossOrigin="anonymous"
            onLoad={() => console.log('Test 2: CrossOrigin img loaded successfully')}
            onError={(e) => console.error('Test 2: CrossOrigin img failed', e)}
          />
        </div>

        <div>
          <p className="text-sm font-semibold">3. With transform:</p>
          <img 
            src={`${avatarUrl}?width=200&height=200`} 
            alt="Test 3" 
            className="w-20 h-20 rounded border"
            onLoad={() => console.log('Test 3: Transform img loaded successfully')}
            onError={(e) => console.error('Test 3: Transform img failed', e)}
          />
        </div>

        <div>
          <p className="text-sm font-semibold">4. As background:</p>
          <div 
            className="w-20 h-20 rounded border bg-cover bg-center"
            style={{ backgroundImage: `url(${avatarUrl})` }}
          />
        </div>
      </div>

      <p className="text-xs mt-4 break-all">URL: {avatarUrl}</p>
    </div>
  );
}