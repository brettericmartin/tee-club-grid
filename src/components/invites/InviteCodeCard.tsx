import { useState } from 'react';
import { Copy, Share2, X, Clock, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  copyInviteCode,
  copyInviteUrl,
  generateShareMessages,
  isInviteExpired,
  formatExpiryDate,
} from '@/services/inviteService';
import { cn } from '@/lib/utils';

interface InviteCode {
  code: string;
  created_by: string;
  note: string | null;
  max_uses: number;
  uses: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

interface InviteCodeCardProps {
  code: InviteCode;
  onRevoke: () => void;
  className?: string;
}

export function InviteCodeCard({ code, onRevoke, className }: InviteCodeCardProps) {
  const [copying, setCopying] = useState(false);
  const isExpired = isInviteExpired(code.expires_at);
  const isFullyUsed = code.uses >= code.max_uses;
  const isValid = code.active && !isExpired && !isFullyUsed;
  
  const handleCopyCode = async () => {
    setCopying(true);
    const success = await copyInviteCode(code.code);
    if (success) {
      toast.success('Invite code copied to clipboard!');
    } else {
      toast.error('Failed to copy code');
    }
    setCopying(false);
  };
  
  const handleCopyUrl = async () => {
    const success = await copyInviteUrl(code.code);
    if (success) {
      toast.success('Invite link copied to clipboard!');
    } else {
      toast.error('Failed to copy link');
    }
  };
  
  const handleShare = (platform: 'twitter' | 'linkedin' | 'email') => {
    const messages = generateShareMessages(code.code);
    
    switch (platform) {
      case 'twitter':
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(messages.twitter.text)}&url=${encodeURIComponent(messages.twitter.url)}&hashtags=${messages.twitter.hashtags}`,
          '_blank'
        );
        break;
      case 'linkedin':
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(messages.linkedin.url)}`,
          '_blank'
        );
        break;
      case 'email':
        window.location.href = `mailto:?subject=${encodeURIComponent(messages.email.subject)}&body=${encodeURIComponent(messages.email.body)}`;
        break;
    }
  };
  
  return (
    <div
      className={cn(
        'relative p-4 rounded-lg border transition-all',
        isValid
          ? 'bg-white/5 border-white/10 hover:bg-white/10'
          : 'bg-white/5 border-white/5 opacity-60',
        className
      )}
    >
      {/* Status Badge */}
      <div className="absolute top-4 right-4">
        {!code.active ? (
          <Badge variant="secondary" className="bg-red-500/10 text-red-400 border-red-500/20">
            <X className="w-3 h-3 mr-1" />
            Revoked
          </Badge>
        ) : isExpired ? (
          <Badge variant="secondary" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
            <AlertCircle className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        ) : isFullyUsed ? (
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Used
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        )}
      </div>
      
      {/* Code Display */}
      <div className="mb-3">
        <div className="flex items-center gap-3">
          <code className="text-xl font-mono font-bold text-white">
            {code.code}
          </code>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyCode}
            disabled={!isValid || copying}
            className="h-8 w-8 p-0"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        {code.note && (
          <p className="text-sm text-white/60 mt-1">{code.note}</p>
        )}
      </div>
      
      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1 text-white/60">
          <Users className="w-4 h-4" />
          <span>{code.uses}/{code.max_uses} used</span>
        </div>
        <div className="flex items-center gap-1 text-white/60">
          <Clock className="w-4 h-4" />
          <span>{formatExpiryDate(code.expires_at)}</span>
        </div>
      </div>
      
      {/* Actions */}
      {isValid && (
        <div className="flex items-center gap-2 mt-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleCopyUrl}
            className="flex-1"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Link
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="secondary" className="px-3">
                <Share2 className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleShare('twitter')}>
                Share on Twitter
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('linkedin')}>
                Share on LinkedIn
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('email')}>
                Share via Email
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onRevoke}
                className="text-red-400 focus:text-red-400"
              >
                <X className="w-4 h-4 mr-2" />
                Revoke Code
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      
      {/* Usage Progress Bar */}
      {code.max_uses > 1 && (
        <div className="mt-3">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(code.uses / code.max_uses) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}