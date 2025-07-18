import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function AvatarDebugPanel() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [storageFiles, setStorageFiles] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const loadDebugInfo = async () => {
      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setProfile(profileData);

      // List storage files
      const { data: files } = await supabase.storage
        .from('user-content')
        .list(`avatars/${user.id}`);
      
      setStorageFiles(files || []);
    };

    loadDebugInfo();
  }, [user]);

  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs max-w-md z-50">
      <h3 className="font-bold mb-2 text-yellow-400">Avatar Debug Panel</h3>
      
      <div className="mb-3">
        <h4 className="font-semibold text-green-400">Profile Data:</h4>
        <div className="ml-2">
          <p>Display Name: {profile?.display_name || 'Not set'}</p>
          <p>Avatar URL: {profile?.avatar_url || 'Not set'}</p>
          {profile?.avatar_url && (
            <div className="mt-1">
              <p className="text-xs break-all">{profile.avatar_url}</p>
              <img 
                src={profile.avatar_url} 
                alt="Avatar" 
                className="w-16 h-16 mt-1 border border-white"
                onError={() => console.error('Debug panel: Avatar failed to load')}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mb-3">
        <h4 className="font-semibold text-green-400">Storage Files:</h4>
        <div className="ml-2">
          {storageFiles.length === 0 ? (
            <p>No files in avatars/{user.id}/</p>
          ) : (
            storageFiles.map((file, i) => (
              <p key={i} className="text-xs">{file.name}</p>
            ))
          )}
        </div>
      </div>

      <button
        onClick={() => window.location.reload()}
        className="bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded text-xs"
      >
        Refresh Page
      </button>
    </div>
  );
}