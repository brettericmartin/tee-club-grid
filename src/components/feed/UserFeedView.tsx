import { useState, useEffect } from 'react';
import { Grid, List, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useFeed } from '@/contexts/FeedContext';
import { updateFeedPost, deleteFeedPost } from '@/services/feedService';
import { TeedBallLike } from '@/components/shared/TeedBallLike';
import { EditPostDialog } from '@/components/feed/EditPostDialog';
import { EditableFeedItemCard } from '@/components/feed/EditableFeedItemCard';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import type { FeedItemData } from '@/utils/feedTransformer';

interface UserFeedViewProps {
  userId: string;
  isOwnProfile?: boolean;
}

export function UserFeedView({ userId, isOwnProfile = false }: UserFeedViewProps) {
  const { user } = useAuth();
  const { userPosts, loading, loadUserFeed, updatePost, deletePost } = useFeed();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'equipment_photo' | 'bag_update' | 'new_equipment'>('all');
  const [editingPost, setEditingPost] = useState<FeedItemData | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  console.log('[UserFeedView] Rendered with userId:', userId, 'isOwnProfile:', isOwnProfile);
  
  // Get user's posts from the context
  const posts = userPosts.get(userId) || [];
  console.log('[UserFeedView] Posts from context for user', userId, ':', posts.length);
  
  // Filter posts by type
  const filteredPosts = filterType === 'all' 
    ? posts 
    : posts.filter(post => post.postType === filterType);

  useEffect(() => {
    console.log('[UserFeedView] useEffect triggered, userId:', userId);
    if (userId) {
      console.log('[UserFeedView] Calling loadUserFeed for:', userId);
      loadUserFeed(userId);
    }
  }, [userId, loadUserFeed]);

  const handleEditPost = (postId: string) => {
    const post = posts.find(p => p.postId === postId);
    if (post) {
      setEditingPost(post);
      setShowEditDialog(true);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) {
      toast.error('Must be logged in to delete posts');
      return;
    }

    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteFeedPost(postId, user.id);
      deletePost(postId); // Update context state
      toast.success('Post deleted successfully');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  const handleSavePost = async (postId: string, updates: { caption?: string; media_urls?: string[] }) => {
    try {
      // Pass the updates directly - updateFeedPost handles the caption properly
      await updateFeedPost(postId, updates);
      
      // Update context state with the new caption
      const contextUpdates: any = {};
      if (updates.caption !== undefined) {
        contextUpdates.content = { caption: updates.caption };
      }
      if (updates.media_urls) {
        contextUpdates.media_urls = updates.media_urls;
      }
      updatePost(postId, contextUpdates);
    } catch (error) {
      console.error('Error saving post:', error);
      throw error;
    }
  };

  const getPostTypeLabel = (type: string) => {
    switch (type) {
      case 'equipment_photo': return 'Photo';
      case 'bag_update': return 'Bag Update';
      case 'new_equipment': return 'New Equipment';
      default: return type;
    }
  };

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case 'equipment_photo': return 'bg-blue-500/20 text-blue-300';
      case 'bag_update': return 'bg-green-500/20 text-green-300';
      case 'new_equipment': return 'bg-purple-500/20 text-purple-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };


  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-white/10 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-square bg-white/10 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">
          {isOwnProfile ? 'My Posts' : 'Posts'}
        </h2>
        
        <div className="flex items-center gap-3">
          {/* Filter by Post Type */}
          <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
            <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Posts</SelectItem>
              <SelectItem value="equipment_photo">Photos</SelectItem>
              <SelectItem value="bag_update">Bag Updates</SelectItem>
              <SelectItem value="new_equipment">New Equipment</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode Toggle */}
          <div className="flex gap-1 bg-white/10 rounded-lg p-1">
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              onClick={() => setViewMode('grid')}
              className="px-2 text-white"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              onClick={() => setViewMode('list')}
              className="px-2 text-white"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Posts Grid/List */}
      {filteredPosts.length === 0 ? (
        <Card className="glass-card p-8 text-center">
          <div className="space-y-4">
            <Plus className="w-12 h-12 text-white/50 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {isOwnProfile ? 'No posts yet' : 'No posts found'}
              </h3>
              <p className="text-white/70">
                {isOwnProfile 
                  ? 'Start sharing your golf journey by uploading equipment photos or updating your bag!'
                  : 'This user hasn\'t shared any posts yet.'
                }
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-4'
        }>
          {filteredPosts.map((post) => (
            <EditableFeedItemCard 
              key={post.postId} 
              post={post} 
              currentUserId={user?.id}
              onEdit={handleEditPost}
              onDelete={handleDeletePost}
            />
          ))}
        </div>
      )}

      {/* Load More Button */}
      {posts.length >= 50 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => {
              // TODO: Implement pagination
            }}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Load More Posts
          </Button>
        </div>
      )}

      {/* Edit Post Dialog */}
      <EditPostDialog
        isOpen={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setEditingPost(null);
        }}
        post={editingPost ? {
          id: editingPost.postId,
          type: editingPost.postType,
          content: { caption: editingPost.caption },
          media_urls: editingPost.mediaUrls,
          equipment: editingPost.equipmentData ? {
            brand: editingPost.equipmentData.brand,
            model: editingPost.equipmentData.model
          } : undefined,
          bag: editingPost.bagData ? {
            name: editingPost.bagData.name
          } : undefined
        } as any : null}
        onSave={handleSavePost}
      />
    </div>
  );
}