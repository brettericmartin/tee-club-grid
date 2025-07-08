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
        .from('bag_likes')
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
        // Unlike
        await supabase
          .from('bag_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('bag_id', bagId);
        
        setLikedBags(prev => {
          const newSet = new Set(prev);
          newSet.delete(bagId);
          return newSet;
        });
        
        // Update likes count
        await supabase
          .from('user_bags')
          .update({ likes_count: supabase.raw('likes_count - 1') })
          .eq('id', bagId);
      } else {
        // Like
        await supabase
          .from('bag_likes')
          .insert({
            user_id: user.id,
            bag_id: bagId
          });
        
        setLikedBags(prev => new Set([...prev, bagId]));
        
        // Update likes count
        await supabase
          .from('user_bags')
          .update({ likes_count: supabase.raw('likes_count + 1') })
          .eq('id', bagId);
      }
      
      return true;
    } catch (error) {
      console.error('Error toggling like:', error);
      return false;
    }
  };

  return { likedBags, toggleLike, loading };
}