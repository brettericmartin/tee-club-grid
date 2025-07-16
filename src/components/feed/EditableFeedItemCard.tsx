import { Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FeedItemCard } from '@/components/FeedItemCard';
import type { FeedItemData } from '@/utils/feedTransformer';

interface EditableFeedItemCardProps {
  post: FeedItemData;
  currentUserId?: string;
  onEdit: (postId: string) => void;
  onDelete: (postId: string) => void;
}

export function EditableFeedItemCard({ 
  post, 
  currentUserId,
  onEdit,
  onDelete 
}: EditableFeedItemCardProps) {
  const isOwner = currentUserId === post.userId;

  return (
    <div className="relative group">
      <FeedItemCard 
        post={post} 
        currentUserId={currentUserId}
        onLike={() => {}} // TODO: Implement
        onFollow={() => {}} // Not needed in own profile
      />
      
      {/* Edit/Delete overlay - only show for owner */}
      {isOwner && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 bg-black/80 hover:bg-black/90 text-white border border-white/20"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(post.postId);
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 bg-black/80 hover:bg-black/90 text-white border border-white/20"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(post.postId);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}