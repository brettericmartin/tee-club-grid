import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Eye, Clock, Lock, Pin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ThreadCardProps {
  thread: {
    id: string;
    title: string;
    slug: string;
    views: number;
    is_pinned: boolean;
    is_locked: boolean;
    created_at: string;
    updated_at: string;
    category: {
      id: string;
      name: string;
      slug: string;
      icon: string;
    };
    user: {
      id: string;
      username: string;
      avatar_url: string;
    };
    post_count: number;
    latest_post?: {
      created_at: string;
      user: {
        username: string;
        avatar_url: string;
      };
    };
  };
  onClick: () => void;
}

export default function ThreadCard({ thread, onClick }: ThreadCardProps) {
  const lastActivity = thread.latest_post?.created_at || thread.created_at;
  const lastActivityUser = thread.latest_post?.user || thread.user;

  return (
    <Card 
      className="bg-[#1a1a1a] border-white/10 p-4 hover:bg-white/5 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex gap-4">
        {/* Author Avatar */}
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={thread.user.avatar_url} alt={thread.user.username} />
          <AvatarFallback className="bg-gradient-to-br from-green-400 to-blue-500 text-white">
            {thread.user.username[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Thread Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            {thread.is_pinned && (
              <Pin className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
            )}
            {thread.is_locked && (
              <Lock className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
            )}
            <h3 className="font-medium text-white line-clamp-2 flex-1">
              {thread.title}
            </h3>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              {thread.category.icon} {thread.category.name}
            </span>
            <span>by {thread.user.username}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
            </span>
          </div>

          <div className="flex items-center gap-4 mt-2 text-sm">
            <span className="flex items-center gap-1 text-gray-300">
              <MessageSquare className="h-4 w-4" />
              {thread.post_count} {thread.post_count === 1 ? 'reply' : 'replies'}
            </span>
            <span className="flex items-center gap-1 text-gray-300">
              <Eye className="h-4 w-4" />
              {thread.views} views
            </span>
          </div>

          {/* Tags */}
          <div className="flex gap-2 mt-3">
            {thread.is_pinned && (
              <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-400">
                Pinned
              </Badge>
            )}
            {thread.is_locked && (
              <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-400">
                Locked
              </Badge>
            )}
            {thread.post_count > 50 && (
              <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-400">
                Popular
              </Badge>
            )}
            {thread.views > 1000 && (
              <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-400">
                Trending
              </Badge>
            )}
          </div>
        </div>

        {/* Latest Activity - Desktop Only */}
        <div className="hidden md:flex flex-col items-end text-sm text-gray-400">
          <p className="text-xs mb-1">Last reply</p>
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={lastActivityUser.avatar_url} alt={lastActivityUser.username} />
              <AvatarFallback className="text-xs">
                {lastActivityUser.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-gray-300">{lastActivityUser.username}</span>
          </div>
          <p className="text-xs mt-1">
            {formatDistanceToNow(new Date(lastActivity), { addSuffix: true })}
          </p>
        </div>
      </div>
    </Card>
  );
}