import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  UserCheck,
  TrendingUp,
  Mail,
  Database,
  GitBranch,
  BarChart3,
  Clock,
  Hash,
  Share2,
  Bell,
  Rocket,
  Code,
  AlertCircle,
  ChevronRight,
  ArrowRight,
  ExternalLink,
  UserPlus,
  MessageSquare,
  Settings,
  Activity,
  Layers,
  Server
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function BetaInfo() {
  const navigate = useNavigate();
  const [liveStats, setLiveStats] = useState<{
    capacity: number;
    approved: number;
    pending: number;
    remaining: number;
  } | null>(null);

  useEffect(() => {
    fetchLiveStats();
    const interval = setInterval(fetchLiveStats, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchLiveStats = async () => {
    try {
      const response = await fetch('/api/beta/summary');
      if (response.ok) {
        const data = await response.json();
        setLiveStats({
          capacity: data.cap || 150,
          approved: data.approved || 0,
          pending: data.pending || 0,
          remaining: (data.cap || 150) - (data.approved || 0)
        });
      }
    } catch (error) {
      console.error('Error fetching beta stats:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Button
            variant="ghost"
            className="text-white/70 hover:text-white"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            variant="outline"
            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            onClick={() => navigate('/waitlist')}
          >
            Apply Now
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <Badge className="mb-4 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border-emerald-500/30 text-emerald-400">
              <Sparkles className="mr-1 h-3 w-3" />
              Exclusive Founders Program
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              Teed.club Beta System
            </h1>
            <p className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto mb-8">
              A demand-driven waitlist that rewards engagement and social sharing. 
              Join as a founding member to shape the future of golf equipment discovery.
            </p>
            
            {/* Live Stats Bar */}
            {liveStats && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-white/60 uppercase tracking-wide">Capacity</p>
                        <p className="text-2xl font-bold text-white">
                          {Math.round((liveStats.approved / liveStats.capacity) * 100)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-emerald-400">{liveStats.approved}</p>
                        <p className="text-xs text-white/40">of {liveStats.capacity}</p>
                      </div>
                    </div>
                    <Progress 
                      value={(liveStats.approved / liveStats.capacity) * 100} 
                      className="h-1.5 mt-3 bg-white/10"
                    />
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-600/5 border-yellow-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-white/60 uppercase tracking-wide">Remaining</p>
                        <p className="text-2xl font-bold text-white">
                          {liveStats.remaining}
                        </p>
                      </div>
                      <Activity className="h-8 w-8 text-yellow-400" />
                    </div>
                    <p className="text-xs text-white/40 mt-2">
                      {liveStats.remaining === 0 ? 'Join the waitlist' : 'Spots available'}
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-blue-500/10 to-purple-600/5 border-blue-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-white/60 uppercase tracking-wide">Queue</p>
                        <p className="text-2xl font-bold text-white">
                          {liveStats.pending}
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-blue-400" />
                    </div>
                    <p className="text-xs text-white/40 mt-2">Applications pending</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 pb-20">
        <Tabs defaultValue="journey" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full bg-black/50 border border-white/10 p-1">
            <TabsTrigger value="journey" className="data-[state=active]:bg-emerald-500/20">
              <Rocket className="mr-2 h-4 w-4" />
              Journey
            </TabsTrigger>
            <TabsTrigger value="scoring" className="data-[state=active]:bg-emerald-500/20">
              <Target className="mr-2 h-4 w-4" />
              Scoring
            </TabsTrigger>
            <TabsTrigger value="referrals" className="data-[state=active]:bg-emerald-500/20">
              <Share2 className="mr-2 h-4 w-4" />
              Referrals
            </TabsTrigger>
            <TabsTrigger value="system" className="data-[state=active]:bg-emerald-500/20">
              <Database className="mr-2 h-4 w-4" />
              System
            </TabsTrigger>
            <TabsTrigger value="rewards" className="data-[state=active]:bg-emerald-500/20">
              <Gift className="mr-2 h-4 w-4" />
              Rewards
            </TabsTrigger>
          </TabsList>

          {/* User Journey Tab */}
          <TabsContent value="journey" className="mt-6 space-y-6">
            <Card className="bg-black/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-2xl text-white flex items-center">
                  <Rocket className="mr-3 h-6 w-6 text-emerald-400" />
                  Your Path to Beta Access
                </CardTitle>
                <CardDescription className="text-white/60">
                  From application to becoming a founding member
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Journey Steps */}
                <div className="relative">
                  {/* Vertical Line */}
                  <div className="absolute left-6 top-8 bottom-0 w-0.5 bg-gradient-to-b from-emerald-500 to-blue-500" />
                  
                  <div className="space-y-8">
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="flex gap-4"
                    >
                      <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white">
                        <UserPlus className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-white mb-2">1. Discovery & Application</h4>
                        <p className="text-white/70 mb-3">
                          Land on waitlist from marketing or referral link. Complete multi-step form about your golf habits and equipment interests.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-white/60 border-white/20">
                            Referral code captured
                          </Badge>
                          <Badge variant="outline" className="text-white/60 border-white/20">
                            Score calculated (0-100)
                          </Badge>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex gap-4"
                    >
                      <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-white mb-2">2. Pending & Engagement</h4>
                        <p className="text-white/70 mb-3">
                          Receive confirmation with queue position. Get unique referral code. Jump the queue through social actions.
                        </p>
                        <div className="bg-white/5 rounded-lg p-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Share referral link</span>
                            <span className="text-emerald-400">+5 spots per signup</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Complete profile</span>
                            <span className="text-emerald-400">+10 spots</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Add equipment</span>
                            <span className="text-emerald-400">+5 spots</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex gap-4"
                    >
                      <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-purple-500 text-white">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-white mb-2">3. Approval & Activation</h4>
                        <p className="text-white/70 mb-3">
                          Auto-approval if score ≥ 4, or manual wave approval. Receive welcome email with access instructions.
                        </p>
                        <Alert className="border-emerald-500/30 bg-emerald-500/10">
                          <Sparkles className="h-4 w-4 text-emerald-400" />
                          <AlertDescription className="text-white/80">
                            Instant approval with high score + available capacity!
                          </AlertDescription>
                        </Alert>
                      </div>
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="flex gap-4"
                    >
                      <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 text-white">
                        <Trophy className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-white mb-2">4. Beta User → Advocate</h4>
                        <p className="text-white/70 mb-3">
                          Access "My Invites" dashboard. Generate custom codes. Track referrals and climb the leaderboard.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white/5 rounded p-2 text-center">
                            <Gift className="h-5 w-5 text-purple-400 mx-auto mb-1" />
                            <p className="text-xs text-white/60">3 invite codes</p>
                          </div>
                          <div className="bg-white/5 rounded p-2 text-center">
                            <Award className="h-5 w-5 text-yellow-400 mx-auto mb-1" />
                            <p className="text-xs text-white/60">Founder badge</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scoring Tab */}
          <TabsContent value="scoring" className="mt-6 space-y-6">
            <Card className="bg-black/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-2xl text-white flex items-center">
                  <Target className="mr-3 h-6 w-6 text-emerald-400" />
                  Application Scoring System
                </CardTitle>
                <CardDescription className="text-white/60">
                  How we calculate your priority score (0-100 points)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-6 border-emerald-500/30 bg-emerald-500/10">
                  <Target className="h-4 w-4 text-emerald-400" />
                  <AlertDescription className="text-white/80">
                    <strong>Auto-approval threshold: 4+ points</strong> with available capacity
                  </AlertDescription>
                </Alert>

                <div className="space-y-6">
                  {/* Role Scoring */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                      <UserCheck className="mr-2 h-5 w-5 text-blue-400" />
                      Your Role in Golf (0-3 points)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-white/5 rounded-lg p-3 flex justify-between items-center">
                        <span className="text-white/70">Fitter/Builder</span>
                        <Badge className="bg-emerald-500/20 text-emerald-400">3 pts</Badge>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 flex justify-between items-center">
                        <span className="text-white/70">Content Creator</span>
                        <Badge className="bg-blue-500/20 text-blue-400">2 pts</Badge>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 flex justify-between items-center">
                        <span className="text-white/70">League Captain</span>
                        <Badge className="bg-purple-500/20 text-purple-400">1 pt</Badge>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 flex justify-between items-center">
                        <span className="text-white/70">Golfer/Other</span>
                        <Badge className="bg-gray-500/20 text-gray-400">0 pts</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Engagement Scoring */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                      <Activity className="mr-2 h-5 w-5 text-purple-400" />
                      Engagement Bonuses
                    </h4>
                    <div className="space-y-2">
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-white/70">Profile Completion</span>
                          <Badge variant="outline" className="text-white/60">+1 pt</Badge>
                        </div>
                        <Progress value={80} className="h-1.5 bg-white/10" />
                        <p className="text-xs text-white/40 mt-1">80% threshold required</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-white/70">Equipment Engagement</span>
                          <Badge variant="outline" className="text-white/60">+1-2 pts</Badge>
                        </div>
                        <p className="text-xs text-white/40">First item +1, Multiple items +2</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-white/70">Referral Code Used</span>
                          <Badge variant="outline" className="text-white/60">+1 pt</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Score Distribution */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">Current Distribution</h4>
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-white/60">Score 0-3</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-white/10 rounded-full h-2">
                              <div className="bg-red-500 h-2 rounded-full" style={{width: '45%'}} />
                            </div>
                            <span className="text-white/40 text-sm">45%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/60">Score 4-6</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-white/10 rounded-full h-2">
                              <div className="bg-yellow-500 h-2 rounded-full" style={{width: '35%'}} />
                            </div>
                            <span className="text-white/40 text-sm">35%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/60">Score 7+</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-white/10 rounded-full h-2">
                              <div className="bg-emerald-500 h-2 rounded-full" style={{width: '20%'}} />
                            </div>
                            <span className="text-white/40 text-sm">20%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals" className="mt-6 space-y-6">
            <Card className="bg-black/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-2xl text-white flex items-center">
                  <Share2 className="mr-3 h-6 w-6 text-emerald-400" />
                  Referral System Mechanics
                </CardTitle>
                <CardDescription className="text-white/60">
                  How referrals work and what you earn
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Referral Flow */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Attribution Flow</h4>
                  <div className="bg-white/5 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                        1
                      </div>
                      <p className="text-white/70">Share your link: <code className="text-emerald-400">teed.club/waitlist?ref=YOUR_CODE</code></p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                        2
                      </div>
                      <p className="text-white/70">Friend visits and code is stored in browser</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                        3
                      </div>
                      <p className="text-white/70">On signup, you're linked as referrer</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                        4
                      </div>
                      <p className="text-white/70">You receive notification and rewards</p>
                    </div>
                  </div>
                </div>

                {/* Rewards */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Referral Rewards</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="p-4">
                        <TrendingUp className="h-6 w-6 text-emerald-400 mb-2" />
                        <h5 className="font-semibold text-white mb-1">Queue Jump</h5>
                        <p className="text-sm text-white/60">+5 positions per successful referral</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="p-4">
                        <Gift className="h-6 w-6 text-purple-400 mb-2" />
                        <h5 className="font-semibold text-white mb-1">Bonus Invites</h5>
                        <p className="text-sm text-white/60">+1 invite per 3 referrals</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="p-4">
                        <Award className="h-6 w-6 text-yellow-400 mb-2" />
                        <h5 className="font-semibold text-white mb-1">Achievements</h5>
                        <p className="text-sm text-white/60">Unlock badges at milestones</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="p-4">
                        <Trophy className="h-6 w-6 text-blue-400 mb-2" />
                        <h5 className="font-semibold text-white mb-1">Leaderboard</h5>
                        <p className="text-sm text-white/60">Compete for top referrer status</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Milestones */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Milestone Badges</h4>
                  <div className="space-y-2">
                    <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Star className="h-5 w-5 text-yellow-400" />
                        <span className="text-white/80">Rising Star</span>
                      </div>
                      <Badge variant="outline" className="text-white/60">3 referrals</Badge>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-blue-400" />
                        <span className="text-white/80">Community Builder</span>
                      </div>
                      <Badge variant="outline" className="text-white/60">10 referrals</Badge>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Trophy className="h-5 w-5 text-purple-400" />
                        <span className="text-white/80">Ambassador</span>
                      </div>
                      <Badge variant="outline" className="text-white/60">25 referrals</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="mt-6 space-y-6">
            <Card className="bg-black/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-2xl text-white flex items-center">
                  <Database className="mr-3 h-6 w-6 text-emerald-400" />
                  System Architecture
                </CardTitle>
                <CardDescription className="text-white/60">
                  Technical implementation details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* API Endpoints */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                    <Server className="mr-2 h-5 w-5 text-blue-400" />
                    API Endpoints
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 text-white/60">Endpoint</th>
                          <th className="text-left py-2 text-white/60">Auth</th>
                          <th className="text-left py-2 text-white/60">Purpose</th>
                        </tr>
                      </thead>
                      <tbody className="text-white/70">
                        <tr className="border-b border-white/5">
                          <td className="py-2"><code className="text-emerald-400">/api/waitlist/submit</code></td>
                          <td className="py-2">Public</td>
                          <td className="py-2">Submit application</td>
                        </tr>
                        <tr className="border-b border-white/5">
                          <td className="py-2"><code className="text-emerald-400">/api/beta/summary</code></td>
                          <td className="py-2">Public</td>
                          <td className="py-2">Live capacity stats</td>
                        </tr>
                        <tr className="border-b border-white/5">
                          <td className="py-2"><code className="text-emerald-400">/api/invites/generate</code></td>
                          <td className="py-2">Auth</td>
                          <td className="py-2">Create invite codes</td>
                        </tr>
                        <tr className="border-b border-white/5">
                          <td className="py-2"><code className="text-emerald-400">/api/referrals/leaderboard</code></td>
                          <td className="py-2">Public</td>
                          <td className="py-2">Top referrers</td>
                        </tr>
                        <tr className="border-b border-white/5">
                          <td className="py-2"><code className="text-emerald-400">/api/waitlist/bulk-approve</code></td>
                          <td className="py-2">Admin</td>
                          <td className="py-2">Wave approvals</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Email System */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                    <Mail className="mr-2 h-5 w-5 text-purple-400" />
                    Email Notifications
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-lg p-3">
                      <Bell className="h-4 w-4 text-yellow-400 mb-1" />
                      <p className="text-sm font-medium text-white">Confirmation</p>
                      <p className="text-xs text-white/50">Position & referral link</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <Bell className="h-4 w-4 text-green-400 mb-1" />
                      <p className="text-sm font-medium text-white">Approval</p>
                      <p className="text-xs text-white/50">Welcome & invites</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <Bell className="h-4 w-4 text-blue-400 mb-1" />
                      <p className="text-sm font-medium text-white">Movement</p>
                      <p className="text-xs text-white/50">Queue position updates</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <Bell className="h-4 w-4 text-purple-400 mb-1" />
                      <p className="text-sm font-medium text-white">Milestone</p>
                      <p className="text-xs text-white/50">Achievement unlocked</p>
                    </div>
                  </div>
                </div>

                {/* Analytics Events */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5 text-orange-400" />
                    Tracked Analytics
                  </h4>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      <Badge variant="outline" className="justify-center">waitlist_viewed</Badge>
                      <Badge variant="outline" className="justify-center">waitlist_submitted</Badge>
                      <Badge variant="outline" className="justify-center">referral_visit</Badge>
                      <Badge variant="outline" className="justify-center">referral_signup</Badge>
                      <Badge variant="outline" className="justify-center">beta_approved</Badge>
                      <Badge variant="outline" className="justify-center">first_login</Badge>
                      <Badge variant="outline" className="justify-center">bag_created</Badge>
                      <Badge variant="outline" className="justify-center">invite_generated</Badge>
                      <Badge variant="outline" className="justify-center">queue_jump</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPIs Card */}
            <Card className="bg-black/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center">
                  <Activity className="mr-3 h-5 w-5 text-emerald-400" />
                  Key Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-400">0.7</p>
                    <p className="text-xs text-white/60">K-Factor</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-400">52%</p>
                    <p className="text-xs text-white/60">Invite Accept</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-400">75%</p>
                    <p className="text-xs text-white/60">48hr Activation</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-400">43%</p>
                    <p className="text-xs text-white/60">From Referrals</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="mt-6 space-y-6">
            <Card className="bg-black/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-2xl text-white flex items-center">
                  <Gift className="mr-3 h-6 w-6 text-emerald-400" />
                  Beta Member Benefits
                </CardTitle>
                <CardDescription className="text-white/60">
                  What you get as a founding member
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border-yellow-500/20">
                    <CardContent className="p-4">
                      <Award className="h-8 w-8 text-yellow-400 mb-3" />
                      <h4 className="font-semibold text-white mb-2">Permanent Founder Badge</h4>
                      <p className="text-sm text-white/70">
                        Forever marked as an original member who helped shape the platform.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 border-purple-500/20">
                    <CardContent className="p-4">
                      <Users className="h-8 w-8 text-purple-400 mb-3" />
                      <h4 className="font-semibold text-white mb-2">3 VIP Invite Codes</h4>
                      <p className="text-sm text-white/70">
                        Guaranteed access for your golf buddies. Skip their waitlist entirely.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/20">
                    <CardContent className="p-4">
                      <MessageSquare className="h-8 w-8 text-blue-400 mb-3" />
                      <h4 className="font-semibold text-white mb-2">Direct Team Access</h4>
                      <p className="text-sm text-white/70">
                        Your feedback shapes features. Direct line to founders for input.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/5 border-emerald-500/20">
                    <CardContent className="p-4">
                      <Sparkles className="h-8 w-8 text-emerald-400 mb-3" />
                      <h4 className="font-semibold text-white mb-2">Early Feature Access</h4>
                      <p className="text-sm text-white/70">
                        Test new features first. Be part of the development process.
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Separator className="my-6 bg-white/10" />

                {/* Future Perks */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Future Founder Perks</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-3 text-white/70">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      <span>Priority support response times</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/70">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      <span>Exclusive founder-only events and tournaments</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/70">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      <span>Revenue sharing on affiliate commissions</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/70">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      <span>Custom profile themes and badges</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="bg-black/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center">
                  <Clock className="mr-3 h-5 w-5 text-emerald-400" />
                  Development Timeline
                </CardTitle>
                <CardDescription className="text-white/60">
                  12 completed implementation phases
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-white/80">Phase 1:</span>
                      <span className="text-white/60 ml-2">System audit and gap analysis</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-white/80">Phase 2:</span>
                      <span className="text-white/60 ml-2">Referral code generation system</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-white/80">Phase 3:</span>
                      <span className="text-white/60 ml-2">BetaGuard route protection</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-white/80">Phase 4:</span>
                      <span className="text-white/60 ml-2">My Invites dashboard</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-white/80">Phase 5:</span>
                      <span className="text-white/60 ml-2">Queue position display</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-white/80">Phase 6:</span>
                      <span className="text-white/60 ml-2">Referral attribution tracking</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-white/80">Phase 7:</span>
                      <span className="text-white/60 ml-2">Public stats page</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-white/80">Phase 8:</span>
                      <span className="text-white/60 ml-2">Email notification system</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-white/80">Phase 9:</span>
                      <span className="text-white/60 ml-2">Admin bulk operations</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-white/80">Phase 10:</span>
                      <span className="text-white/60 ml-2">Analytics instrumentation</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-white/80">Phase 11:</span>
                      <span className="text-white/60 ml-2">Configurable scoring engine</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-white/80">Phase 12:</span>
                      <span className="text-white/60 ml-2">Rollout documentation & monitoring</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12"
        >
          <Card className="bg-gradient-to-br from-emerald-500/20 via-blue-500/10 to-purple-500/20 border-emerald-500/30">
            <CardContent className="p-8 text-center">
              <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to Join the Founders?
              </h2>
              <p className="text-white/80 mb-6 max-w-2xl mx-auto">
                Be part of building something special. Apply now for beta access and help shape 
                the future of golf equipment discovery. Limited spots available.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
                  onClick={() => navigate('/waitlist')}
                >
                  Apply for Beta Access
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => window.open('https://github.com/teedclub/docs', '_blank')}
                >
                  <Code className="mr-2 h-5 w-5" />
                  View Documentation
                </Button>
              </div>
              
              {liveStats && liveStats.remaining > 0 && (
                <p className="mt-6 text-sm text-yellow-400">
                  ⚡ Only {liveStats.remaining} spots remaining at current capacity
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}