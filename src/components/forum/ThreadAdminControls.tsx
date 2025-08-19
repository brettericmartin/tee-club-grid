import { useState } from 'react';
import { Lock, Unlock, Pin, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { setThreadLocked, setThreadPinned, deleteForumThread } from '@/services/forumAdmin';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface ThreadAdminControlsProps {
  threadId: string;
  categorySlug: string;
  isLocked: boolean;
  isPinned: boolean;
  onUpdate?: () => void;
}

export default function ThreadAdminControls({
  threadId,
  categorySlug,
  isLocked,
  isPinned,
  onUpdate
}: ThreadAdminControlsProps) {
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleToggleLock = async () => {
    setIsUpdating(true);
    try {
      const { success, error } = await setThreadLocked(threadId, !isLocked);
      
      if (success) {
        toast.success(isLocked ? 'Thread unlocked' : 'Thread locked');
        if (onUpdate) onUpdate();
      } else {
        toast.error(error || 'Failed to update thread');
      }
    } catch (error) {
      console.error('Error toggling lock:', error);
      toast.error('Failed to update thread');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTogglePin = async () => {
    setIsUpdating(true);
    try {
      const { success, error } = await setThreadPinned(threadId, !isPinned);
      
      if (success) {
        toast.success(isPinned ? 'Thread unpinned' : 'Thread pinned');
        if (onUpdate) onUpdate();
      } else {
        toast.error(error || 'Failed to update thread');
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error('Failed to update thread');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteThread = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    
    setIsUpdating(true);
    try {
      const { success, error } = await deleteForumThread(threadId);
      
      if (success) {
        toast.success('Thread deleted');
        navigate(`/forum/${categorySlug}`);
      } else {
        toast.error(error || 'Failed to delete thread');
      }
    } catch (error) {
      console.error('Error deleting thread:', error);
      toast.error('Failed to delete thread');
    } finally {
      setIsUpdating(false);
      setShowDeleteDialog(false);
      setDeleteConfirmText('');
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleLock}
          disabled={isUpdating}
          className={isLocked ? 'text-yellow-500 border-yellow-500/30' : ''}
        >
          {isLocked ? (
            <>
              <Unlock className="h-4 w-4 mr-2" />
              Unlock Thread
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Lock Thread
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleTogglePin}
          disabled={isUpdating}
          className={isPinned ? 'text-green-500 border-green-500/30' : ''}
        >
          {isPinned ? (
            <>
              <Pin className="h-4 w-4 mr-2" />
              Unpin Thread
            </>
          ) : (
            <>
              <Pin className="h-4 w-4 mr-2" />
              Pin Thread
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          disabled={isUpdating}
          className="text-red-500 border-red-500/30 hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Thread
        </Button>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#1a1a1a] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500">Delete Thread</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                This action cannot be undone. This will permanently delete the thread
                and all replies.
              </p>
              <p className="text-white">
                Type <span className="font-mono font-bold">DELETE</span> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-md text-white"
                placeholder="Type DELETE to confirm"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteThread}
              disabled={deleteConfirmText !== 'DELETE' || isUpdating}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Thread
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}