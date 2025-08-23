import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { getFeedPosts, getUserFeedPosts, type FeedPost } from '@/services/feedService';
import { transformFeedPost, type FeedItemData } from '@/utils/feedTransformer';
import { useAuth } from '@/contexts/AuthContext';
import { executeWithRetry } from '@/lib/authHelpers';
import { toast } from 'sonner';
import { type FeedSortOption, sortFeedPosts } from '@/utils/feedSorting';

interface FeedContextType {
  // Main feed data
  allPosts: FeedItemData[];
  userPosts: Map<string, FeedItemData[]>; // Cached user posts by userId
  loading: boolean;
  error: string | null;
  
  // Sorting
  sortBy: FeedSortOption;
  setSortBy: (sort: FeedSortOption) => void;
  
  // Actions
  loadMainFeed: (filter?: 'all' | 'following' | 'in-my-bags', sort?: FeedSortOption) => Promise<void>;
  loadUserFeed: (userId: string, forceRefresh?: boolean) => Promise<void>;
  updatePost: (postId: string, updates: Partial<FeedPost>) => void;
  deletePost: (postId: string) => void;
  addPost: (post: FeedPost) => void;
  updatePostLike: (postId: string, isLiked: boolean, newCount: number) => void;
  updateUserFollow: (userId: string, isFollowing: boolean) => void;
  
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
  const [loading, setLoading] = useState(false); // Don't start loading
  const [error, setError] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<'all' | 'following' | 'in-my-bags'>('all');
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<FeedSortOption>('new');


  // Load followed users if authenticated (non-blocking)
  useEffect(() => {
    if (user) {
      loadFollowedUsers();
    } else {
      // Clear followed users when user logs out
      setFollowedUsers(new Set());
    }
  }, [user]);

  const loadFollowedUsers = async () => {
    if (!user) return;
    
    try {
      const result = await executeWithRetry(
        () => supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', user.id),
        { maxRetries: 1 }
      );
      
      if (result.data) {
        setFollowedUsers(new Set(result.data.map(f => f.following_id)));
      }
    } catch (error) {
      console.error('Error loading followed users:', error);
      // Don't block feed loading on follow errors
    }
  };

  // Load main feed
  const loadMainFeed = useCallback(async (
    filter: 'all' | 'following' | 'in-my-bags' = 'all',
    sort?: FeedSortOption
  ) => {
    console.log('[FeedContext.loadMainFeed] Called with filter:', filter, 'sort:', sort || sortBy, 'user:', user?.id);
    console.log('[FeedContext.loadMainFeed] Current auth state:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email
    });
    
    try {
      setLoading(true);
      setError(null);
      setCurrentFilter(filter);
      
      // Update sort if provided
      const currentSort = sort || sortBy;
      if (sort && sort !== sortBy) {
        setSortBy(sort);
      }
      
      // Don't block on loading followed users - use what we have
      // If filter is 'following' and no user, just show all posts
      const effectiveFilter = (filter === 'following' || filter === 'in-my-bags') && !user ? 'all' : filter;
      
      console.log('[FeedContext.loadMainFeed] Calling getFeedPosts with:', user?.id, effectiveFilter);
      const feedPosts = await getFeedPosts(user?.id, effectiveFilter);
      
      console.log('[FeedContext] Raw feed posts received:', feedPosts.length, 'posts');
      if (feedPosts.length === 0) {
        console.warn('[FeedContext] No posts returned - check browser console for errors');
      }
      console.log('[FeedContext] Sample post:', feedPosts[0]);
      
      // Transform posts to UI format
      let transformedPosts = feedPosts.map(post => {
        const isFollowed = followedUsers.has(post.user_id);
        const transformed = transformFeedPost({ ...post, isFollowed });
        
        // Log the first post transformation for debugging
        if (feedPosts[0] === post) {
          console.log('[FeedContext] Post transformation:', {
            raw_likes_count: post.likes_count,
            raw_feed_likes: post.feed_likes,
            transformed_likes: transformed.likes,
            user_liked: post.user_liked,
            isLiked: transformed.isLiked
          });
        }
        
        return transformed;
      });
      
      // Apply sorting (use currentSort from above)
      transformedPosts = sortFeedPosts(transformedPosts, currentSort);
      
      setAllPosts(transformedPosts);
    } catch (error) {
      console.error('Error loading main feed:', error);
      setError('Failed to load feed posts');
    } finally {
      setLoading(false);
    }
  }, [user?.id, followedUsers, sortBy]); // Only depend on user.id, not the whole user object

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

  // Load feed immediately on mount - after all functions are defined
  useEffect(() => {
    console.log('[FeedContext] Loading initial feed on mount');
    // Use the loadMainFeed function which handles auth properly
    loadMainFeed('all');
  }, []); // Empty deps - only run once on mount
  
  // Reload feed when user authentication state changes
  useEffect(() => {
    if (user) {
      console.log('[FeedContext] User authenticated, reloading feed with user context');
      loadMainFeed(currentFilter);
    }
  }, [user?.id]); // Only trigger on user id change, not the whole object

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

  // Update a post's like status and count
  const updatePostLike = useCallback((postId: string, isLiked: boolean, newCount: number) => {
    console.log(`Updating post ${postId} like status:`, { isLiked, newCount });
    
    // Update in all posts
    setAllPosts(prev => prev.map(post => {
      if (post.postId === postId) {
        return {
          ...post,
          isLiked,
          likes: newCount
        };
      }
      return post;
    }));

    // Update in user posts cache
    setUserPosts(prev => {
      const newMap = new Map(prev);
      for (const [userId, posts] of newMap) {
        const updatedPosts = posts.map(post => {
          if (post.postId === postId) {
            return {
              ...post,
              isLiked,
              likes: newCount
            };
          }
          return post;
        });
        newMap.set(userId, updatedPosts);
      }
      return newMap;
    });
  }, []);

  // Update follow status for a user
  const updateUserFollow = useCallback((userId: string, isFollowing: boolean) => {
    console.log(`Updating follow status for user ${userId}:`, { isFollowing });
    
    // Update followed users set
    setFollowedUsers(prev => {
      const newSet = new Set(prev);
      if (isFollowing) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });

    // Update all posts from this user
    setAllPosts(prev => prev.map(post => {
      if (post.userId === userId) {
        return {
          ...post,
          isFromFollowed: isFollowing
        };
      }
      return post;
    }));

    // Update in user posts cache
    setUserPosts(prev => {
      const newMap = new Map(prev);
      for (const [cachedUserId, posts] of newMap) {
        const updatedPosts = posts.map(post => {
          if (post.userId === userId) {
            return {
              ...post,
              isFromFollowed: isFollowing
            };
          }
          return post;
        });
        newMap.set(cachedUserId, updatedPosts);
      }
      return newMap;
    });
  }, []);

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
    sortBy,
    setSortBy,
    loadMainFeed,
    loadUserFeed,
    updatePost,
    deletePost,
    addPost,
    updatePostLike,
    updateUserFollow,
    refreshFeeds,
    clearCache
  };

  return (
    <FeedContext.Provider value={contextValue}>
      {children}
    </FeedContext.Provider>
  );
};