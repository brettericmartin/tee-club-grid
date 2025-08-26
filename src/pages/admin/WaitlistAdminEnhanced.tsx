import { useState, useEffect, useCallback } from 'react';
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
  Lock,
  Download,
  CheckSquare,
  Square,
  Mail,
  UserCheck,
  Calendar,
  Hash,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';

interface WaitlistApplication {
  id: string;
  created_at: string;
  email: string;
  display_name: string;
  city_region: string;
  role: string;
  score: number;
  status: 'pending' | 'approved' | 'rejected';
  answers: any;
  total_referrals?: number;
  direct_referrals?: number;
  indirect_referrals?: number;
  referred_by?: string;
  invite_code?: string;
  approved_at?: string;
}

interface BetaSummary {
  cap: number;
  approved: number;
  approvedActive: number;
  approvedTotal: number;
  remaining: number;
  publicBetaEnabled: boolean;
  todayApproved?: number;
}

interface Filters {
  scoreMin: number;
  hasInviteCode: boolean;
  role: string;
  status: string;
  minReferrals: number;
  dateFrom: string;
  dateTo: string;
  searchTerm: string;
}

interface BulkActionDialog {
  open: boolean;
  action: 'approve' | 'reject' | null;
  selectedCount: number;
}

export default function WaitlistAdminEnhanced() {
  const { user } = useAuth();
  const { isAuthorized, isLoading: adminLoading, error: adminError } = useRequireAdmin();
  const [applications, setApplications] = useState<WaitlistApplication[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<WaitlistApplication[]>([]);
  const [selectedApplications, setSelectedApplications] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [betaSummary, setBetaSummary] = useState<BetaSummary | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [sortBy, setSortBy] = useState<'score' | 'date' | 'referrals'>('score');
  const [filters, setFilters] = useState<Filters>({
    scoreMin: 0,
    hasInviteCode: false,
    role: 'all',
    status: 'pending',
    minReferrals: 0,
    dateFrom: '',
    dateTo: '',
    searchTerm: ''
  });
  const [bulkActionDialog, setBulkActionDialog] = useState<BulkActionDialog>({
    open: false,
    action: null,
    selectedCount: 0
  });
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);

  // Fetch beta summary with today's count
  const fetchBetaSummary = async () => {
    try {
      const response = await fetch('/api/beta/summary');
      if (response.ok) {
        const data = await response.json();
        
        // Get today's approved count
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { count: todayApproved } = await supabase
          .from('waitlist_applications')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved')
          .gte('approved_at', today.toISOString());
        
        setBetaSummary({
          ...data,
          todayApproved: todayApproved || 0
        });
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
  const applyFilters = useCallback((apps: WaitlistApplication[]) => {
    let filtered = [...apps];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(app => app.status === filters.status);
    }

    // Score filter
    if (filters.scoreMin > 0) {
      filtered = filtered.filter(app => app.score >= filters.scoreMin);
    }

    // Referrals filter
    if (filters.minReferrals > 0) {
      filtered = filtered.filter(app => (app.total_referrals || 0) >= filters.minReferrals);
    }

    // Invite code filter
    if (filters.hasInviteCode) {
      filtered = filtered.filter(app => app.invite_code && app.invite_code.length > 0);
    }

    // Role filter
    if (filters.role !== 'all') {
      filtered = filtered.filter(app => app.role === filters.role);
    }

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(app => new Date(app.created_at) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      filtered = filtered.filter(app => new Date(app.created_at) <= new Date(filters.dateTo));
    }

    // Search filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(app => 
        app.email.toLowerCase().includes(term) ||
        app.display_name?.toLowerCase().includes(term) ||
        app.city_region?.toLowerCase().includes(term)
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'score':
          aVal = a.score;
          bVal = b.score;
          break;
        case 'referrals':
          aVal = a.total_referrals || 0;
          bVal = b.total_referrals || 0;
          break;
        case 'date':
        default:
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
      }
      
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    setFilteredApplications(filtered);
  }, [filters, sortBy, sortOrder]);

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedApplications);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedApplications(newSelection);
  };

  // Select all visible
  const selectAllVisible = () => {
    const visibleIds = filteredApplications
      .filter(app => app.status === 'pending')
      .map(app => app.id);
    setSelectedApplications(new Set(visibleIds));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedApplications(new Set());
  };

  // Handle bulk approve
  const handleBulkApprove = async () => {
    if (selectedApplications.size === 0) return;

    // Check capacity
    const activeCount = betaSummary?.approvedActive || betaSummary?.approved || 0;
    const remaining = (betaSummary?.cap || 0) - activeCount;
    
    if (remaining < selectedApplications.size) {
      toast.error(`Insufficient capacity! Only ${remaining} slots available.`);
      return;
    }

    setBulkProcessing(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch('/api/waitlist/bulk-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          applicationIds: Array.from(selectedApplications),
          sendEmails: true
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(`Approved ${result.summary.approved} applications`);
        
        if (result.summary.failed > 0) {
          toast.warning(`${result.summary.failed} applications failed to process`);
        }
        
        // Refresh data
        await fetchApplications();
        await fetchBetaSummary();
        
        // Clear selection
        clearSelection();
      } else {
        toast.error(result.error || 'Bulk approval failed');
      }
    } catch (error) {
      console.error('Bulk approve error:', error);
      toast.error('Failed to process bulk approval');
    } finally {
      setBulkProcessing(false);
      setBulkActionDialog({ open: false, action: null, selectedCount: 0 });
    }
  };

  // Handle bulk reject
  const handleBulkReject = async () => {
    if (selectedApplications.size === 0) return;

    setBulkProcessing(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch('/api/waitlist/bulk-reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          applicationIds: Array.from(selectedApplications),
          reason: 'Did not meet current selection criteria'
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(`Rejected ${result.summary.rejected} applications`);
        
        if (result.summary.failed > 0) {
          toast.warning(`${result.summary.failed} applications failed to process`);
        }
        
        // Refresh data
        await fetchApplications();
        
        // Clear selection
        clearSelection();
      } else {
        toast.error(result.error || 'Bulk rejection failed');
      }
    } catch (error) {
      console.error('Bulk reject error:', error);
      toast.error('Failed to process bulk rejection');
    } finally {
      setBulkProcessing(false);
      setBulkActionDialog({ open: false, action: null, selectedCount: 0 });
    }
  };

  // Export to CSV
  const exportToCSV = async () => {
    setExportingCSV(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Authentication required');
        return;
      }

      // Build query params
      const params = new URLSearchParams();
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.scoreMin > 0) params.append('minScore', filters.scoreMin.toString());
      if (filters.minReferrals > 0) params.append('minReferrals', filters.minReferrals.toString());
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.role !== 'all') params.append('roles', filters.role);

      const response = await fetch(`/api/waitlist/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `waitlist-export-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('CSV exported successfully');
      } else {
        toast.error('Failed to export CSV');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setExportingCSV(false);
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
  }, [filters, sortOrder, sortBy, applyFilters, applications]);

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
        {/* Header with capacity metrics */}
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
            </div>
          </CardHeader>
          <CardContent>
            {betaSummary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-black/50 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                    <Users className="w-4 h-4" />
                    Beta Capacity
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {betaSummary.approvedActive || betaSummary.approved}/{betaSummary.cap}
                  </div>
                  {betaSummary.remaining === 0 && (
                    <Badge variant="destructive" className="mt-2">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      At Capacity
                    </Badge>
                  )}
                </div>
                
                <div className="bg-black/50 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                    <TrendingUp className="w-4 h-4" />
                    Today's Approvals
                  </div>
                  <div className="text-2xl font-bold text-green-400">
                    {betaSummary.todayApproved || 0}
                  </div>
                </div>
                
                <div className="bg-black/50 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                    <Hash className="w-4 h-4" />
                    Remaining Slots
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {betaSummary.remaining}
                  </div>
                </div>
                
                <div className="bg-black/50 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                    <AlertCircle className="w-4 h-4" />
                    Public Beta
                  </div>
                  <Badge variant={betaSummary.publicBetaEnabled ? 'default' : 'secondary'}>
                    {betaSummary.publicBetaEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Advanced Filters */}
        <Card className="mb-6 bg-[#1a1a1a] border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Advanced Filters
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  onClick={exportToCSV}
                  disabled={exportingCSV}
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  {exportingCSV ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Export CSV
                </Button>
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
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* Search */}
              <div>
                <Label className="text-white/60">Search</Label>
                <Input
                  placeholder="Email, name, or location..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  className="bg-black/50 border-white/20 text-white"
                />
              </div>

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

              {/* Min Score */}
              <div>
                <Label className="text-white/60">Min Score</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={filters.scoreMin}
                  onChange={(e) => setFilters(prev => ({ ...prev, scoreMin: parseInt(e.target.value) || 0 }))}
                  className="bg-black/50 border-white/20 text-white"
                />
              </div>

              {/* Min Referrals */}
              <div>
                <Label className="text-white/60">Min Referrals</Label>
                <Input
                  type="number"
                  min="0"
                  value={filters.minReferrals}
                  onChange={(e) => setFilters(prev => ({ ...prev, minReferrals: parseInt(e.target.value) || 0 }))}
                  className="bg-black/50 border-white/20 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Date From */}
              <div>
                <Label className="text-white/60">From Date</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="bg-black/50 border-white/20 text-white"
                />
              </div>

              {/* Date To */}
              <div>
                <Label className="text-white/60">To Date</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
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

              {/* Has Invite Code */}
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
              <div className="flex items-center gap-2">
                <Label className="text-white/60">Sort by:</Label>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="bg-black/50 border-white/20 text-white w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/20">
                    <SelectItem value="score">Score</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="referrals">Referrals</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10"
                >
                  {sortOrder === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions Bar */}
        {selectedApplications.size > 0 && (
          <Card className="mb-4 bg-green-900/20 border-green-500/30">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-white font-medium">
                    {selectedApplications.size} selected
                  </span>
                  <Button
                    onClick={clearSelection}
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    Clear selection
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setBulkActionDialog({
                      open: true,
                      action: 'approve',
                      selectedCount: selectedApplications.size
                    })}
                    disabled={bulkProcessing || (betaSummary && betaSummary.remaining < selectedApplications.size)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Bulk Approve
                  </Button>
                  <Button
                    onClick={() => setBulkActionDialog({
                      open: true,
                      action: 'reject',
                      selectedCount: selectedApplications.size
                    })}
                    disabled={bulkProcessing}
                    variant="destructive"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Bulk Reject
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Applications Table */}
        <Card className="bg-[#1a1a1a] border-white/10">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedApplications.size > 0 && 
                          filteredApplications
                            .filter(app => app.status === 'pending')
                            .every(app => selectedApplications.has(app.id))}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            selectAllVisible();
                          } else {
                            clearSelection();
                          }
                        }}
                        className="border-white/20"
                      />
                    </TableHead>
                    <TableHead className="text-white/60">Date</TableHead>
                    <TableHead className="text-white/60">Email</TableHead>
                    <TableHead className="text-white/60">Name</TableHead>
                    <TableHead className="text-white/60">Location</TableHead>
                    <TableHead className="text-white/60">Role</TableHead>
                    <TableHead className="text-white/60">Score</TableHead>
                    <TableHead className="text-white/60">Referrals</TableHead>
                    <TableHead className="text-white/60">Status</TableHead>
                    <TableHead className="text-white/60">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((application) => (
                    <TableRow key={application.id} className="border-white/10">
                      <TableCell>
                        {application.status === 'pending' && (
                          <Checkbox
                            checked={selectedApplications.has(application.id)}
                            onCheckedChange={() => toggleSelection(application.id)}
                            className="border-white/20"
                          />
                        )}
                      </TableCell>
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
                      <TableCell className="text-white/60">
                        {application.total_referrals || 0}
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
                              onClick={() => {
                                setSelectedApplications(new Set([application.id]));
                                setBulkActionDialog({
                                  open: true,
                                  action: 'approve',
                                  selectedCount: 1
                                });
                              }}
                              disabled={betaSummary && betaSummary.remaining === 0}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedApplications(new Set([application.id]));
                                setBulkActionDialog({
                                  open: true,
                                  action: 'reject',
                                  selectedCount: 1
                                });
                              }}
                            >
                              <X className="w-4 h-4" />
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

      {/* Bulk Action Confirmation Dialog */}
      <AlertDialog 
        open={bulkActionDialog.open} 
        onOpenChange={(open) => !bulkProcessing && setBulkActionDialog({ ...bulkActionDialog, open })}
      >
        <AlertDialogContent className="bg-[#1a1a1a] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {bulkActionDialog.action === 'approve' ? 'Bulk Approve Applications' : 'Bulk Reject Applications'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              {bulkActionDialog.action === 'approve' ? (
                <>
                  You are about to approve <span className="font-bold text-green-400">{bulkActionDialog.selectedCount}</span> applications.
                  <br />
                  <br />
                  This will:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Grant beta access to all selected users</li>
                    <li>Send approval emails to each user</li>
                    <li>Update the beta capacity count</li>
                  </ul>
                  <br />
                  <span className="text-yellow-400">This action cannot be undone.</span>
                </>
              ) : (
                <>
                  You are about to reject <span className="font-bold text-red-400">{bulkActionDialog.selectedCount}</span> applications.
                  <br />
                  <br />
                  This will permanently mark these applications as rejected.
                  <br />
                  <span className="text-yellow-400">This action cannot be undone.</span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={bulkProcessing}
              className="bg-[#2a2a2a] text-white border-white/10 hover:bg-[#3a3a3a]"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={bulkActionDialog.action === 'approve' ? handleBulkApprove : handleBulkReject}
              disabled={bulkProcessing}
              className={bulkActionDialog.action === 'approve' 
                ? "bg-green-600 hover:bg-green-700 text-white" 
                : "bg-red-600 hover:bg-red-700 text-white"
              }
            >
              {bulkProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {bulkActionDialog.action === 'approve' ? (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Approve & Send Emails
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Reject Applications
                    </>
                  )}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}