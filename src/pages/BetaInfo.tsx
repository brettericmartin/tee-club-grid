import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Trophy, 
  Users, 
  Shield, 
  Sparkles, 
  CheckCircle2,
  Star,
  Gift,
  Lock,
  Zap,
  Target,
  Award,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function BetaInfo() {
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            className="text-white/70 hover:text-white"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge className="mb-4 bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
              <Sparkles className="mr-1 h-3 w-3" />
              Limited Beta Access
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              How the Teed.club Beta Works
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              We're building something special, and we want the right people to help shape it. 
              Here's everything you need to know about joining our beta.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 pb-20">
        
        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          <Card className="bg-white/5 border-white/10 p-4 text-center">
            <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">150</div>
            <div className="text-sm text-white/60">Beta Spots</div>
          </Card>
          <Card className="bg-white/5 border-white/10 p-4 text-center">
            <Target className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">4+</div>
            <div className="text-sm text-white/60">Auto-Approval Score</div>
          </Card>
          <Card className="bg-white/5 border-white/10 p-4 text-center">
            <Gift className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">3</div>
            <div className="text-sm text-white/60">Invites Per Member</div>
          </Card>
          <Card className="bg-white/5 border-white/10 p-4 text-center">
            <Award className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">∞</div>
            <div className="text-sm text-white/60">Founder Status</div>
          </Card>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
            <Zap className="mr-3 h-8 w-8 text-emerald-500" />
            How Beta Access Works
          </h2>
          
          <div className="space-y-4">
            <Card className="bg-white/5 border-white/10 p-6">
              <h3 className="text-xl font-semibold text-white mb-3">1. Apply for Access</h3>
              <p className="text-white/70 mb-4">
                Fill out our application form. We ask about your golf habits, how you discover and share equipment, 
                and what you're looking for in a golf community.
              </p>
              <Button 
                onClick={() => navigate('/waitlist')}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                Apply Now
              </Button>
            </Card>

            <Card className="bg-white/5 border-white/10 p-6">
              <h3 className="text-xl font-semibold text-white mb-3">2. Automatic Scoring</h3>
              <p className="text-white/70">
                Your application is automatically scored from 0-15 points based on your responses. 
                We're looking for engaged golfers who will contribute to the community.
              </p>
            </Card>

            <Card className="bg-white/5 border-white/10 p-6">
              <h3 className="text-xl font-semibold text-white mb-3">3. Instant Approval (Score 4+)</h3>
              <p className="text-white/70">
                If you score 4 or higher and we have capacity, you're instantly approved! 
                You'll get immediate access to build your bag and 3 invite codes to share.
              </p>
            </Card>

            <Card className="bg-white/5 border-white/10 p-6">
              <h3 className="text-xl font-semibold text-white mb-3">4. Manual Review</h3>
              <p className="text-white/70">
                Applications below the threshold or submitted when we're at capacity go to our waitlist. 
                We review these manually and approve new members as spots open up.
              </p>
            </Card>
          </div>
        </motion.div>

        {/* Scoring System */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
            <Target className="mr-3 h-8 w-8 text-emerald-500" />
            Scoring System Breakdown
          </h2>
          
          <Card className="bg-white/5 border-white/10 p-6">
            <p className="text-white/70 mb-6">
              Maximum possible score: <span className="text-white font-bold">15 points</span>. 
              Auto-approval threshold: <span className="text-emerald-400 font-bold">4+ points</span>.
            </p>

            <div className="space-y-6">
              {/* Role Points */}
              <div>
                <h4 className="text-white font-semibold mb-3 flex items-center">
                  <UserCheck className="mr-2 h-5 w-5 text-blue-400" />
                  Your Role (0-3 points)
                </h4>
                <div className="space-y-2 ml-7">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Club Fitter/Builder</span>
                    <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">3 pts</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Content Creator</span>
                    <Badge variant="outline" className="text-blue-400 border-blue-400/30">2 pts</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">League Captain</span>
                    <Badge variant="outline" className="text-purple-400 border-purple-400/30">1 pt</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Golfer/Retailer/Other</span>
                    <Badge variant="outline" className="text-white/40 border-white/20">0 pts</Badge>
                  </div>
                </div>
              </div>

              {/* Share Channels */}
              <div>
                <h4 className="text-white font-semibold mb-3 flex items-center">
                  <Users className="mr-2 h-5 w-5 text-purple-400" />
                  Where You Share (0-2 points, capped)
                </h4>
                <div className="space-y-2 ml-7">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Reddit r/golf</span>
                    <Badge variant="outline" className="text-white/60 border-white/30">1 pt</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">GolfWRX Forums</span>
                    <Badge variant="outline" className="text-white/60 border-white/30">1 pt</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Instagram/TikTok/YouTube</span>
                    <Badge variant="outline" className="text-white/60 border-white/30">1 pt</Badge>
                  </div>
                </div>
              </div>

              {/* Learn Channels */}
              <div>
                <h4 className="text-white font-semibold mb-3 flex items-center">
                  <Star className="mr-2 h-5 w-5 text-yellow-400" />
                  How You Learn (0-3 points, capped)
                </h4>
                <div className="space-y-2 ml-7 text-sm text-white/70">
                  <div>YouTube reviews, Reddit discussions, Fitter recommendations, Brand sites</div>
                  <div className="text-white/50">Each source: 1 point (max 3)</div>
                </div>
              </div>

              {/* Platform Uses */}
              <div>
                <h4 className="text-white font-semibold mb-3 flex items-center">
                  <CheckCircle2 className="mr-2 h-5 w-5 text-green-400" />
                  Platform Uses (0-2 points, capped)
                </h4>
                <div className="space-y-2 ml-7 text-sm text-white/70">
                  <div>Deep-dive research, Follow friends, Track builds</div>
                  <div className="text-white/50">Each use: 1 point (max 2)</div>
                </div>
              </div>

              {/* Frequency Bonuses */}
              <div>
                <h4 className="text-white font-semibold mb-3 flex items-center">
                  <Zap className="mr-2 h-5 w-5 text-orange-400" />
                  Activity Bonuses
                </h4>
                <div className="space-y-2 ml-7 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/70">Buy equipment weekly+</span>
                    <Badge variant="outline" className="text-white/60 border-white/30">2 pts</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Share setups weekly+</span>
                    <Badge variant="outline" className="text-white/60 border-white/30">2 pts</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Major city location</span>
                    <Badge variant="outline" className="text-white/60 border-white/30">1 pt</Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* What You Get */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
            <Gift className="mr-3 h-8 w-8 text-emerald-500" />
            Beta Member Benefits
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-white/5 border-white/10 p-6">
              <Award className="h-8 w-8 text-yellow-500 mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Founder Badge</h3>
              <p className="text-white/70 text-sm">
                Permanent founder status visible on your profile. You were here first.
              </p>
            </Card>

            <Card className="bg-white/5 border-white/10 p-6">
              <Users className="h-8 w-8 text-purple-500 mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">3 Invite Codes</h3>
              <p className="text-white/70 text-sm">
                Bring your golf buddies. Each beta member gets 3 codes for guaranteed access.
              </p>
            </Card>

            <Card className="bg-white/5 border-white/10 p-6">
              <Shield className="h-8 w-8 text-blue-500 mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Shape the Platform</h3>
              <p className="text-white/70 text-sm">
                Your feedback directly influences features and direction. You're not just a user, you're a co-creator.
              </p>
            </Card>

            <Card className="bg-white/5 border-white/10 p-6">
              <Sparkles className="h-8 w-8 text-emerald-500 mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Early Access</h3>
              <p className="text-white/70 text-sm">
                Get new features first. Test and provide feedback before public release.
              </p>
            </Card>
          </div>
        </motion.div>

        {/* Admin Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
            <Lock className="mr-3 h-8 w-8 text-emerald-500" />
            Behind the Scenes
          </h2>
          
          <Card className="bg-white/5 border-white/10 p-6">
            <p className="text-white/70 mb-4">
              Our admin team has access to powerful tools to manage the beta:
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium">Application Review Dashboard</span>
                  <p className="text-white/60 text-sm mt-1">
                    View all applications with scores, answers, and application date at <code className="text-emerald-400">/admin/waitlist</code>
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium">Manual Approval/Rejection</span>
                  <p className="text-white/60 text-sm mt-1">
                    Override automatic decisions for edge cases or special circumstances
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium">Capacity Management</span>
                  <p className="text-white/60 text-sm mt-1">
                    Adjust beta capacity limits dynamically as infrastructure scales
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium">Invite Code Generation</span>
                  <p className="text-white/60 text-sm mt-1">
                    Create special invite codes for partners, influencers, or VIPs
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-white font-medium">Analytics & Insights</span>
                  <p className="text-white/60 text-sm mt-1">
                    Track application trends, user engagement, and community growth
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-center"
        >
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border-emerald-500/20 p-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Join the Beta?
            </h2>
            <p className="text-white/80 mb-6 max-w-2xl mx-auto">
              We're looking for passionate golfers who want to be part of building something special. 
              Apply now and help shape the future of golf equipment discovery.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={() => navigate('/waitlist')}
              >
                Apply for Beta Access
                <ArrowLeft className="ml-2 h-5 w-5 rotate-180" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => navigate('/')}
              >
                Back to Home
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}