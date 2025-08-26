import { useState, useEffect } from 'react';
import { Copy, Share2, Twitter, MessageCircle, Mail, Users, Gift, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  formatReferralCode, 
  generateReferralUrl, 
  getShareUrl 
} from '@/utils/referralCodeGenerator';
import { DOMAIN_CONFIG } from '@/config/domain';

interface ReferralCodeSectionProps {
  referralCode: string | null;
  inviteQuota?: number;
  invitesUsed?: number;
  className?: string;
}

export function ReferralCodeSection({ 
  referralCode, 
  inviteQuota = 3, 
  invitesUsed = 0,
  className = ''
}: ReferralCodeSectionProps) {
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  
  const invitesRemaining = Math.max(0, inviteQuota - invitesUsed);
  const referralUrl = referralCode ? generateReferralUrl(referralCode, DOMAIN_CONFIG.production) : '';
  
  const copyCode = async () => {
    if (!referralCode) return;
    
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast.success('Referral code copied!');
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };
  
  const copyUrl = async () => {
    if (!referralUrl) return;
    
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopiedUrl(true);
      toast.success('Referral link copied!');
      
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };
  
  const share = (platform: 'twitter' | 'whatsapp' | 'email') => {
    if (!referralCode) return;
    
    const url = getShareUrl[platform](referralCode);
    
    if (platform === 'email') {
      window.location.href = url;
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    
    // Track share action
    toast.success(`Opening ${platform}...`);
  };
  
  if (!referralCode) {
    return (
      <Card className={`bg-[#1a1a1a] border-white/10 ${className}`}>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-emerald-400" />
            My Referral Code
          </CardTitle>
          <CardDescription className="text-white/60">
            No referral code generated yet
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card className={`bg-[#1a1a1a] border-white/10 ${className}`}>
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Gift className="w-5 h-5 text-emerald-400" />
          My Referral Code
        </CardTitle>
        <CardDescription className="text-white/60">
          Share your code to invite friends and earn rewards
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Referral Code Display */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-[#2a2a2a] rounded-lg border border-white/10">
            <div>
              <p className="text-sm text-white/60 mb-1">Your Code</p>
              <p className="text-2xl font-bold text-white font-mono">
                {formatReferralCode(referralCode)}
              </p>
            </div>
            <Button
              onClick={copyCode}
              variant="outline"
              size="sm"
              className="bg-[#3a3a3a] border-white/10 text-white hover:bg-[#4a4a4a]"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
          </div>
          
          {/* Referral URL */}
          <div className="space-y-2">
            <p className="text-sm text-white/60">Share your link</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={referralUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-[#2a2a2a] border border-white/10 rounded-md text-white/80 text-sm font-mono"
              />
              <Button
                onClick={copyUrl}
                variant="outline"
                size="sm"
                className="bg-[#3a3a3a] border-white/10 text-white hover:bg-[#4a4a4a]"
              >
                {copiedUrl ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
        
        <Separator className="bg-white/10" />
        
        {/* Share Buttons */}
        <div className="space-y-3">
          <p className="text-sm text-white/60">Share on social media</p>
          <div className="flex gap-2">
            <Button
              onClick={() => share('twitter')}
              variant="outline"
              size="sm"
              className="flex-1 bg-[#2a2a2a] border-white/10 text-white hover:bg-[#3a3a3a]"
            >
              <Twitter className="w-4 h-4 mr-2" />
              Twitter
            </Button>
            <Button
              onClick={() => share('whatsapp')}
              variant="outline"
              size="sm"
              className="flex-1 bg-[#2a2a2a] border-white/10 text-white hover:bg-[#3a3a3a]"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <Button
              onClick={() => share('email')}
              variant="outline"
              size="sm"
              className="flex-1 bg-[#2a2a2a] border-white/10 text-white hover:bg-[#3a3a3a]"
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
          </div>
        </div>
        
        <Separator className="bg-white/10" />
        
        {/* Invite Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-white/60" />
            <span className="text-sm text-white/60">Invites</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              {invitesUsed} used
            </Badge>
            <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
              {invitesRemaining} remaining
            </Badge>
          </div>
        </div>
        
        {/* Info Text */}
        <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
          <p className="text-xs text-emerald-400/80">
            💡 Each friend who joins with your code gives you +1 invite to share
          </p>
        </div>
      </CardContent>
    </Card>
  );
}