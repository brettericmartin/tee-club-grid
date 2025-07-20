import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { getFeedPosts, getUserFeedPosts, type FeedPost } from '@/services/feedService';
import { transformFeedPost, type FeedItemData } from '@/utils/feedTransformer';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface FeedContextType {
  // Main feed data
  allPosts: FeedItemData[];
  userPosts: Map<string, FeedItemData[]>; // Cached user posts by userId
  loading: boolean;
  error: string | null;
  
  // Actions
  loadMainFeed: (filter?: 'all' | 'following') => Promise<void>;
  loadUserFeed: (userId: string, forceRefresh?: boolean) => Promise<void>;
  updatePost: (postId: string, updates: Partial<FeedPost>) => void;
  deletePost: (postId: string) => void;
  addPost: (post: FeedPost) => void;
  
  // Utilities
  refreshFeeds: () => Promise<void>;
  clearCache: () => void;
}

const FeedContext = createContext<FeedContextType | undefined>(undefined);

export const useFeed = () => {
  const context = useContext(FeedContext);
  if (!context) {
    throw new Error('useFeed must be used within a FeedProvider');
  }
  return context;
};

interface FeedProviderProps {
  children: ReactNode;
}

export const FeedProvider: React.FC<FeedProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [allPosts, setAllPosts] = useState<FeedItemData[]>([]);
  const [userPosts, setUserPosts] = useState<Map<string, FeedItemData[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<'all' | 'following'>('all');
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());

  // Load followed users if authenticated
  useEffect(() => {
    if (user) {
      loadFollowedUsers();
    }
  }, [user]);

  const loadFollowedUsers = async () => {
    if (!user) return;
    
    try {
      const { data: follows } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id);
      
      if (follows) {
        setFollowedUsers(new Set(follows.map(f => f.following_id)));
      }
    } catch (error) {
      console.error('Error loading followed users:', error);
    }
  };

  // Load main feed
  const loadMainFeed = useCallback(async (filter: 'all' | 'following' = 'all') => {
    try {
      setLoading(true);
      setError(null);
      setCurrentFilter(filter);
      
      const feedPosts = await getFeedPosts(user?.id, filter);
      
      // Transform posts to UI format
      const transformedPosts = feedPosts.map(post => {
        const isFollowed = followedUsers.has(post.user_id);
        return transformFeedPost({ ...post, isFollowed });
      });
      
      setAllPosts(transformedPosts);
    } catch (error) {
      console.error('Error loading main feed:', error);
      setError('Failed to load feed posts');
    } finally {
      setLoading(false);
    }
  }, [user, followedUsers]);

  // Load user-specific feed
  const loadUserFeed = useCallback(async (userId: string, forceRefresh = false) => {
    try {
      console.log(`[FeedContext.loadUserFeed] Loading feed for user ${userId}`);
      setLoading(true);
      setError(null);
      
      const { posts: feedPosts } = await getUserFeedPosts(userId, 100, 0, user?.id);
      console.log(`[FeedContext.loadUserFeed] Received ${feedPosts.length} posts for user ${userId}`);
      
      // Transform posts to UI format
      const transformedPosts = feedPosts.map(post => {
        const isFollowed = followedUsers.has(post.user_id);
        return transformFeedPost({ ...post, isFollowed });
      });
      
      console.log(`[FeedContext.loadUserFeed] Transformed ${transformedPosts.length} posts, updating state`);
      
      // Update the user posts state
      setUserPosts(prev => {
        const newMap = new Map(prev);
        newMap.set(userId, transformedPosts);
        console.log(`[FeedContext.loadUserFeed] State updated. Map now has entries for users:`, Array.from(newMap.keys()));
        return newMap;
      });
    } catch (error) {
      console.error('[FeedContext.loadUserFeed] Error:', error);
      setError('Failed to load user posts');
    } finally {
      setLoading(false);
    }
  }, [followedUsers, user]);

  // Update a post in both feeds
  const updatePost = useCallback((postId: string, updates: Partial<FeedPost>) => {
    // Update in all posts
    setAllPosts(prev => prev.map(post => {
      if (post.postId === postId) {
        // Apply updates to the transformed post
        const updatedPost = { ...post };
        if (updates.content?.caption) {
          updatedPost.caption = updates.content.caption;
        }
        if (updates.media_urls) {
          updatedPost.mediaUrls = updates.media_urls;
        }
        return updatedPost;
      }
      return post;
    }));

    // Update in user posts cache
    setUserPosts(prev => {
      const newMap = new Map(prev);
      for (const [userId, posts] of newMap) {
        const updatedPosts = posts.map(post => {
          if (post.postId === postId) {
            const updatedPost = { ...post };
            if (updates.content?.caption) {
              updatedPost.caption = updates.content.caption;
            }
            if (updates.media_urls) {
              updatedPost.mediaUrls = updates.media_urls;
            }
            return updatedPost;
          }
          return post;
        });
        newMap.set(userId, updatedPosts);
      }
      return newMap;
    });
  }, []);

  // Delete a post from both feeds
  const deletePost = useCallback((postId: string) => {
    // Remove from all posts
    setAllPosts(prev => prev.filter(post => post.postId !== postId));

    // Remove from user posts cache
    setUserPosts(prev => {
      const newMap = new Map(prev);
      for (const [userId, posts] of newMap) {
        newMap.set(userId, posts.filter(post => post.postId !== postId));
      }
      return newMap;
    });
  }, []);

  // Add a new post
  const addPost = useCallback((post: FeedPost) => {
    console.log('Adding post to feeds:', post.id, 'by user:', post.user_id);
    const isFollowed = followedUsers.has(post.user_id);
    const transformedPost = transformFeedPost({ ...post, isFollowed });
    
    // Add to all posts (at the beginning for newest first)
    setAllPosts(prev => [transformedPost, ...prev]);

    // Always add to user's cache, create entry if it doesn't exist
    setUserPosts(prev => {
      const newMap = new Map(prev);
      const userPostsList = newMap.get(post.user_id) || [];
      newMap.set(post.user_id, [transformedPost, ...userPostsList]);
      console.log(`Added post to user ${post.user_id} cache, now has ${userPostsList.length + 1} posts`);
      return newMap;
    });
  }, [followedUsers]);

  // Refresh all feeds
  const refreshFeeds = useCallback(async () => {
    console.log('Refreshing all feeds...');
    await loadMainFeed(currentFilter);
    
    // Always refresh current user's feed if logged in
    if (user?.id) {
      console.log('Refreshing current user feed:', user.id);
      await loadUserFeed(user.id, true);
    }
    
    // Refresh other cached user feeds
    const userIds = Array.from(userPosts.keys());
    await Promise.all(userIds.map(userId => loadUserFeed(userId, true)));
    console.log('Feed refresh complete');
  }, [currentFilter, loadMainFeed, loadUserFeed, userPosts, user]);

  // Clear cache
  const clearCache = useCallback(() => {
    setAllPosts([]);
    setUserPosts(new Map());
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('feed-posts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'feed_posts'
        },
        async (payload) => {
          console.log('New post inserted:', payload.new);
          
          // Fetch the complete post with relations
          const { data: newPost } = await supabase
            .from('feed_posts')
            .select(`
              *,
              profile:profiles!feed_posts_user_id_fkey(
                username,
                avatar_url,
                handicap
              ),
              equipment:equipment(
                id,
                brand,
                model,
                category,
                image_url
              ),
              bag:user_bags(
                id,
                name,
                description,
                background
              )
            `)
            .eq('id', payload.new.id)
            .single();
          
          if (newPost) {
            console.log('Real-time: Fetched complete post data:', newPost.id);
            addPost(newPost);
            toast.success('New post added to feed');
          } else {
            console.error('Real-time: Failed to fetch complete post data for:', payload.new.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'feed_posts'
        },
        (payload) => {
          console.log('Post updated:', payload.new);
          updatePost(payload.new.id, payload.new as FeedPost);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'feed_posts'
        },
        (payload) => {
          console.log('Post deleted:', payload.old);
          deletePost(payload.old.id);
          toast.success('Post removed from feed');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [addPost, updatePost, deletePost]);

  const contextValue: FeedContextType = {
    allPosts,
    userPosts,
    loading,
    error,
    loadMainFeed,
    loadUserFeed,
    updatePost,
    deletePost,
    addPost,
    refreshFeeds,
    clearCache
  };

  return (
    <FeedContext.Provider value={contextValue}>
      {children}
    </FeedContext.Provider>
  );
};