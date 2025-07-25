import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function DebugAvatar() {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    if (!user) return;

    const checkAvatar = async () => {
      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();

      // Test avatar URL if exists
      let urlAccessible = false;
      if (profile?.avatar_url) {
        try {
          const response = await fetch(profile.avatar_url);
          urlAccessible = response.ok;
        } catch (e) {
          urlAccessible = false;
        }
      }

      setDebugInfo({
        userId: user.id,
        profileAvatarUrl: profile?.avatar_url,
        metadataAvatarUrl: user.user_metadata?.avatar_url,
        urlAccessible,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL
      });
    };

    checkAvatar();
  }, [user]);

  if (!user || import.meta.env.PROD) return null;

  return (
    <div className="fixed bottom-4 left-4 bg-black/80 text-white p-4 rounded text-xs max-w-md">
      <h3 className="font-bold mb-2">Avatar Debug Info:</h3>
      <pre className="text-xs">{JSON.stringify(debugInfo, null, 2)}</pre>
      {debugInfo.profileAvatarUrl && (
        <img 
          src={debugInfo.profileAvatarUrl} 
          alt="Test" 
          className="w-10 h-10 mt-2"
          onError={(e) => console.error('Avatar img error:', e)}
        />
      )}
    </div>
  );
}