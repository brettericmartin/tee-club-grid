import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { WaitlistBanner } from "@/components/waitlist/WaitlistBanner";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";
import { SuccessStates } from "@/components/waitlist/SuccessStates";
import { ReferralLeaderboard } from "@/components/waitlist/ReferralLeaderboard";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import confetti from "canvas-confetti";
import { 
  trackWaitlistView, 
  trackWaitlistSubmit, 
  trackWaitlistApproved,
  trackWaitlistPending,
  trackWaitlistAtCapacity
} from "@/utils/analytics";
import { isLeaderboardEnabled } from "@/services/leaderboardService";
import { submitWaitlistApplication, isDevelopment } from "@/services/waitlistService";

export type WaitlistStatus = 'approved' | 'pending' | 'at_capacity' | 'error';

interface WaitlistResponse {
  status: WaitlistStatus;
  score?: number;
  spotsRemaining?: number;
  message?: string;
}

const WaitlistPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [response, setResponse] = useState<WaitlistResponse | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Capture both invite and referral codes from URL params and track page view
  useEffect(() => {
    // Track page view
    const source = searchParams.get('ref') || searchParams.get('source') || 'direct';
    trackWaitlistView(source);

    // Check for invite code (grants instant access)
    const code = searchParams.get('code') || searchParams.get('invite');
    if (code) {
      setInviteCode(code);
      // Store in localStorage for later use if user signs up
      localStorage.setItem('pending_invite_code', code);
    } else {
      // Check if there's a stored invite code
      const storedCode = localStorage.getItem('pending_invite_code');
      if (storedCode) {
        setInviteCode(storedCode);
      }
    }
    
    // Check for referral code (tracks who referred them)
    const ref = searchParams.get('ref') || searchParams.get('referral');
    if (ref) {
      setReferralCode(ref);
      // Store in localStorage for attribution
      localStorage.setItem('pending_referral_code', ref);
    } else {
      // Check if there's a stored referral code
      const storedRef = localStorage.getItem('pending_referral_code');
      if (storedRef) {
        setReferralCode(storedRef);
      }
    }
  }, [searchParams]);

  // Check if leaderboard is enabled
  useEffect(() => {
    isLeaderboardEnabled().then(setShowLeaderboard);
  }, []);

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      // Add both invite and referral codes if present
      const submitData = {
        ...data,
        invite_code: inviteCode || undefined,
        referral_code: referralCode || undefined
      };

      let result: WaitlistResponse;

      // Temporarily always use local service until API endpoints are fixed
      console.log('[Waitlist] Using direct Supabase service');
      result = await submitWaitlistApplication(submitData);

      setResponse(result);

      // Track submission event with outcome
      trackWaitlistSubmit({
        role: data.role,
        score: result.score,
        hasInviteCode: !!inviteCode,
        city: data.city_region,
        outcome: result.status as 'approved' | 'pending' | 'at_capacity'
      });

      // Trigger confetti for approved status
      if (result.status === 'approved') {
        trackWaitlistApproved(data.email, result.score);
        
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10B981', '#34D399', '#6EE7B7']
        });

        // Clear invite code from localStorage
        localStorage.removeItem('pending_invite_code');

        // If user is signed in, update their profile with display_name
        if (user && profile && data.display_name) {
          // Update profile display_name if needed
          // This would be done via a separate API call or Supabase update
        }
      } else if (result.status === 'pending') {
        trackWaitlistPending(result.score);
      } else if (result.status === 'at_capacity') {
        trackWaitlistAtCapacity({
          spotsFilled: result.spotsRemaining !== undefined ? undefined : undefined,
          cap: undefined
        });
      }
    } catch (error) {
      console.error('Error submitting waitlist form:', error);
      setResponse({
        status: 'error',
        message: 'An error occurred. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuildBag = () => {
    navigate('/my-bag');
  };

  // If already submitted, show success state
  if (response) {
    return (
      <div className="min-h-screen bg-black">
        <WaitlistBanner showApprovals variant="urgent" />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <SuccessStates 
            status={response.status}
            message={response.message}
            spotsRemaining={response.spotsRemaining}
            onBuildBag={handleBuildBag}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Live counter banner */}
      <WaitlistBanner />
      
      {/* Main content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex justify-center mb-6">
            <Badge className="px-4 py-2 text-sm bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              <Trophy className="w-4 h-4 mr-2" />
              Founders Program
            </Badge>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Join the Teed.club Beta
          </h1>
          
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Be among the first to showcase your golf bag, connect with other players, 
            and shape the future of golf equipment discovery.
          </p>
        </motion.div>

        {/* Two column layout */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Form section - wider column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="md:col-span-2"
          >
            <WaitlistForm 
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              userEmail={user?.email}
              inviteCode={inviteCode}
              onInviteCodeChange={setInviteCode}
              referralCode={referralCode}
              onReferralCodeChange={setReferralCode}
            />
          </motion.div>

          {/* Leaderboard section - narrow column */}
          {showLeaderboard && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="md:col-span-1"
            >
              <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-6">
                <ReferralLeaderboard 
                  variant="compact"
                  maxEntries={5}
                  showPeriodSelector={false}
                  showTrends={true}
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WaitlistPage;