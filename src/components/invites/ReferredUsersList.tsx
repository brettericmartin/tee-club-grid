import { Link } from 'react-router-dom';
import { Users, UserCheck, Calendar, ExternalLink } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getDisplayInitials } from '@/utils/displayName';
import { cn } from '@/lib/utils';

interface ReferredUser {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  joined_at: string;
}

interface ReferredUsersListProps {
  users: ReferredUser[];
  showPrivateInfo?: boolean;
  className?: string;
}

export function ReferredUsersList({ 
  users, 
  showPrivateInfo = true,
  className 
}: ReferredUsersListProps) {
  
  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  if (users.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
        <p className="text-white/60">
          No referrals yet
        </p>
        <p className="text-white/40 text-sm mt-1">
          Users who join with your invite will appear here
        </p>
      </div>
    );
  }
  
  return (
    <ScrollArea className={cn('max-h-[400px]', className)}>
      <div className="space-y-3">
        {users.map((user, index) => {
          const displayName = user.display_name || user.username || 'Anonymous';
          const initials = getDisplayInitials(displayName);
          const hasProfile = showPrivateInfo && user.username;
          
          return (
            <div
              key={user.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              {/* Avatar */}
              <Avatar className="h-10 w-10">
                {user.avatar_url ? (
                  <AvatarImage src={user.avatar_url} alt={displayName} />
                ) : (
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {initials}
                  </AvatarFallback>
                )}
              </Avatar>
              
              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {hasProfile ? (
                    <Link
                      to={`/@${user.username}`}
                      className="font-medium text-white hover:text-primary transition-colors truncate"
                    >
                      {displayName}
                    </Link>
                  ) : (
                    <span className="font-medium text-white truncate">
                      {showPrivateInfo ? displayName : 'User'}
                    </span>
                  )}
                  
                  {index < 3 && (
                    <Badge 
                      variant="secondary" 
                      className="bg-primary/10 text-primary border-primary/20"
                    >
                      <UserCheck className="w-3 h-3 mr-1" />
                      Top Referral
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-3 text-xs text-white/50 mt-1">
                  {showPrivateInfo && user.username && (
                    <span>@{user.username}</span>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatJoinDate(user.joined_at)}</span>
                  </div>
                </div>
              </div>
              
              {/* Action */}
              {hasProfile && (
                <Link
                  to={`/@${user.username}`}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-white/60" />
                </Link>
              )}
            </div>
          );
        })}
      </div>
      
      {users.length > 10 && (
        <div className="text-center mt-4">
          <p className="text-sm text-white/50">
            Showing {users.length} referred users
          </p>
        </div>
      )}
    </ScrollArea>
  );
}