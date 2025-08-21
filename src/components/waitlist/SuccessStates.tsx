import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Clock, 
  Users, 
  AlertCircle, 
  Trophy, 
  Share2, 
  Copy,
  ArrowRight
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import type { WaitlistStatus } from "@/pages/Waitlist";

interface SuccessStatesProps {
  status: WaitlistStatus;
  message?: string;
  spotsRemaining?: number;
  onBuildBag: () => void;
}

export function SuccessStates({ 
  status, 
  message, 
  spotsRemaining,
  onBuildBag 
}: SuccessStatesProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  // Generate referral link (in production, this would come from the API)
  const referralLink = `${window.location.origin}/waitlist?ref=${Math.random().toString(36).substring(7)}`;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({
      title: "Link copied!",
      description: "Share with friends to move up the waitlist",
    });
    setTimeout(() => setCopied(false), 3000);
  };

  if (status === 'approved') {
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center space-y-6"
      >
        <div className="flex justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-30 animate-pulse" />
              <CheckCircle2 className="w-24 h-24 text-emerald-500 relative" />
            </div>
          </motion.div>
        </div>

        <div className="space-y-4">
          <h2 className="text-4xl font-bold text-white">
            Welcome to Teed.club! 🎉
          </h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            {message || "You've been approved for beta access. Let's build your first bag!"}
          </p>
        </div>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border-emerald-500/20">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <Badge className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                <Trophy className="w-4 h-4 mr-2" />
                Founding Member
              </Badge>
            </div>
            <CardTitle className="text-white">Your Beta Access Includes:</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-left max-w-md mx-auto">
              <li className="flex items-start gap-2 text-white/80">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Full access to all platform features</span>
              </li>
              <li className="flex items-start gap-2 text-white/80">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Founding member badge on your profile</span>
              </li>
              <li className="flex items-start gap-2 text-white/80">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>3 invite codes to share with friends</span>
              </li>
              <li className="flex items-start gap-2 text-white/80">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>Direct input on new features</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Button
          onClick={onBuildBag}
          size="lg"
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-6 text-lg"
        >
          Build My Bag
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </motion.div>
    );
  }

  if (status === 'pending') {
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center space-y-6"
      >
        <div className="flex justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-500 blur-2xl opacity-20 animate-pulse" />
              <Clock className="w-24 h-24 text-yellow-500 relative" />
            </div>
          </motion.div>
        </div>

        <div className="space-y-4">
          <h2 className="text-4xl font-bold text-white">
            You're on the Waitlist!
          </h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            {message || "We'll notify you as soon as a spot opens up."}
          </p>
          {spotsRemaining !== undefined && spotsRemaining > 0 && (
            <Badge className="px-4 py-2 bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
              {spotsRemaining} spots remaining
            </Badge>
          )}
        </div>

        <Card className="bg-[#1a1a1a] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Move Up the Waitlist</CardTitle>
            <CardDescription className="text-white/60">
              Share your referral link to improve your chances
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-md text-white/60 text-sm"
                />
              </div>
              <Button
                onClick={copyReferralLink}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => {
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just joined the @TeedClub waitlist! Check out this new platform for golf equipment discovery 🏌️‍♂️ ${referralLink}`)}`, '_blank');
                }}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share on X
              </Button>
            </div>

            <div className="pt-4 border-t border-white/10">
              <p className="text-sm text-white/40">
                Each successful referral improves your position. We're approving new members daily!
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (status === 'at_capacity') {
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center space-y-6"
      >
        <div className="flex justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-orange-500 blur-2xl opacity-20 animate-pulse" />
              <Users className="w-24 h-24 text-orange-500 relative" />
            </div>
          </motion.div>
        </div>

        <div className="space-y-4">
          <h2 className="text-4xl font-bold text-white">
            Beta is Currently Full
          </h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            {message || "We've reached capacity, but you're on the list for the next wave!"}
          </p>
          <Badge className="px-4 py-2 bg-orange-500/10 text-orange-500 border-orange-500/20">
            At Capacity
          </Badge>
        </div>

        <Card className="bg-[#1a1a1a] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">What Happens Next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3 text-left max-w-md mx-auto">
              <li className="flex items-start gap-2 text-white/80">
                <CheckCircle2 className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <span>We'll email you when spots open up</span>
              </li>
              <li className="flex items-start gap-2 text-white/80">
                <CheckCircle2 className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <span>Your application is saved and prioritized</span>
              </li>
              <li className="flex items-start gap-2 text-white/80">
                <CheckCircle2 className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <span>Follow us for updates and early access opportunities</span>
              </li>
            </ul>

            <div className="pt-4 border-t border-white/10">
              <p className="text-sm text-white/40">
                We're expanding capacity weekly. Thanks for your patience!
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Error state
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="text-center space-y-6"
    >
      <div className="flex justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 10 }}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-red-500 blur-2xl opacity-20 animate-pulse" />
            <AlertCircle className="w-24 h-24 text-red-500 relative" />
          </div>
        </motion.div>
      </div>

      <div className="space-y-4">
        <h2 className="text-4xl font-bold text-white">
          Something Went Wrong
        </h2>
        <p className="text-xl text-white/60 max-w-2xl mx-auto">
          {message || "We encountered an error. Please try again or contact support."}
        </p>
      </div>

      <Card className="bg-[#1a1a1a] border-white/10">
        <CardContent className="pt-6">
          <Button
            onClick={() => window.location.reload()}
            className="bg-white/10 hover:bg-white/20 text-white"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}