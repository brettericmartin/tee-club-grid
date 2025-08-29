import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Copy, Share2, Users, Clock, CheckCircle, Send, Gift } from 'lucide-react';
import { motion } from 'framer-motion';

interface InviteCode {
  code: string;
  used_by: string | null;
  used_at: string | null;
  expires_at: string;
  is_active: boolean;
  status: 'active' | 'used' | 'expired' | 'deactivated';
}

export function InviteCodesPanel() {
  const { user, profile } = useAuth();
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [inviteQuota, setInviteQuota] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (user && profile?.beta_access) {
      loadInviteCodes();
    }
  }, [user, profile]);

  const loadInviteCodes = async () => {
    if (!user) return;
    
    try {
      // Get user's invite codes
      const { data: codes, error } = await supabase.rpc('get_my_invite_codes', {
        p_user_id: user.id
      });

      if (!error && codes) {
        setInviteCodes(codes);
      }

      // Get invite quota from profile
      if (profile?.invite_quota) {
        setInviteQuota(profile.invite_quota);
      }
    } catch (error) {
      console.error('Error loading invite codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInviteCodes = async () => {
    if (!user || inviteQuota <= 0) return;
    
    setGenerating(true);
    try {
      const { data: newCodes, error } = await supabase.rpc('generate_invite_codes', {
        p_user_id: user.id,
        p_count: Math.min(inviteQuota, 3)
      });

      if (!error && newCodes) {
        toast.success(`Generated ${newCodes.length} invite codes!`);
        loadInviteCodes(); // Reload to show new codes
      } else {
        toast.error('Failed to generate invite codes');
      }
    } catch (error) {
      console.error('Error generating codes:', error);
      toast.error('Failed to generate invite codes');
    } finally {
      setGenerating(false);
    }
  };

  const copyInviteLink = (code: string) => {
    const url = `${window.location.origin}/waitlist?invite=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    toast.success('Invite link copied!');
    
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const shareInviteLink = async (code: string) => {
    const url = `${window.location.origin}/waitlist?invite=${code}`;
    const text = `Join me on Teed.club! Use my invite code to get instant beta access: ${code}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Teed.club Beta',
          text,
          url
        });
      } catch (error) {
        // User cancelled or share failed
        copyInviteLink(code);
      }
    } else {
      copyInviteLink(code);
    }
  };

  if (!profile?.beta_access) {
    return null;
  }

  const activeCodes = inviteCodes.filter(c => c.status === 'active');
  const usedCodes = inviteCodes.filter(c => c.status === 'used');

  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-emerald-500" />
            <span>Invite Friends</span>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            {inviteQuota} invites left
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Generate Codes Button */}
        {inviteQuota > 0 && activeCodes.length === 0 && (
          <div className="text-center py-6">
            <p className="text-white/60 mb-4">
              Share Teed.club with your golf buddies! Generate invite codes to give them instant beta access.
            </p>
            <Button
              onClick={generateInviteCodes}
              disabled={generating}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {generating ? (
                <>Generating...</>
              ) : (
                <>
                  <Gift className="w-4 h-4 mr-2" />
                  Generate Invite Codes
                </>
              )}
            </Button>
          </div>
        )}

        {/* Active Codes */}
        {activeCodes.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-white/80 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Active Invite Codes
            </h4>
            {activeCodes.map((code, index) => (
              <motion.div
                key={code.code}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-black/30 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <code className="text-emerald-400 font-mono text-sm">
                    {code.code}
                  </code>
                  {code.expires_at && (
                    <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Expires {new Date(code.expires_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyInviteLink(code.code)}
                    className="border-gray-700"
                  >
                    {copiedCode === code.code ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => shareInviteLink(code.code)}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Used Codes */}
        {usedCodes.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-white/80 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              Friends You've Invited
            </h4>
            {usedCodes.map((code) => (
              <div
                key={code.code}
                className="bg-black/20 rounded-lg p-3 opacity-60"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <code className="text-gray-500 font-mono text-xs line-through">
                      {code.code}
                    </code>
                    <p className="text-xs text-white/40 mt-1">
                      Used by {code.used_by || 'Someone'} on {new Date(code.used_at!).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                    Used
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Section */}
        <div className="border-t border-gray-800 pt-4">
          <p className="text-xs text-white/40">
            Each invite code gives instant beta access. Invited friends get 2 invites to share with their buddies.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}