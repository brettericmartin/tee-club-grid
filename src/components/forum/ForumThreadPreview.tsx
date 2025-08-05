import React from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Eye, Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ForumThreadPreviewProps {
  thread: {
    id: string;
    title: string;
    tee_count: number;
    reply_count: number;
    view_count: number;
    created_at: string;
    category: {
      name: string;
      slug: string;
    };
    user: {
      username: string;
      avatar_url?: string;
    };
  };
  onClick: () => void;
}

export default function ForumThreadPreview({ thread, onClick }: ForumThreadPreviewProps) {
  return (
    <Card 
      className="bg-[#1a1a1a] border-white/10 p-4 hover:bg-[#1a1a1a]/80 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={thread.user.avatar_url} />
          <AvatarFallback className="bg-gradient-to-br from-green-400 to-blue-500 text-white text-xs">
            {thread.user.username?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm line-clamp-2 mb-1">
            {thread.title}
          </h4>
          
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <Badge variant="secondary" className="text-xs px-2 py-0">
              {thread.category.name}
            </Badge>
            <span>by {thread.user.username}</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {thread.reply_count || 0}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {thread.view_count || 0}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <Heart className="h-4 w-4 text-[#10B981]" />
              <span className="text-xs font-medium text-[#10B981]">
                {thread.tee_count || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
