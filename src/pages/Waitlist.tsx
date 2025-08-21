import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { WaitlistBanner } from "@/components/waitlist/WaitlistBanner";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";
import { SuccessStates } from "@/components/waitlist/SuccessStates";
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

  // Capture invite code from URL params and track page view
  useEffect(() => {
    // Track page view
    const source = searchParams.get('ref') || searchParams.get('source') || 'direct';
    trackWaitlistView(source);

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
  }, [searchParams]);

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      // Add invite code if present
      const submitData = {
        ...data,
        invite_code: inviteCode || undefined
      };

      const res = await fetch('/api/waitlist/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      // Check if response is ok and has content
      if (!res.ok) {
        // Try to get error message from response
        let errorMessage = 'An error occurred. Please try again.';
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If response is not JSON (like 404 HTML), use default message
          if (res.status === 404) {
            // In development, use mock response
            if (import.meta.env.DEV) {
              console.log('[Dev Mode] Using mock waitlist response');
              const mockResult = {
                status: 'pending' as const,
                score: 75,
                spotsRemaining: 50,
                message: 'Thank you for your interest! (Development mode - not saved)'
              };
              setResponse(mockResult);
              
              // Track mock submission
              trackWaitlistSubmit({
                role: data.role,
                cityRegion: data.city_region,
                score: mockResult.score,
                status: mockResult.status
              });
              trackWaitlistPending(mockResult.score);
              return;
            }
            errorMessage = 'Waitlist service not available. Please try again later.';
          }
        }
        throw new Error(errorMessage);
      }

      // Check if response has content
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response from server');
      }

      const result = await res.json();
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
        <WaitlistBanner />
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

        {/* Form section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <WaitlistForm 
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            userEmail={user?.email}
            inviteCode={inviteCode}
            onInviteCodeChange={setInviteCode}
          />
        </motion.div>
      </div>
    </div>
  );
};

export default WaitlistPage;