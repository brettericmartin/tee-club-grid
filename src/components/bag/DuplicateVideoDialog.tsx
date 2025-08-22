import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, ExternalLink, UserCircle, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface DuplicateVideoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  duplicatePost: any;
  onAddToBagOnly: () => void;
  videoTitle?: string;
}

export function DuplicateVideoDialog({
  isOpen,
  onClose,
  duplicatePost,
  onAddToBagOnly,
  videoTitle
}: DuplicateVideoDialogProps) {
  const navigate = useNavigate();

  const handleViewPost = () => {
    // Navigate to the feed and scroll to the post
    navigate('/feed');
    // You could also pass state to highlight the specific post
    onClose();
  };

  const postedTime = duplicatePost?.created_at 
    ? formatDistanceToNow(new Date(duplicatePost.created_at), { addSuffix: true })
    : 'recently';

  const posterName = duplicatePost?.profile?.display_name || 
                     duplicatePost?.profile?.username || 
                     'Another golfer';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a1a] border-white/20 text-white max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-yellow-400 animate-pulse" />
            <DialogTitle className="text-xl">Great minds think alike!</DialogTitle>
          </div>
          <DialogDescription className="text-white/70 text-base">
            This video is already making waves in the community! 🎉
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Video Title */}
          {videoTitle && (
            <div className="p-3 bg-[#2a2a2a] rounded-lg">
              <p className="text-sm text-white/60 mb-1">Video</p>
              <p className="font-medium line-clamp-2">{videoTitle}</p>
            </div>
          )}

          {/* Original Post Info */}
          <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-start gap-3">
              <UserCircle className="h-10 w-10 text-primary/60 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-white">
                  {posterName}
                </p>
                <p className="text-sm text-white/60 flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3" />
                  Shared {postedTime}
                </p>
              </div>
            </div>
            
            {duplicatePost?.content?.notes && (
              <p className="mt-3 text-sm text-white/80 italic">
                "{duplicatePost.content.notes}"
              </p>
            )}
          </div>

          {/* Encouraging Message */}
          <div className="text-center py-2">
            <p className="text-white/70 text-sm">
              Join the conversation on this popular video, or add it to your bag for personal reference!
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleViewPost}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Feed Post
          </Button>
          
          <Button
            onClick={onAddToBagOnly}
            variant="outline"
            className="flex-1 border-white/20 hover:bg-[#2a2a2a]"
          >
            Add to My Bag Only
          </Button>
        </div>

        <Button
          onClick={onClose}
          variant="ghost"
          className="w-full mt-2 text-white/60 hover:text-white hover:bg-[#2a2a2a]"
        >
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default DuplicateVideoDialog;