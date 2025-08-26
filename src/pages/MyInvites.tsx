import { useState, useEffect } from 'react';
import { Plus, Copy, Share2, Users, TrendingUp, Gift, Clock, AlertCircle, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getInvitesList, issueInviteCode, revokeInviteCode } from '@/services/inviteService';
import { InviteCodeCard } from '@/components/invites/InviteCodeCard';
import { ReferredUsersList } from '@/components/invites/ReferredUsersList';
import { InviteStatsPanel } from '@/components/invites/InviteStatsPanel';
import { fetchLeaderboard, type LeaderboardData } from '@/services/leaderboardService';
import { formatRank, getTrendIndicator, getTrendColorClass } from '@/utils/privacyMasking';

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

interface InviteStats {
  totalInvites: number;
  successfulInvites: number;
  pendingInvites: number;
  successRate: number;
  bonusInvitesEarned: number;
}

interface ReferredUser {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  joined_at: string;
}

export default function MyInvites() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [inviteQuota, setInviteQuota] = useState(3);
  const [invitesUsed, setInvitesUsed] = useState(0);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    
    fetchInviteData();
    fetchLeaderboardData();
  }, [user, navigate]);
  
  const fetchInviteData = async () => {
    try {
      setLoading(true);
      const data = await getInvitesList();
      
      setInviteCodes(data.codes || []);
      setReferredUsers(data.referredUsers || []);
      setStats(data.stats || null);
      setInviteQuota(data.inviteQuota || 3);
      setInvitesUsed(data.invitesUsed || 0);
    } catch (error) {
      console.error('Error fetching invite data:', error);
      toast.error('Failed to load invite data');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchLeaderboardData = async () => {
    try {
      const data = await fetchLeaderboard('30d', true);
      setLeaderboardData(data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      // Don't show error toast for leaderboard - it's optional
    }
  };
  
  const handleIssueCode = async () => {
    if (invitesUsed >= inviteQuota) {
      toast.error('You have no invites remaining');
      return;
    }
    
    try {
      setIssuing(true);
      const newCode = await issueInviteCode();
      
      if (newCode) {
        setInviteCodes(prev => [newCode, ...prev]);
        setInvitesUsed(prev => prev + 1);
        toast.success('New invite code generated!');
      }
    } catch (error) {
      console.error('Error issuing invite code:', error);
      toast.error('Failed to generate invite code');
    } finally {
      setIssuing(false);
    }
  };
  
  const handleRevokeCode = async (code: string) => {
    try {
      await revokeInviteCode(code);
      setInviteCodes(prev => 
        prev.map(c => c.code === code ? { ...c, active: false } : c)
      );
      toast.success('Invite code revoked');
    } catch (error) {
      console.error('Error revoking invite code:', error);
      toast.error('Failed to revoke invite code');
    }
  };
  
  const invitesRemaining = Math.max(0, inviteQuota - invitesUsed);
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          <Skeleton className="h-12 w-48" />
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Invites</h1>
        <p className="text-white/70">
          Manage your invite codes and track your referrals
        </p>
      </div>
      
      {/* Quota Alert */}
      {invitesRemaining === 0 && (
        <Alert className="mb-6 bg-amber-500/10 border-amber-500/20">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-500">
            You've used all your invites. Refer 3 more users to earn a bonus invite!
          </AlertDescription>
        </Alert>
      )}
      
      {/* Stats and Rank Grid */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Stats Panel */}
        {stats && (
          <InviteStatsPanel stats={stats} className="md:col-span-1" />
        )}
        
        {/* Leaderboard Rank Card */}
        {leaderboardData?.user_rank && (
          <Card className="bg-gradient-to-br from-green-900/20 to-green-950/10 border-green-600/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <h3 className="text-lg font-semibold text-white">
                      Leaderboard Rank
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold text-green-500">
                      #{leaderboardData.user_rank.rank}
                    </span>
                    {leaderboardData.user_rank.trend && (
                      <span className={`text-sm font-medium ${getTrendColorClass(leaderboardData.user_rank.trend)}`}>
                        {getTrendIndicator(leaderboardData.user_rank.trend, true)}
                      </span>
                    )}
                  </div>
                  <p className="text-white/60 text-sm mt-1">
                    {leaderboardData.user_rank.referral_count} referrals this month
                  </p>
                </div>
                <div className="text-right">
                  <a 
                    href="/waitlist"
                    className="text-green-500 hover:text-green-400 text-sm transition-colors"
                  >
                    View Full Leaderboard →
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Actions Bar */}
      <Card className="mb-6 bg-white/5 border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">
                Invite Quota
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary">
                  {invitesRemaining}
                </span>
                <span className="text-white/60">
                  of {inviteQuota} remaining
                </span>
              </div>
            </div>
            
            <Button
              onClick={handleIssueCode}
              disabled={invitesRemaining === 0 || issuing}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Generate Invite Code
            </Button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(invitesUsed / inviteQuota) * 100}%` }}
              />
            </div>
            <p className="text-xs text-white/50 mt-2">
              Refer 3 users to earn a bonus invite
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Invite Codes Section */}
        <div>
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Gift className="w-5 h-5 text-primary" />
                Your Invite Codes
              </CardTitle>
              <CardDescription className="text-white/60">
                Share these codes with friends to invite them
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inviteCodes.length > 0 ? (
                <div className="space-y-3">
                  {inviteCodes.map(code => (
                    <InviteCodeCard
                      key={code.code}
                      code={code}
                      onRevoke={() => handleRevokeCode(code.code)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Gift className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/60">
                    No invite codes yet
                  </p>
                  <p className="text-white/40 text-sm mt-1">
                    Generate your first invite code above
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Referred Users Section */}
        <div>
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Referred Users
              </CardTitle>
              <CardDescription className="text-white/60">
                Friends who joined using your invites
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReferredUsersList users={referredUsers} />
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Tips Section */}
      <Card className="mt-6 bg-primary/10 border-primary/20">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-white mb-3">
            💡 Tips for Successful Referrals
          </h3>
          <ul className="space-y-2 text-white/80">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Share your referral link on social media with a personal message</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Invite friends who are passionate about golf and equipment</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Every 3 successful referrals earns you a bonus invite</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Codes expire after 30 days, so encourage quick sign-ups</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}