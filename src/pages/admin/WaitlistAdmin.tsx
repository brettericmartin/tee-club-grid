import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useRequireAdmin } from '@/hooks/useAdminAuth';
import { 
  Check, 
  X, 
  Users, 
  AlertCircle, 
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw,
  Shield,
  Lock
} from 'lucide-react';
import { format } from 'date-fns';

interface WaitlistApplication {
  id: string;
  created_at: string;
  email: string;
  display_name: string;
  city_region: string;
  role: string;
  share_channels: string[];
  learn_channels: string[];
  spend_bracket: string;
  uses: string[];
  buy_frequency: string;
  share_frequency: string;
  score: number;
  status: 'pending' | 'approved' | 'rejected';
  answers: any;
}

interface BetaSummary {
  cap: number;
  approved: number;          // Deprecated
  approvedActive: number;    // Active beta users
  approvedTotal: number;     // Total beta users (including soft-deleted)
  remaining: number;
  publicBetaEnabled: boolean;
}

interface Filters {
  scoreMin: number;
  hasInviteCode: boolean;
  role: string;
  status: string;
}

export default function WaitlistAdmin() {
  const { user } = useAuth();
  const { isAuthorized, isLoading: adminLoading, error: adminError } = useRequireAdmin();
  const [applications, setApplications] = useState<WaitlistApplication[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<WaitlistApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [betaSummary, setBetaSummary] = useState<BetaSummary | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [filters, setFilters] = useState<Filters>({
    scoreMin: 0,
    hasInviteCode: false,
    role: 'all',
    status: 'pending'
  });
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; application: WaitlistApplication | null }>({
    open: false,
    application: null
  });
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  // Fetch beta summary
  const fetchBetaSummary = async () => {
    try {
      const response = await fetch('/api/beta/summary');
      if (response.ok) {
        const data = await response.json();
        setBetaSummary(data);
      }
    } catch (error) {
      console.error('Error fetching beta summary:', error);
    }
  };

  // Fetch applications
  const fetchApplications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('waitlist_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setApplications(data || []);
      applyFilters(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load waitlist applications');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and sorting
  const applyFilters = (apps: WaitlistApplication[]) => {
    let filtered = [...apps];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(app => app.status === filters.status);
    }

    // Score filter
    if (filters.scoreMin > 0) {
      filtered = filtered.filter(app => app.score >= filters.scoreMin);
    }

    // Invite code filter
    if (filters.hasInviteCode) {
      filtered = filtered.filter(app => app.answers?.invite_code && app.answers.invite_code.length > 0);
    }

    // Role filter
    if (filters.role !== 'all') {
      filtered = filtered.filter(app => app.role === filters.role);
    }

    // Sort by score
    filtered.sort((a, b) => {
      return sortOrder === 'desc' ? b.score - a.score : a.score - b.score;
    });

    setFilteredApplications(filtered);
  };

  // Handle approve
  const handleApprove = async (application: WaitlistApplication) => {
    // Check capacity first (use active count for capacity check)
    const activeCount = betaSummary?.approvedActive || betaSummary?.approved || 0;
    if (betaSummary && activeCount >= betaSummary.cap) {
      toast.error(`Beta at capacity (${activeCount}/${betaSummary.cap}). Cannot approve more users.`);
      return;
    }

    setApproving(application.id);
    
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch('/api/waitlist/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: application.email,
          grantInvites: true
        })
      });

      const result = await response.json();

      if (response.ok && result.ok) {
        toast.success(`Approved ${application.display_name || application.email}`);
        
        // Update local state
        setApplications(prev => prev.map(app => 
          app.id === application.id 
            ? { ...app, status: 'approved' as const }
            : app
        ));
        
        // Refresh beta summary
        await fetchBetaSummary();
        
        // Re-apply filters
        applyFilters(applications.map(app => 
          app.id === application.id 
            ? { ...app, status: 'approved' as const }
            : app
        ));
      } else {
        toast.error(result.error || 'Failed to approve application');
      }
    } catch (error) {
      console.error('Error approving application:', error);
      toast.error('Failed to approve application');
    } finally {
      setApproving(null);
    }
  };

  // Handle reject
  const handleReject = async (application: WaitlistApplication) => {
    setRejecting(application.id);
    
    try {
      const { error } = await supabase
        .from('waitlist_applications')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', application.id);

      if (error) throw error;

      toast.success(`Rejected ${application.display_name || application.email}`);
      
      // Update local state
      setApplications(prev => prev.map(app => 
        app.id === application.id 
          ? { ...app, status: 'rejected' as const }
          : app
      ));
      
      // Re-apply filters
      applyFilters(applications.map(app => 
        app.id === application.id 
          ? { ...app, status: 'rejected' as const }
          : app
      ));
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Failed to reject application');
    } finally {
      setRejecting(null);
      setRejectDialog({ open: false, application: null });
    }
  };

  // Score color coding
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-500';
    if (score >= 5) return 'text-yellow-500';
    return 'text-gray-500';
  };

  // Status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  useEffect(() => {
    fetchBetaSummary();
    fetchApplications();
  }, []);

  useEffect(() => {
    applyFilters(applications);
  }, [filters, sortOrder]);

  // Show loading while checking admin status
  if (adminLoading) {
    return (
      <div className="min-h-screen bg-black py-8">
        <div className="container mx-auto px-4">
          <Card className="bg-[#1a1a1a] border-white/10">
            <CardContent className="p-8">
              <div className="flex items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 text-white animate-spin" />
                <span className="text-white text-lg">Verifying admin access...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show unauthorized access message
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-black py-8">
        <div className="container mx-auto px-4">
          <Card className="bg-[#1a1a1a] border-red-500/30">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-full bg-red-500/20">
                    <Lock className="w-8 h-8 text-red-400" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
                <p className="text-white/60 mb-6">
                  {adminError 
                    ? `Admin verification failed: ${adminError}`
                    : 'You do not have admin privileges to access this page.'
                  }
                </p>
                <div className="flex justify-center gap-4">
                  <Button
                    onClick={() => window.location.href = '/'}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    Go Home
                  </Button>
                  {user && (
                    <Button
                      onClick={() => window.location.href = '/profile'}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Go to Profile
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black py-8">
        <div className="container mx-auto px-4">
          <Skeleton className="h-32 w-full mb-6 bg-white/10" />
          <Skeleton className="h-96 w-full bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-8">
      <div className="container mx-auto px-4">
        {/* Header with capacity */}
        <Card className="mb-6 bg-[#1a1a1a] border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-400" />
                  Waitlist Administration
                </CardTitle>
                <CardDescription className="text-white/60">
                  Admin access verified • Manage beta access applications
                </CardDescription>
              </div>
              {betaSummary && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    {betaSummary.approvedActive || betaSummary.approved}/{betaSummary.cap}
                  </div>
                  <div className="text-sm text-white/60">Active Beta Users</div>
                  {betaSummary.approvedTotal > (betaSummary.approvedActive || betaSummary.approved) && (
                    <div className="text-xs text-white/40 mt-1">
                      ({betaSummary.approvedTotal} total incl. soft-deleted)
                    </div>
                  )}
                  {betaSummary.remaining === 0 && (
                    <Badge variant="destructive" className="mt-2">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      At Capacity
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Filters */}
        <Card className="mb-6 bg-[#1a1a1a] border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Status filter */}
              <div>
                <Label className="text-white/60">Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="bg-black/50 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/20">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Score filter */}
              <div>
                <Label className="text-white/60">Minimum Score</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={filters.scoreMin}
                  onChange={(e) => setFilters(prev => ({ ...prev, scoreMin: parseInt(e.target.value) || 0 }))}
                  className="bg-black/50 border-white/20 text-white"
                />
              </div>

              {/* Role filter */}
              <div>
                <Label className="text-white/60">Role</Label>
                <Select value={filters.role} onValueChange={(value) => setFilters(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger className="bg-black/50 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/20">
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="fitter_builder">Fitter/Builder</SelectItem>
                    <SelectItem value="creator">Creator</SelectItem>
                    <SelectItem value="golfer">Golfer</SelectItem>
                    <SelectItem value="league_captain">League Captain</SelectItem>
                    <SelectItem value="retailer_other">Retailer/Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Invite code filter */}
              <div className="flex items-end">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasInvite"
                    checked={filters.hasInviteCode}
                    onCheckedChange={(checked) => setFilters(prev => ({ ...prev, hasInviteCode: !!checked }))}
                    className="border-white/20"
                  />
                  <Label htmlFor="hasInvite" className="text-white/60 cursor-pointer">
                    Has Invite Code
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-white/40">
                Showing {filteredApplications.length} of {applications.length} applications
              </div>
              <Button
                onClick={() => {
                  fetchApplications();
                  fetchBetaSummary();
                }}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Applications Table */}
        <Card className="bg-[#1a1a1a] border-white/10">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-white/60">Date</TableHead>
                    <TableHead className="text-white/60">Email</TableHead>
                    <TableHead className="text-white/60">Name</TableHead>
                    <TableHead className="text-white/60">Location</TableHead>
                    <TableHead className="text-white/60">Role</TableHead>
                    <TableHead 
                      className="text-white/60 cursor-pointer"
                      onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    >
                      <div className="flex items-center gap-1">
                        Score
                        {sortOrder === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </div>
                    </TableHead>
                    <TableHead className="text-white/60">Status</TableHead>
                    <TableHead className="text-white/60">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((application) => (
                    <TableRow key={application.id} className="border-white/10">
                      <TableCell className="text-white/80 text-sm">
                        {format(new Date(application.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-white/80 font-mono text-sm">
                        {application.email}
                      </TableCell>
                      <TableCell className="text-white/80">
                        {application.display_name}
                      </TableCell>
                      <TableCell className="text-white/60 text-sm">
                        {application.city_region}
                      </TableCell>
                      <TableCell className="text-white/60 text-sm">
                        {application.answers?.role ? application.answers.role.replace('_', ' ') : 'Not specified'}
                      </TableCell>
                      <TableCell>
                        <span className={`font-bold ${getScoreColor(application.score)}`}>
                          {application.score}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(application.status)}>
                          {application.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {application.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(application)}
                              disabled={approving === application.id || (betaSummary && (betaSummary.approvedActive || betaSummary.approved) >= betaSummary.cap)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {approving === application.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setRejectDialog({ open: true, application })}
                              disabled={rejecting === application.id}
                            >
                              {rejecting === application.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <X className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ open, application: null })}>
        <AlertDialogContent className="bg-[#1a1a1a] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Reject Application?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Are you sure you want to reject the application from {rejectDialog.application?.display_name || rejectDialog.application?.email}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#2a2a2a] text-white border-white/10 hover:bg-[#3a3a3a]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rejectDialog.application && handleReject(rejectDialog.application)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}