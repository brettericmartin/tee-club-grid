import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function EmergencyLogout() {
  const [isClearing, setIsClearing] = React.useState(false);

  const handleEmergencyLogout = async () => {
    setIsClearing(true);
    console.log('[EmergencyLogout] Force clearing all auth...');
    
    try {
      // Clear ALL auth-related items from localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          keysToRemove.push(key);
        }
      }
      
      // Remove everything - nuclear option
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Clear session storage
      sessionStorage.clear();
      
      // Clear all cookies
      document.cookie.split(";").forEach((c) => { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      
      // Try to sign out from Supabase
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (e) {
        // Ignore errors
      }
      
      // Force reload to root
      window.location.href = '/';
    } catch (error) {
      console.error('[EmergencyLogout] Error:', error);
      // Force reload anyway
      window.location.href = '/';
    }
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleEmergencyLogout}
      disabled={isClearing}
      className="bg-red-600 hover:bg-red-700"
    >
      <AlertTriangle className="w-4 h-4 mr-2" />
      {isClearing ? 'Clearing...' : 'Force Logout'}
    </Button>
  );
}