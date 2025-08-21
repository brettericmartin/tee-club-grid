import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function useLikedBags() {
  const { user } = useAuth();
  const [likedBags, setLikedBags] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadLikedBags();
    } else {
      setLikedBags(new Set());
      setLoading(false);
    }
  }, [user]);

  const loadLikedBags = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('bag_tees')
        .select('bag_id')
        .eq('user_id', user.id);
      
      if (data) {
        setLikedBags(new Set(data.map(item => item.bag_id)));
      }
    } catch (error) {
      console.error('Error loading liked bags:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (bagId: string) => {
    if (!user) return false;

    const isLiked = likedBags.has(bagId);
    
    try {
      if (isLiked) {
        // Unlike (untee)
        await supabase
          .from('bag_tees')
          .delete()
          .eq('user_id', user.id)
          .eq('bag_id', bagId);
        
        setLikedBags(prev => {
          const newSet = new Set(prev);
          newSet.delete(bagId);
          return newSet;
        });
      } else {
        // Like (tee)
        await supabase
          .from('bag_tees')
          .insert({
            user_id: user.id,
            bag_id: bagId
          });
        
        setLikedBags(prev => new Set([...prev, bagId]));
      }
      
      return true;
    } catch (error) {
      console.error('Error toggling like:', error);
      return false;
    }
  };

  return { likedBags, toggleLike, loading };
}