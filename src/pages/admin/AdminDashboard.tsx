import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRequireAdmin } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Users, 
  Database, 
  Settings, 
  FileText,
  Terminal,
  BarChart3,
  Mail,
  Key,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Copy,
  RefreshCw,
  Wrench,
  UserCheck,
  Image,
  MessageSquare,
  TrendingUp,
  Clock,
  Gift,
  UserPlus,
  UserX,
  Trophy,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminStats {
  totalUsers: number;
  betaUsers: number;
  adminUsers: number;
  pendingApplications: number;
  totalEquipment: number;
  totalBags: number;
  forumThreads: number;
  feedPosts: number;
  betaCap: number;
  spotsRemaining: number;
  approvedApplications: number;
  rejectedApplications: number;
}

interface WaitlistApplication {
  id: string;
  email: string;
  display_name: string;
  city_region: string;
  score: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approved_at?: string;
  answers?: any;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { isAuthorized, isLoading: adminLoading } = useRequireAdmin();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [waitlistApplications, setWaitlistApplications] = useState<WaitlistApplication[]>([]);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    if (isAuthorized) {
      fetchStats();
    }
  }, [isAuthorized]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch various stats including beta-specific ones
      const [
        { count: totalUsers },
        { count: betaUsers },
        { count: adminUsers },
        { count: pendingApplications },
        { count: approvedApplications },
        { count: rejectedApplications },
        { count: totalEquipment },
        { count: totalBags },
        { count: forumThreads },
        { count: feedPosts },
        { data: featureFlags },
        { data: recentApps }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('beta_access', true).is('deleted_at', null),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_admin', true),
        supabase.from('waitlist_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('waitlist_applications').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('waitlist_applications').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabase.from('equipment').select('*', { count: 'exact', head: true }),
        supabase.from('user_bags').select('*', { count: 'exact', head: true }),
        supabase.from('forum_threads').select('*', { count: 'exact', head: true }),
        supabase.from('feed_posts').select('*', { count: 'exact', head: true }),
        supabase.from('feature_flags').select('*').eq('id', 1).single(),
        supabase.from('waitlist_applications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      const betaCap = featureFlags?.beta_cap || 150;
      const spotsRemaining = Math.max(0, betaCap - (betaUsers || 0));

      setStats({
        totalUsers: totalUsers || 0,
        betaUsers: betaUsers || 0,
        adminUsers: adminUsers || 0,
        pendingApplications: pendingApplications || 0,
        approvedApplications: approvedApplications || 0,
        rejectedApplications: rejectedApplications || 0,
        totalEquipment: totalEquipment || 0,
        totalBags: totalBags || 0,
        forumThreads: forumThreads || 0,
        feedPosts: feedPosts || 0,
        betaCap,
        spotsRemaining
      });

      if (recentApps) {
        setWaitlistApplications(recentApps);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    toast.success('Command copied to clipboard');
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  // Beta Management Functions
  const approveApplication = async (applicationId: string, email: string) => {
    try {
      // Update application status
      const { error: updateError } = await supabase
        .from('waitlist_applications')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // Check if profile exists with this email
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (existingProfile) {
        // Update existing profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            beta_access: true,
            invite_quota: 3
          })
          .eq('id', existingProfile.id);

        if (profileError) throw profileError;
      } else {
        // Create new profile with email
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: crypto.randomUUID(),
            email: email.toLowerCase(),
            beta_access: true,
            invite_quota: 3,
            referral_code: Math.random().toString(36).substring(2, 10)
          });

        if (profileError) throw profileError;
      }

      toast.success(`Approved beta access for ${email}`);
      fetchStats(); // Refresh stats
    } catch (error) {
      console.error('Error approving application:', error);
      toast.error('Failed to approve application');
    }
  };

  const rejectApplication = async (applicationId: string, email: string) => {
    try {
      const { error } = await supabase
        .from('waitlist_applications')
        .update({ status: 'rejected' })
        .eq('id', applicationId);

      if (error) throw error;

      toast.success(`Rejected application from ${email}`);
      fetchStats(); // Refresh stats
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Failed to reject application');
    }
  };

  const updateBetaCap = async (newCap: number) => {
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ beta_cap: newCap })
        .eq('id', 1);

      if (error) throw error;

      toast.success(`Beta cap updated to ${newCap}`);
      fetchStats(); // Refresh stats
    } catch (error) {
      console.error('Error updating beta cap:', error);
      toast.error('Failed to update beta cap');
    }
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Skeleton className="h-12 w-48 bg-white/10" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="bg-red-500/10 border-red-500/20 p-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white text-center">Admin Access Required</h2>
          <p className="text-white/70 text-center mt-2">You need admin privileges to view this page.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#1a1a1a] to-black border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <Shield className="h-10 w-10 text-emerald-500" />
                Admin Dashboard
              </h1>
              <p className="text-white/70">Central hub for all administrative functions</p>
            </div>
            <Badge className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 px-4 py-2">
              <Shield className="mr-2 h-4 w-4" />
              Admin: {profile?.username}
            </Badge>
          </div>

          {/* Quick Stats */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-24 bg-white/10" />
              ))}
            </div>
          ) : stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/60">Total Users</p>
                      <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/60">Beta Users</p>
                      <p className="text-2xl font-bold text-white">{stats.betaUsers}</p>
                    </div>
                    <UserCheck className="h-8 w-8 text-emerald-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/60">Pending Apps</p>
                      <p className="text-2xl font-bold text-white">{stats.pendingApplications}</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/60">Equipment</p>
                      <p className="text-2xl font-bold text-white">{stats.totalEquipment}</p>
                    </div>
                    <Database className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="beta" className="space-y-6">
          <TabsList className="bg-white/5 border-white/10">
            <TabsTrigger value="beta">Beta Management</TabsTrigger>
            <TabsTrigger value="pages">Admin Pages</TabsTrigger>
            <TabsTrigger value="commands">CLI Commands</TabsTrigger>
            <TabsTrigger value="database">Database</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          </TabsList>

          {/* Beta Management Tab */}
          <TabsContent value="beta" className="space-y-6">
            {/* Beta Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/60">Beta Cap</p>
                      <p className="text-2xl font-bold text-white">{stats?.betaCap || 0}</p>
                    </div>
                    <Trophy className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/60">Active Beta Users</p>
                      <p className="text-2xl font-bold text-white">{stats?.betaUsers || 0}</p>
                    </div>
                    <UserCheck className="h-8 w-8 text-emerald-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/60">Spots Left</p>
                      <p className="text-2xl font-bold text-white">{stats?.spotsRemaining || 0}</p>
                    </div>
                    <Zap className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/60">Pending</p>
                      <p className="text-2xl font-bold text-white">{stats?.pendingApplications || 0}</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Waitlist Applications Table */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Users className="h-5 w-5 text-emerald-500" />
                      Waitlist Applications
                    </CardTitle>
                    <CardDescription className="text-white/60">
                      Review and manage beta access requests
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => fetchStats()}
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 bg-white/10" />
                    ))}
                  </div>
                ) : waitlistApplications.length > 0 ? (
                  <div className="space-y-3">
                    {waitlistApplications.map(app => (
                      <div key={app.id} className="bg-black/50 border border-white/10 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="text-white font-medium">{app.email}</p>
                              <Badge className={
                                app.status === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                app.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                              }>
                                {app.status}
                              </Badge>
                              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                                Score: {app.score}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-white/60">
                              <span>{app.display_name || 'No name'}</span>
                              <span>{app.city_region || 'No location'}</span>
                              <span>{new Date(app.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          {app.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => approveApplication(app.id, app.email)}
                                size="sm"
                                className="bg-emerald-500 hover:bg-emerald-600"
                              >
                                <UserPlus className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                onClick={() => rejectApplication(app.id, app.email)}
                                size="sm"
                                variant="outline"
                                className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                              >
                                <UserX className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-white/20 mx-auto mb-3" />
                    <p className="text-white/60">No waitlist applications yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Settings className="h-5 w-5 text-blue-500" />
                    Beta Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-white/60 block mb-2">Beta Capacity</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        defaultValue={stats?.betaCap || 150}
                        className="bg-black/50 border border-white/20 rounded px-3 py-2 text-white w-32"
                        id="betaCapInput"
                      />
                      <Button
                        onClick={() => {
                          const input = document.getElementById('betaCapInput') as HTMLInputElement;
                          const newCap = parseInt(input.value);
                          if (newCap > 0) updateBetaCap(newCap);
                        }}
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        Update
                      </Button>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-sm text-white/60 mb-3">Bulk Actions</p>
                    <div className="space-y-2">
                      <Button
                        onClick={() => navigate('/admin/waitlist')}
                        variant="outline"
                        className="w-full border-white/20 text-white hover:bg-white/10"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Advanced Waitlist Management
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-white/20 text-white hover:bg-white/10"
                        onClick={() => {
                          const cmd = 'node scripts/beta-admin.js';
                          copyCommand(cmd);
                        }}
                      >
                        <Terminal className="h-4 w-4 mr-2" />
                        Copy CLI Admin Command
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-500" />
                    Beta Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-white/60 text-sm">Total Applications</span>
                    <span className="text-white font-medium">
                      {(stats?.pendingApplications || 0) + (stats?.approvedApplications || 0) + (stats?.rejectedApplications || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-white/60 text-sm">Approved</span>
                    <span className="text-emerald-400 font-medium">{stats?.approvedApplications || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-white/60 text-sm">Rejected</span>
                    <span className="text-red-400 font-medium">{stats?.rejectedApplications || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-white/60 text-sm">Approval Rate</span>
                    <span className="text-white font-medium">
                      {stats?.approvedApplications && (stats.approvedApplications + stats.rejectedApplications) > 0
                        ? Math.round((stats.approvedApplications / (stats.approvedApplications + stats.rejectedApplications)) * 100) + '%'
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-white/60 text-sm">Fill Rate</span>
                    <span className="text-white font-medium">
                      {stats?.betaCap ? Math.round(((stats.betaUsers || 0) / stats.betaCap) * 100) + '%' : 'N/A'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Admin Pages Tab */}
          <TabsContent value="pages" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Waitlist Management */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-emerald-500" />
                    Waitlist Management
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    Review and approve beta applications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-white/80 text-sm">
                      • View all waitlist applications<br />
                      • See application scores and answers<br />
                      • Approve or reject applications<br />
                      • Manage beta capacity limits
                    </p>
                  </div>
                  <Button 
                    onClick={() => navigate('/admin/waitlist')}
                    className="w-full bg-emerald-500 hover:bg-emerald-600"
                  >
                    Open Waitlist Admin
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              {/* Equipment Management */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Database className="h-5 w-5 text-blue-500" />
                    Equipment Management
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    Manage equipment database
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-white/80 text-sm">
                      • Seed initial equipment data<br />
                      • Migrate equipment between systems<br />
                      • Review reported equipment<br />
                      • Manage equipment photos
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Button 
                      onClick={() => navigate('/admin/seed-equipment')}
                      className="w-full bg-blue-500 hover:bg-blue-600"
                    >
                      Seed Equipment
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                    <Button 
                      onClick={() => navigate('/admin/equipment-migration')}
                      variant="outline"
                      className="w-full border-white/20 text-white hover:bg-white/10"
                    >
                      Equipment Migration
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Forum Moderation */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-purple-500" />
                    Forum Moderation
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    Moderate forum content
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-white/80 text-sm">
                      • Review reported posts<br />
                      • Pin/unpin threads<br />
                      • Lock/unlock discussions<br />
                      • Manage forum categories
                    </p>
                  </div>
                  <Button 
                    onClick={() => navigate('/forum')}
                    variant="outline"
                    className="w-full border-white/20 text-white hover:bg-white/10"
                  >
                    Go to Forum
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              {/* Analytics */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-yellow-500" />
                    Analytics Dashboard
                  </CardTitle>
                  <CardDescription className="text-white/60">
                    View platform analytics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-white/80 text-sm">
                      • User engagement metrics<br />
                      • Content creation stats<br />
                      • Beta conversion rates<br />
                      • Platform growth trends
                    </p>
                  </div>
                  <Button 
                    onClick={() => navigate('/admin/analytics')}
                    variant="outline"
                    className="w-full border-white/20 text-white hover:bg-white/10"
                  >
                    View Analytics
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* CLI Commands Tab */}
          <TabsContent value="commands" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-emerald-500" />
                  Useful Admin Commands
                </CardTitle>
                <CardDescription className="text-white/60">
                  Run these commands from the project root directory
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* User Management Commands */}
                <div>
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-blue-400" />
                    User Management
                  </h3>
                  <div className="space-y-2">
                    <CommandCard
                      title="Check user access"
                      command="node scripts/check-user-access.js user@email.com"
                      description="View complete access status for any user"
                      copied={copiedCommand}
                      onCopy={copyCommand}
                    />
                    <CommandCard
                      title="Grant beta access"
                      command="node scripts/grant-beta-access.js user@email.com"
                      description="Grant beta access to a specific user"
                      copied={copiedCommand}
                      onCopy={copyCommand}
                    />
                    <CommandCard
                      title="Grant admin access"
                      command="UPDATE profiles SET is_admin = true WHERE email = 'user@email.com';"
                      description="Run in Supabase SQL Editor to make someone admin"
                      copied={copiedCommand}
                      onCopy={copyCommand}
                    />
                  </div>
                </div>

                {/* Database Commands */}
                <div>
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Database className="h-4 w-4 text-purple-400" />
                    Database Management
                  </h3>
                  <div className="space-y-2">
                    <CommandCard
                      title="Check database schema"
                      command="node scripts/check-exact-schema.js"
                      description="View all tables and their columns"
                      copied={copiedCommand}
                      onCopy={copyCommand}
                    />
                    <CommandCard
                      title="Check RLS policies"
                      command="node scripts/verify-rls-fix.js"
                      description="Verify Row Level Security policies are working"
                      copied={copiedCommand}
                      onCopy={copyCommand}
                    />
                    <CommandCard
                      title="Test waitlist endpoint"
                      command="node scripts/test-waitlist-form.js"
                      description="Test the waitlist submission endpoint"
                      copied={copiedCommand}
                      onCopy={copyCommand}
                    />
                  </div>
                </div>

                {/* Monitoring Commands */}
                <div>
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-yellow-400" />
                    Monitoring & Testing
                  </h3>
                  <div className="space-y-2">
                    <CommandCard
                      title="Test app endpoints"
                      command="node scripts/test-app-endpoints.js"
                      description="Test all major app functionality"
                      copied={copiedCommand}
                      onCopy={copyCommand}
                    />
                    <CommandCard
                      title="Check table access"
                      command="node scripts/get-actual-tables.js"
                      description="Check RLS status on all tables"
                      copied={copiedCommand}
                      onCopy={copyCommand}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Database Tab */}
          <TabsContent value="database" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Database className="h-5 w-5 text-purple-500" />
                  Database Quick Actions
                </CardTitle>
                <CardDescription className="text-white/60">
                  Common database operations and SQL snippets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <SQLSnippet
                    title="Grant beta to all admins"
                    sql={`UPDATE profiles 
SET beta_access = true, invite_quota = 3 
WHERE is_admin = true;`}
                    copied={copiedCommand}
                    onCopy={copyCommand}
                  />
                  
                  <SQLSnippet
                    title="View pending applications"
                    sql={`SELECT email, display_name, score, created_at 
FROM waitlist_applications 
WHERE status = 'pending' 
ORDER BY score DESC, created_at ASC;`}
                    copied={copiedCommand}
                    onCopy={copyCommand}
                  />
                  
                  <SQLSnippet
                    title="Check beta capacity"
                    sql={`SELECT 
  (SELECT COUNT(*) FROM profiles WHERE beta_access = true) as current_beta_users,
  (SELECT beta_cap FROM feature_flags WHERE id = 1) as beta_capacity,
  (SELECT COUNT(*) FROM waitlist_applications WHERE status = 'pending') as pending_apps;`}
                    copied={copiedCommand}
                    onCopy={copyCommand}
                  />
                  
                  <SQLSnippet
                    title="Find users without profiles"
                    sql={`SELECT id, email, created_at 
FROM auth.users 
WHERE id NOT IN (SELECT id FROM public.profiles) 
ORDER BY created_at DESC;`}
                    copied={copiedCommand}
                    onCopy={copyCommand}
                  />
                </div>

                <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div className="text-sm text-white/80">
                      <p className="font-semibold mb-1">Important:</p>
                      <p>Always backup data before running DELETE or UPDATE queries. Test on a small subset first.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* System Health */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    System Health
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <HealthCheck label="Database Connection" status="healthy" />
                  <HealthCheck label="Authentication Service" status="healthy" />
                  <HealthCheck label="File Storage" status="healthy" />
                  <HealthCheck label="Email Service" status="warning" />
                  <HealthCheck label="Analytics" status="healthy" />
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Recent Admin Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ActivityItem 
                    action="Approved beta application"
                    user="john.doe@example.com"
                    time="2 hours ago"
                  />
                  <ActivityItem 
                    action="Updated equipment database"
                    user="System"
                    time="5 hours ago"
                  />
                  <ActivityItem 
                    action="Moderated forum post"
                    user="admin@teed.club"
                    time="1 day ago"
                  />
                  <ActivityItem 
                    action="Adjusted beta capacity"
                    user="System"
                    time="2 days ago"
                  />
                </CardContent>
              </Card>
            </div>

            {/* External Services */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <ExternalLink className="h-5 w-5 text-purple-500" />
                  External Services
                </CardTitle>
                <CardDescription className="text-white/60">
                  Quick links to external admin panels
                </CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-4">
                <Button
                  onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Database className="mr-2 h-4 w-4" />
                  Supabase Dashboard
                </Button>
                <Button
                  onClick={() => window.open('https://vercel.com/dashboard', '_blank')}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Vercel Dashboard
                </Button>
                <Button
                  onClick={() => window.open('https://github.com', '_blank')}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  GitHub Repo
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Helper Components
function CommandCard({ title, command, description, copied, onCopy }: {
  title: string;
  command: string;
  description: string;
  copied: string | null;
  onCopy: (cmd: string) => void;
}) {
  return (
    <div className="bg-black/50 border border-white/10 rounded-lg p-3">
      <div className="flex items-start justify-between mb-1">
        <p className="text-white text-sm font-medium">{title}</p>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onCopy(command)}
          className="h-6 px-2 text-white/60 hover:text-white"
        >
          {copied === command ? (
            <CheckCircle2 className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
      <code className="text-xs text-emerald-400 font-mono block mb-1 break-all">
        {command}
      </code>
      <p className="text-xs text-white/50">{description}</p>
    </div>
  );
}

function SQLSnippet({ title, sql, copied, onCopy }: {
  title: string;
  sql: string;
  copied: string | null;
  onCopy: (cmd: string) => void;
}) {
  return (
    <div className="bg-black/50 border border-white/10 rounded-lg p-3">
      <div className="flex items-start justify-between mb-2">
        <p className="text-white text-sm font-medium">{title}</p>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onCopy(sql)}
          className="h-6 px-2 text-white/60 hover:text-white"
        >
          {copied === sql ? (
            <CheckCircle2 className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
      <pre className="text-xs text-blue-400 font-mono whitespace-pre-wrap break-all">
        {sql}
      </pre>
    </div>
  );
}

function HealthCheck({ label, status }: { label: string; status: 'healthy' | 'warning' | 'error' }) {
  const statusConfig = {
    healthy: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
    warning: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' }
  };
  
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-black/30">
      <span className="text-white/80 text-sm">{label}</span>
      <div className={`flex items-center gap-2 px-2 py-1 rounded-full ${config.bg}`}>
        <Icon className={`h-3 w-3 ${config.color}`} />
        <span className={`text-xs font-medium ${config.color}`}>
          {status.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

function ActivityItem({ action, user, time }: { action: string; user: string; time: string }) {
  return (
    <div className="flex items-start gap-3 p-2">
      <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5" />
      <div className="flex-1">
        <p className="text-white/80 text-sm">{action}</p>
        <p className="text-white/50 text-xs">
          {user} • {time}
        </p>
      </div>
    </div>
  );
}