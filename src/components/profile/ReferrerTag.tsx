import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserCheck, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getReferralChain } from '@/services/referralService';
import { cn } from '@/lib/utils';

interface ReferrerTagProps {
  userId: string;
  showReferrer?: boolean; // Privacy control
  className?: string;
  variant?: 'inline' | 'badge' | 'card';
}

export function ReferrerTag({ 
  userId, 
  showReferrer = true,
  className = '',
  variant = 'badge'
}: ReferrerTagProps) {
  const [referrer, setReferrer] = useState<{
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReferrer = async () => {
      if (!showReferrer) {
        setLoading(false);
        return;
      }

      try {
        const chain = await getReferralChain(userId);
        if (chain?.referrer) {
          setReferrer(chain.referrer);
        }
      } catch (error) {
        console.error('[ReferrerTag] Error fetching referrer:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReferrer();
  }, [userId, showReferrer]);

  // Don't show anything if loading, no referrer, or privacy disabled
  if (loading || !referrer || !showReferrer) {
    return null;
  }

  const referrerName = referrer.display_name || referrer.username || 'a member';
  const referrerUsername = referrer.username;

  // Inline variant - simple text
  if (variant === 'inline') {
    return (
      <span className={cn('text-sm text-white/60', className)}>
        Invited by{' '}
        {referrerUsername ? (
          <Link 
            to={`/@${referrerUsername}`}
            className="text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            @{referrerUsername}
          </Link>
        ) : (
          <span className="text-emerald-400">{referrerName}</span>
        )}
      </span>
    );
  }

  // Card variant - more detailed display
  if (variant === 'card') {
    return (
      <div className={cn(
        'flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg',
        className
      )}>
        <div className="flex items-center justify-center w-10 h-10 bg-emerald-500/10 rounded-full">
          <Users className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-white/60">Invited by</p>
          {referrerUsername ? (
            <Link 
              to={`/@${referrerUsername}`}
              className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {referrerName}
            </Link>
          ) : (
            <p className="text-sm font-medium text-emerald-400">{referrerName}</p>
          )}
        </div>
      </div>
    );
  }

  // Badge variant (default)
  return (
    <Badge 
      variant="secondary" 
      className={cn(
        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 transition-colors',
        className
      )}
    >
      <UserCheck className="w-3 h-3 mr-1" />
      Invited by{' '}
      {referrerUsername ? (
        <Link 
          to={`/@${referrerUsername}`}
          className="ml-1 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          @{referrerUsername}
        </Link>
      ) : (
        <span className="ml-1">{referrerName}</span>
      )}
    </Badge>
  );
}

/**
 * Hook to get referrer information for a user
 */
export function useReferrer(userId: string) {
  const [referrer, setReferrer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchReferrer = async () => {
      try {
        setLoading(true);
        const chain = await getReferralChain(userId);
        setReferrer(chain?.referrer || null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchReferrer();
    }
  }, [userId]);

  return { referrer, loading, error };
}