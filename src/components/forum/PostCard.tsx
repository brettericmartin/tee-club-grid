import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { Edit2, MoreVertical, Flag, Flame, CheckCircle, Trash2 } from 'lucide-react';
import { TeedBallIcon } from '@/components/shared/TeedBallLike';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import EditPostDialog from './EditPostDialog';
import { deleteForumPost } from '@/services/forum';
import { toast } from 'sonner';

interface PostCardProps {
  post: {
    id: string;
    content: string;
    is_edited: boolean;
    edited_at: string | null;
    created_at: string;
    parent_post_id?: string | null;
    user: {
      id: string;
      username: string;
      display_name?: string;
      avatar_url?: string;
      badges?: any[];
    };
    reactions?: {
      tee: number;
      helpful: number;
      fire: number;
      fixed?: number;
      user_reactions?: string[]; // Changed to array for multiple reactions
    };
    depth?: number;
  };
  threadLocked?: boolean;
  showActions?: boolean;
  categorySlug?: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function PostCard({ 
  post, 
  threadLocked = false, 
  showActions = true,
  categorySlug,
  onEdit,
  onDelete 
}: PostCardProps) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState({
    tee: post.reactions?.tee || 0,
    helpful: post.reactions?.helpful || 0,
    fire: post.reactions?.fire || 0,
    fixed: post.reactions?.fixed || 0,
    user_reactions: post.reactions?.user_reactions || []
  });
  const [isReacting, setIsReacting] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isOwner = user?.id === post.user?.id;
  const isSiteFeedback = categorySlug === 'site-feedback';

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await deleteForumPost(post.id);
      
      if (error) {
        toast.error('Failed to delete post');
        return;
      }

      toast.success('Post deleted successfully');
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReaction = async (type: 'tee' | 'helpful' | 'fire' | 'fixed') => {
    if (!user || isReacting) return;

    setIsReacting(true);
    try {
      const hasReaction = reactions.user_reactions.includes(type);
      
      if (hasReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('forum_reactions')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .eq('reaction_type', type);

        if (error) {
          console.error('Error removing reaction:', error);
          toast.error('Failed to remove reaction');
          return;
        }

        setReactions((prev) => ({
          ...prev,
          [type]: prev[type] - 1,
          user_reactions: prev.user_reactions.filter(r => r !== type)
        }));
      } else {
        // Add reaction (allow multiple)
        const { error } = await supabase
          .from('forum_reactions')
          .insert({
            post_id: post.id,
            user_id: user.id,
            reaction_type: type
          });

        if (error) {
          console.error('Error adding reaction:', error);
          toast.error('Failed to add reaction');
          return;
        }

        setReactions((prev) => ({
          ...prev,
          [type]: prev[type] + 1,
          user_reactions: [...prev.user_reactions, type]
        }));
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
      toast.error('Failed to update reaction');
    } finally {
      setIsReacting(false);
    }
  };

  // Parse content for rich text (basic implementation)
  const renderContent = (content: string) => {
    if (!content) return <p className="text-gray-400">No content</p>;
    
    // This is a basic implementation. You might want to use a proper markdown parser
    return content.split('\n').map((line, index) => (
      <p key={index} className="mb-2 last:mb-0">
        {line || '\u00A0'}
      </p>
    ));
  };

  return (
    <>
      <Card className="bg-[#1a1a1a] border-white/10 p-6">
      <div className="flex gap-4">
        {/* User Avatar and Info */}
        <div className="flex flex-col items-center">
          <Avatar className="h-12 w-12 mb-2">
            <AvatarImage src={post.user?.avatar_url} alt={post.user?.username} />
            <AvatarFallback className="bg-gradient-to-br from-green-400 to-blue-500 text-white">
              {post.user?.username?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm font-medium text-center">{post.user?.display_name || post.user?.username || 'Unknown'}</p>
          {/* User badges would go here */}
          <div className="flex flex-col gap-1 mt-2">
            {post.user.badges?.map((badge: any) => (
              <Badge key={badge.id} variant="secondary" className="text-xs">
                {badge.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Post Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
              {post.is_edited && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Edit2 className="h-3 w-3" />
                    edited
                  </span>
                </>
              )}
            </div>

            {user && showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-white/10">
                  {isOwner && !threadLocked && (
                    <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Post
                    </DropdownMenuItem>
                  )}
                  {isOwner && !threadLocked && (
                    <DropdownMenuItem 
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="text-red-400 focus:text-red-400"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Post
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem>
                    <Flag className="h-4 w-4 mr-2" />
                    Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="text-gray-100 mb-4">
            {renderContent(post.content)}
          </div>

          {/* Reactions - Unified Layout */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Tee button */}
            <Button
              variant={reactions.user_reactions.includes('tee') ? 'default' : 'ghost'}
              className={cn(
                "h-10 px-3 flex items-center gap-2 transition-all",
                reactions.user_reactions.includes('tee') 
                  ? "bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/30 border-[#10B981]/30" 
                  : "hover:text-[#10B981] hover:bg-[#10B981]/10"
              )}
              onClick={() => handleReaction('tee')}
              disabled={!user || isReacting}
            >
              <TeedBallIcon 
                className="h-5 w-5" 
                filled={reactions.user_reactions.includes('tee')}
              />
              <span className="text-sm font-medium">
                Tee {reactions.tee > 0 && `(${reactions.tee})`}
              </span>
            </Button>

            {/* Helpful button */}
            <Button
              variant={reactions.user_reactions.includes('helpful') ? 'secondary' : 'ghost'}
              className={cn(
                "h-10 px-3 flex items-center gap-2",
                reactions.user_reactions.includes('helpful') && "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
              )}
              onClick={() => handleReaction('helpful')}
              disabled={!user || isReacting}
            >
              <span>💡</span>
              <span className="text-sm">
                Helpful {reactions.helpful > 0 && `(${reactions.helpful})`}
              </span>
            </Button>

            {/* Hot Take button */}
            <Button
              variant={reactions.user_reactions.includes('fire') ? 'secondary' : 'ghost'}
              className={cn(
                "h-10 px-3 flex items-center gap-2",
                reactions.user_reactions.includes('fire') && "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
              )}
              onClick={() => handleReaction('fire')}
              disabled={!user || isReacting}
            >
              <Flame className="h-4 w-4" />
              <span className="text-sm">
                Hot Take {reactions.fire > 0 && `(${reactions.fire})`}
              </span>
            </Button>

            {/* Fixed button for site feedback */}
            {isSiteFeedback && (
              <Button
                variant={reactions.user_reactions.includes('fixed') ? 'secondary' : 'ghost'}
                className={cn(
                  "h-10 px-3 flex items-center gap-2",
                  reactions.user_reactions.includes('fixed') && "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                )}
                onClick={() => handleReaction('fixed')}
                disabled={!user || isReacting}
              >
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">
                  Fixed {reactions.fixed > 0 && `(${reactions.fixed})`}
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>

    {/* Edit Post Dialog */}
    {showEditDialog && (
      <EditPostDialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        post={post}
        onSuccess={() => {
          setShowEditDialog(false);
          if (onEdit) {
            onEdit();
          }
        }}
      />
    )}
    </>
  );
}