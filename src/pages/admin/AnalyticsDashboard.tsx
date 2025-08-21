import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowDown, 
  ArrowUp, 
  TrendingUp, 
  TrendingDown,
  Users,
  Activity,
  Target,
  AlertCircle,
  RefreshCw,
  Download
} from 'lucide-react';
import { format } from 'date-fns';

interface FunnelStep {
  step_name: string;
  step_index: number;
  event_count: number;
  unique_users: number;
  conversion_rate: number;
}

interface EventStat {
  event_name: string;
  count: number;
  unique_users: number;
  last_triggered: string;
}

interface RealtimeStat {
  hour: string;
  event_name: string;
  event_count: number;
  unique_users: number;
  unique_sessions: number;
}

export function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFunnel, setSelectedFunnel] = useState('waitlist_conversion');
  const [funnelData, setFunnelData] = useState<FunnelStep[]>([]);
  const [eventStats, setEventStats] = useState<EventStat[]>([]);
  const [realtimeStats, setRealtimeStats] = useState<RealtimeStat[]>([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date()
  });

  // Load analytics data
  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Load funnel conversion data
      const { data: funnelResult, error: funnelError } = await supabase
        .rpc('get_funnel_conversion', {
          p_funnel_name: selectedFunnel,
          p_start_date: dateRange.start.toISOString(),
          p_end_date: dateRange.end.toISOString()
        });

      if (funnelError) throw funnelError;
      setFunnelData(funnelResult || []);

      // Load event statistics
      const { data: events, error: eventsError } = await supabase
        .from('analytics_events')
        .select('event_name, user_id, created_at')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;

      // Aggregate event stats
      const statsMap = new Map<string, EventStat>();
      const usersByEvent = new Map<string, Set<string>>();

      events?.forEach(event => {
        const stat = statsMap.get(event.event_name) || {
          event_name: event.event_name,
          count: 0,
          unique_users: 0,
          last_triggered: event.created_at
        };

        stat.count++;
        
        if (!usersByEvent.has(event.event_name)) {
          usersByEvent.set(event.event_name, new Set());
        }
        if (event.user_id) {
          usersByEvent.get(event.event_name)!.add(event.user_id);
        }

        statsMap.set(event.event_name, stat);
      });

      // Update unique user counts
      statsMap.forEach((stat, eventName) => {
        stat.unique_users = usersByEvent.get(eventName)?.size || 0;
      });

      setEventStats(Array.from(statsMap.values()));

      // Load realtime stats from materialized view
      const { data: realtime, error: realtimeError } = await supabase
        .from('analytics_realtime_stats')
        .select('*')
        .order('hour', { ascending: false })
        .limit(24);

      if (realtimeError) throw realtimeError;
      setRealtimeStats(realtime || []);

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [selectedFunnel, dateRange]);

  const handleRefresh = async () => {
    setRefreshing(true);
    
    // Refresh materialized view
    await supabase.rpc('refresh_analytics_stats');
    
    // Reload data
    await loadAnalytics();
    setRefreshing(false);
  };

  const exportData = () => {
    const data = {
      funnel: funnelData,
      events: eventStats,
      realtime: realtimeStats,
      metadata: {
        exported_at: new Date().toISOString(),
        date_range: dateRange,
        funnel_name: selectedFunnel
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_export_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate drop-off points
  const calculateDropoffs = () => {
    const dropoffs: Array<{ from: string; to: string; loss: number; percentage: number }> = [];
    
    for (let i = 0; i < funnelData.length - 1; i++) {
      const current = funnelData[i];
      const next = funnelData[i + 1];
      const loss = current.unique_users - next.unique_users;
      const percentage = (loss / current.unique_users) * 100;
      
      dropoffs.push({
        from: current.step_name,
        to: next.step_name,
        loss,
        percentage
      });
    }

    return dropoffs.sort((a, b) => b.percentage - a.percentage);
  };

  const dropoffs = calculateDropoffs();
  const topDropoff = dropoffs[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Track user journey and identify drop-off points</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={exportData}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {eventStats.reduce((sum, stat) => sum + stat.count, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unique Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(eventStats.flatMap(s => Array(s.unique_users).fill(1))).size}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active in period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {funnelData.length > 0 
                ? `${funnelData[funnelData.length - 1].conversion_rate}%`
                : '0%'
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Through full funnel
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-500 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Biggest Drop-off
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topDropoff ? (
              <>
                <div className="text-2xl font-bold text-red-500">
                  {topDropoff.percentage.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {topDropoff.from} → {topDropoff.to}
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="funnel" className="space-y-4">
        <TabsList>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="events">Event Tracking</TabsTrigger>
          <TabsTrigger value="realtime">Real-time</TabsTrigger>
          <TabsTrigger value="dropoffs">Drop-off Analysis</TabsTrigger>
        </TabsList>

        {/* Funnel Tab */}
        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Conversion Funnel</CardTitle>
                <select
                  value={selectedFunnel}
                  onChange={(e) => setSelectedFunnel(e.target.value)}
                  className="px-3 py-1 border rounded-md"
                >
                  <option value="waitlist_conversion">Waitlist Conversion</option>
                  <option value="beta_access">Beta Access</option>
                  <option value="full_journey">Full Journey</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {funnelData.map((step, index) => (
                  <div key={step.step_name} className="relative">
                    <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-bold">
                          {step.step_index}
                        </div>
                        <div>
                          <p className="font-medium">{step.step_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {step.event_count} events • {step.unique_users} users
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{step.conversion_rate}%</p>
                        <p className="text-sm text-muted-foreground">conversion</p>
                      </div>
                    </div>
                    {index < funnelData.length - 1 && (
                      <div className="flex justify-center py-2">
                        <ArrowDown className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event Tracking</CardTitle>
              <CardDescription>All tracked events in the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {eventStats
                  .sort((a, b) => b.count - a.count)
                  .map(stat => (
                    <div key={stat.event_name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Activity className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{stat.event_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Last: {format(new Date(stat.last_triggered), 'MMM d, HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">{stat.count}</p>
                          <p className="text-xs text-muted-foreground">total</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{stat.unique_users}</p>
                          <p className="text-xs text-muted-foreground">users</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Real-time Tab */}
        <TabsContent value="realtime" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Activity</CardTitle>
              <CardDescription>Last 24 hours of activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {realtimeStats.map((stat, index) => (
                  <div key={`${stat.hour}-${stat.event_name}`} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{stat.event_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(stat.hour), 'MMM d, HH:00')}
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-semibold">{stat.event_count}</p>
                        <p className="text-xs text-muted-foreground">events</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{stat.unique_users}</p>
                        <p className="text-xs text-muted-foreground">users</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{stat.unique_sessions}</p>
                        <p className="text-xs text-muted-foreground">sessions</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Drop-offs Tab */}
        <TabsContent value="dropoffs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Drop-off Analysis</CardTitle>
              <CardDescription>Identify where users are leaving the funnel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dropoffs.map((dropoff, index) => (
                  <div 
                    key={`${dropoff.from}-${dropoff.to}`} 
                    className={`p-4 border rounded-lg ${
                      index === 0 ? 'border-red-500 bg-red-500/5' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {index === 0 && (
                          <Badge variant="destructive">Highest Drop-off</Badge>
                        )}
                        <div>
                          <p className="font-medium">
                            {dropoff.from} → {dropoff.to}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Lost {dropoff.loss} users
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        <span className="text-2xl font-bold text-red-500">
                          {dropoff.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}