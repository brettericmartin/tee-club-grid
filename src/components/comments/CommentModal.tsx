import { useState, useEffect } from 'react';
import { X, MessageCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TeedBallLike } from '@/components/shared/TeedBallLike';
import CommentSection from './CommentSection';
import { formatTimestamp } from '@/utils/feedTransformer';
import type { FeedItemData } from '@/utils/feedTransformer';

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: FeedItemData;
  currentUserId?: string;
  onLike?: (postId: string) => void;
  isLiked: boolean;
  commentCount: number;
  onCommentCountChange: (count: number) => void;
}

export default function CommentModal({
  isOpen,
  onClose,
  post,
  currentUserId,
  onLike,
  isLiked,
  commentCount,
  onCommentCountChange
}: CommentModalProps) {
  const [modalCommentCount, setModalCommentCount] = useState(commentCount);

  useEffect(() => {
    setModalCommentCount(commentCount);
  }, [commentCount]);

  const handleCommentCountChange = (count: number) => {
    setModalCommentCount(count);
    onCommentCountChange(count);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 h-full max-h-[90vh]">
          {/* Left side - Post content */}
          <div className="bg-black relative">
            {/* Post image */}
            <div className="aspect-square relative">
              <img 
                src={post.imageUrl} 
                alt={post.caption}
                className="w-full h-full object-cover"
              />
              
              {/* Post type badge */}
              <div className="absolute top-3 left-3 bg-primary/90 text-black px-3 py-1 rounded-full">
                <span className="text-xs font-semibold">
                  {post.postType === 'equipment_photo' ? 'Equipment Photo' : 
                   post.postType === 'new_equipment' ? 'New Equipment' : 
                   post.postType === 'bag_update' ? 'Bag Update' : 
                   post.postType}
                </span>
              </div>
            </div>

            {/* Mobile header - shows on small screens */}
            <div className="md:hidden p-4 bg-gray-900 border-t border-gray-800">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={post.userAvatar || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-800 text-white">
                    {post.userName?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-white font-medium">{post.userName}</p>
                  <p className="text-gray-400 text-xs">
                    {formatTimestamp(post.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Comments */}
          <div className="flex flex-col bg-gray-900 h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 hidden md:block">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={post.userAvatar || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-800 text-white">
                      {post.userName?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-white font-medium">{post.userName}</p>
                    <p className="text-gray-400 text-xs">
                      {post.userTitle || (post.userHandicap ? `${post.userHandicap} HCP` : 'Golfer')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Post caption & stats */}
            <div className="p-4 border-b border-gray-800">
              <p className="text-white mb-3">{post.caption}</p>
              
              <div className="flex items-center gap-4 text-sm">
                <TeedBallLike
                  isLiked={isLiked}
                  likeCount={post.likes}
                  onToggle={() => onLike?.(post.postId)}
                  size="sm"
                />
                
                <div className="flex items-center gap-1 text-gray-400">
                  <MessageCircle className="w-4 h-4" />
                  <span>{modalCommentCount} {modalCommentCount === 1 ? 'comment' : 'comments'}</span>
                </div>
                
                <span className="text-gray-400 ml-auto">
                  {formatTimestamp(post.timestamp)}
                </span>
              </div>
            </div>

            {/* Comments section */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <CommentSection 
                    postId={post.postId} 
                    onCommentCountChange={handleCommentCountChange}
                  />
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}