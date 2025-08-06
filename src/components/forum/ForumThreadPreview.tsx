import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Circle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ForumThreadPreviewProps {
  thread: {
    id: string;
    title: string;
    slug: string;
    tee_count: number;
    reply_count: number;
    created_at: string;
    category: {
      id: string;
      name: string;
      slug: string;
      icon?: string;
    };
    user: {
      id: string;
      username: string;
      display_name?: string;
      avatar_url?: string;
    };
  };
  onClick: () => void;
}

export default function ForumThreadPreview({ thread, onClick }: ForumThreadPreviewProps) {
  return (
    <Card 
      className="bg-[#1a1a1a] border-white/10 p-3 hover:bg-white/5 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="space-y-2">
        {/* Title and Category */}
        <div className="space-y-1">
          <h4 className="font-medium text-white text-sm line-clamp-2 leading-tight">
            {thread.title}
          </h4>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              {thread.category.icon && <span>{thread.category.icon}</span>}
              {thread.category.name}
            </span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}</span>
          </div>
        </div>

        {/* Author and Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={thread.user.avatar_url} alt={thread.user.username} />
              <AvatarFallback className="text-xs bg-gradient-to-br from-green-400 to-blue-500">
                {thread.user.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-gray-300">
              {thread.user.display_name || thread.user.username}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-gray-300">
              <Circle className="h-3 w-3 text-green-500 fill-green-500" />
              {thread.tee_count}
            </span>
            <span className="flex items-center gap-1 text-gray-300">
              <MessageSquare className="h-3 w-3" />
              {thread.reply_count}
            </span>
          </div>
        </div>

        {/* Popular/Trending badges */}
        {(thread.tee_count > 10 || thread.reply_count > 20) && (
          <div className="flex gap-1">
            {thread.tee_count > 10 && (
              <Badge variant="secondary" className="text-xs py-0 px-1 bg-green-500/20 text-green-400">
                Popular
              </Badge>
            )}
            {thread.reply_count > 20 && (
              <Badge variant="secondary" className="text-xs py-0 px-1 bg-blue-500/20 text-blue-400">
                Active
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}