import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users } from 'lucide-react';

interface TourUsageSectionProps {
  players: string[];
}

export default function TourUsageSection({ players }: TourUsageSectionProps) {
  if (!players || players.length === 0) {
    return null;
  }

  // Generate avatar URL for tour players (placeholder - could be enhanced with real player images)
  const getPlayerAvatar = (name: string) => {
    // Use UI Avatars service for generating avatar placeholders
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=10B981&color=fff&size=128`;
  };

  // Get player initials for fallback
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-4">
      {/* Summary Badge */}
      <div className="flex items-center gap-2 mb-4">
        <Badge className="bg-primary/20 text-primary border-primary/30 px-3 py-1">
          <Trophy className="w-3 h-3 mr-1.5" />
          Used by {players.length} Tour {players.length === 1 ? 'Pro' : 'Pros'}
        </Badge>
      </div>

      {/* Players Grid */}
      <div className="flex flex-wrap gap-4">
        {players.map((player, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 pr-5 rounded-full bg-[#2a2a2a]/50 hover:bg-[#2a2a2a] transition-all duration-200 cursor-pointer group"
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          >
            <Avatar className="h-10 w-10 border-2 border-primary/20 group-hover:border-primary/40 transition-colors">
              <AvatarImage 
                src={getPlayerAvatar(player)} 
                alt={player} 
              />
              <AvatarFallback className="bg-primary/20 text-white text-sm">
                {getInitials(player)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white font-medium text-sm group-hover:text-primary transition-colors">
                {player}
              </p>
              <p className="text-white/50 text-xs">Tour Professional</p>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Tour Stats (if many players) */}
      {players.length > 5 && (
        <div className="mt-6 p-4 rounded-lg bg-[#2a2a2a]/30 border border-white/10">
          <div className="flex items-center gap-2 text-white/70">
            <Users className="w-4 h-4" />
            <p className="text-sm">
              This equipment is trusted by multiple tour professionals, demonstrating its performance at the highest level of competition.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}