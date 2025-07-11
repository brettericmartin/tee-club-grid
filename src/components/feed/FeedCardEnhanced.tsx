import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toggleFeedLike } from '@/services/feedServiceEnhanced';
import { toast } from 'sonner';
import { BagCreatedCard } from './BagCreatedCard';
import { BagUpdateCard } from './BagUpdateCard';
import { FeedCard as EquipmentPhotoCard } from './FeedCard';

interface FeedCardEnhancedProps {
  post: any;
  onUpdate: () => void;
}

export function FeedCardEnhanced({ post, onUpdate }: FeedCardEnhancedProps) {
  const { user } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  
  // Check if post is liked by current user
  const isLiked = user ? post.feed_likes?.some((like: any) => like.user_id === user.id) : false;

  const handleLike = async () => {
    if (!user) {
      toast.error('Please sign in to like posts');
      return;
    }

    if (isLiking) return;

    try {
      setIsLiking(true);
      await toggleFeedLike(post.id, user.id);
      onUpdate(); // Refresh feed
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    } finally {
      setIsLiking(false);
    }
  };


  // Render different card types based on post type
  switch (post.type) {
    case 'equipment_photo':
    case 'new_equipment':  // Handle both equipment types
      return (
        <EquipmentPhotoCard 
          post={post} 
          onUpdate={onUpdate}
        />
      );
    
    case 'bag_created':
      return (
        <BagCreatedCard
          post={post}
          onLike={handleLike}
          isLiked={isLiked}
        />
      );
    
    case 'bag_updated':
    case 'bag_update':  // Handle both bag update types
      // Use appropriate component based on content
      if (post.content?.is_creation) {
        return (
          <BagCreatedCard
            post={post}
            onLike={handleLike}
            isLiked={isLiked}
          />
        );
      }
      return (
        <BagUpdateCard
          post={post}
          onLike={handleLike}
          isLiked={isLiked}
        />
      );
    
    default:
      console.warn('Unknown post type:', post.type);
      return null;
  }
}