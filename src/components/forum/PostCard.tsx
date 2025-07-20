import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { Edit2, MoreVertical, Flag, Flame } from 'lucide-react';
import { TeedBallIcon } from '@/components/shared/TeedBallLike';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PostCardProps {
  post: {
    id: string;
    content: string;
    is_edited: boolean;
    edited_at: string | null;
    created_at: string;
    user: {
      id: string;
      username: string;
      display_name?: string;
      avatar_url: string;
      badges?: any[];
    };
    reactions: {
      tee: number;
      helpful: number;
      fire: number;
      user_reactions?: string[]; // Changed to array for multiple reactions
    };
  };
  threadLocked?: boolean;
}

export default function PostCard({ post, threadLocked = false }: PostCardProps) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState({
    tee: post.reactions?.tee || 0,
    helpful: post.reactions?.helpful || 0,
    fire: post.reactions?.fire || 0,
    user_reactions: post.reactions?.user_reactions || []
  });
  const [isReacting, setIsReacting] = useState(false);
  const isOwner = user?.id === post.user?.id;

  const handleReaction = async (type: 'tee' | 'helpful' | 'fire') => {
    if (!user || isReacting) return;

    setIsReacting(true);
    try {
      const hasReaction = reactions.user_reactions.includes(type);
      
      if (hasReaction) {
        // Remove reaction
        await supabase
          .from('forum_reactions')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .eq('reaction_type', type);

        setReactions((prev) => ({
          ...prev,
          [type]: prev[type] - 1,
          user_reactions: prev.user_reactions.filter(r => r !== type)
        }));
      } else {
        // Add reaction (allow multiple)
        await supabase
          .from('forum_reactions')
          .insert({
            post_id: post.id,
            user_id: user.id,
            reaction_type: type
          });

        setReactions((prev) => ({
          ...prev,
          [type]: prev[type] + 1,
          user_reactions: [...prev.user_reactions, type]
        }));
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
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

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-white/10">
                  {isOwner && !threadLocked && (
                    <DropdownMenuItem>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Post
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

          {/* Reactions - Split Layout */}
          <div className="flex items-center justify-between">
            {/* Left side reactions */}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant={reactions.user_reactions.includes('helpful') ? 'secondary' : 'ghost'}
                className="h-12 px-4 flex flex-col sm:flex-row items-center gap-1 min-w-[80px]"
                onClick={() => handleReaction('helpful')}
                disabled={!user || isReacting}
              >
                <span className="text-lg">💡</span>
                <span className="text-xs sm:text-sm">
                  Helpful {reactions.helpful > 0 && `(${reactions.helpful})`}
                </span>
              </Button>
              <Button
                variant={reactions.user_reactions.includes('fire') ? 'secondary' : 'ghost'}
                className="h-12 px-4 flex flex-col sm:flex-row items-center gap-1 min-w-[80px]"
                onClick={() => handleReaction('fire')}
                disabled={!user || isReacting}
              >
                <Flame className="h-5 w-5" />
                <span className="text-xs sm:text-sm">
                  Hot Take {reactions.fire > 0 && `(${reactions.fire})`}
                </span>
              </Button>
            </div>

            {/* Right side - Tee button */}
            <Button
              variant="ghost"
              className={cn(
                "h-12 px-4 flex items-center gap-2 transition-colors",
                reactions.user_reactions.includes('tee') 
                  ? "text-[#10B981] hover:text-[#10B981]/80" 
                  : "hover:text-[#10B981]/60"
              )}
              onClick={() => handleReaction('tee')}
              disabled={!user || isReacting}
            >
              <TeedBallIcon 
                className={cn(
                  "h-7 w-7 transition-all",
                  reactions.user_reactions.includes('tee') && "text-[#10B981]"
                )} 
                filled={reactions.user_reactions.includes('tee')}
              />
              <span className="text-sm font-medium">
                {reactions.tee > 0 ? reactions.tee : 'Tee'}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}