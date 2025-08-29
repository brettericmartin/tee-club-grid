import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, Users, Trophy, Share2, Bell, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface WaitlistStatus {
  position?: number;
  totalWaitlist?: number;
  estimatedTime?: string;
  inviteCodes?: string[];
  inviteQuota?: number;
  spotsRemaining?: number;
}

export function WaitlistStatusView() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<WaitlistStatus>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchWaitlistStatus();
  }, [user, profile]);

  const fetchWaitlistStatus = async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    try {
      // Get user's waitlist status
      const { data: result, error } = await supabase.rpc('get_user_beta_status', {
        p_email: user.email
      });

      if (error) {
        console.error('Error fetching status:', error);
        // Fallback to checking waitlist table
        const { data: application } = await supabase
          .from('waitlist_applications')
          .select('*')
          .eq('email', user.email.toLowerCase())
          .single();

        if (application) {
          // Get position in queue
          const { count: position } = await supabase
            .from('waitlist_applications')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending')
            .lt('created_at', application.created_at);

          const { count: totalWaitlist } = await supabase
            .from('waitlist_applications')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

          setStatus({
            position: (position || 0) + 1,
            totalWaitlist: totalWaitlist || 0,
            estimatedTime: calculateEstimatedTime(position || 0),
            spotsRemaining: result?.spots_remaining || 0
          });
        }
      } else if (result) {
        // If they have beta access but ended up here, redirect
        if (result.status === 'approved') {
          navigate('/my-bag');
          return;
        }

        // Get user's invite codes if they have beta access
        if (result.status === 'approved' && user) {
          const { data: inviteCodes } = await supabase.rpc('get_my_invite_codes', {
            p_user_id: profile?.id || user.id
          });
          
          const activeCodes = inviteCodes?.filter(c => c.status === 'active').map(c => c.code) || [];
          
          setStatus({
            inviteCodes: activeCodes,
            inviteQuota: result.invite_quota,
            spotsRemaining: result.spots_remaining
          });
        } else {
          setStatus({
            spotsRemaining: result.spots_remaining
          });
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateEstimatedTime = (position: number): string => {
    // Rough estimate: 10 users per week get approved
    const weeks = Math.ceil(position / 10);
    if (weeks === 1) return '1 week';
    if (weeks < 4) return `${weeks} weeks`;
    if (weeks < 8) return '1-2 months';
    return '2+ months';
  };

  const copyInviteLink = (code?: string) => {
    const inviteCode = code || status.inviteCodes?.[0];
    if (!inviteCode) return;
    
    const url = `${window.location.origin}/waitlist?invite=${inviteCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Invite link copied!');
    
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-black to-emerald-900/10" />
      
      <div className="relative z-10 container mx-auto px-4 py-12 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="text-center space-y-4">
            <Badge className="inline-flex items-center px-4 py-2 text-sm bg-amber-500/10 text-amber-400 border-amber-500/20">
              <Clock className="w-4 h-4 mr-2" />
              On the Waitlist
            </Badge>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              You're on the List! 
            </h1>
            
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              We're currently at capacity with our beta program. 
              You'll be notified as soon as a spot opens up.
            </p>
          </div>

          {/* Status Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Position Card */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                <div className="text-3xl font-bold text-white mb-2">
                  #{status.position || 'TBD'}
                </div>
                <p className="text-sm text-white/60">Your position</p>
                {status.totalWaitlist && (
                  <p className="text-xs text-white/40 mt-1">
                    of {status.totalWaitlist} waiting
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Time Estimate Card */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-6 text-center">
                <Clock className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                <div className="text-2xl font-bold text-white mb-2">
                  {status.estimatedTime || 'Soon'}
                </div>
                <p className="text-sm text-white/60">Estimated wait</p>
                <p className="text-xs text-white/40 mt-1">
                  Based on current pace
                </p>
              </CardContent>
            </Card>

            {/* Spots Remaining Card */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-6 text-center">
                <Trophy className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                <div className="text-3xl font-bold text-white mb-2">
                  {status.spotsRemaining || 0}
                </div>
                <p className="text-sm text-white/60">Spots left</p>
                <p className="text-xs text-white/40 mt-1">
                  of 150 total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Status Section */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium text-white">
                      Email Notifications
                    </p>
                    <p className="text-xs text-white/60">
                      We'll notify you when your spot is ready
                    </p>
                  </div>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  Enabled
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* What to Expect */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-8">
              <h3 className="text-xl font-semibold text-white mb-4">
                What Happens Next?
              </h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-white font-medium">You'll receive an email</p>
                    <p className="text-sm text-white/60">
                      As soon as your spot is ready, we'll send you an email with instructions
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-white font-medium">Instant access to MyBag</p>
                    <p className="text-sm text-white/60">
                      Once approved, you'll immediately have access to build and share your golf bag
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-white font-medium">Founder benefits</p>
                    <p className="text-sm text-white/60">
                      Early beta users get special badges, priority support, and input on new features
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer Actions */}
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/equipment')}
              className="border-gray-700 hover:bg-gray-900"
            >
              Browse Equipment
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/feed')}
              className="border-gray-700 hover:bg-gray-900"
            >
              View Community Feed
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}