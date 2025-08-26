import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { 
  ScoringConfig, 
  DEFAULT_SCORING_CONFIG,
  scoringConfigLoader 
} from '@/config/scoring-config';
import { WaitlistAnswers } from '@/lib/waitlist';
import {
  BarChart,
  Calculator,
  Download,
  FlaskConical,
  RefreshCw,
  Save,
  Settings,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface SimulationResult {
  sampleSize: number;
  changes: Array<{
    email: string;
    currentScore: number;
    newScore: number;
    scoreDiff: number;
    currentAutoApprove: boolean;
    newAutoApprove: boolean;
  }>;
  statistics: {
    totalApplications: number;
    averageScoreChange: number;
    currentAutoApproveCount: number;
    newAutoApproveCount: number;
    gainedAutoApproval: number;
    lostAutoApproval: number;
  };
}

export default function ScoringSimulator() {
  const [config, setConfig] = useState<ScoringConfig>(DEFAULT_SCORING_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<ScoringConfig>(DEFAULT_SCORING_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [testAnswers, setTestAnswers] = useState<Partial<WaitlistAnswers>>({
    role: 'golfer',
    buy_frequency: 'few_per_year',
    share_frequency: 'monthly'
  });
  const [testScore, setTestScore] = useState<number | null>(null);

  // Load current configuration
  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch('/api/admin/scoring-config?includeStats=true', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
        setOriginalConfig(data.config);
      } else {
        toast.error('Failed to load configuration');
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Failed to load scoring configuration');
    } finally {
      setLoading(false);
    }
  };

  // Update weight value
  const updateWeight = (path: string[], value: number) => {
    const newConfig = { ...config };
    let current: any = newConfig.weights;
    
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = value;
    setConfig(newConfig);
  };

  // Update auto-approval threshold
  const updateThreshold = (value: number) => {
    setConfig({
      ...config,
      autoApproval: {
        ...config.autoApproval,
        threshold: value
      }
    });
  };

  // Test scoring with current configuration
  const testScoring = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch('/api/admin/scoring-config/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          answers: {
            ...testAnswers,
            email: 'test@example.com',
            display_name: 'Test User',
            city_region: 'Test City',
            share_channels: [],
            learn_channels: [],
            spend_bracket: '<300',
            uses: [],
            termsAccepted: true
          },
          testConfig: config
        })
      });

      if (response.ok) {
        const result = await response.json();
        setTestScore(result.score);
        toast.success(`Test score: ${result.score}`);
      } else {
        toast.error('Failed to test scoring');
      }
    } catch (error) {
      console.error('Test scoring error:', error);
      toast.error('Failed to test scoring');
    }
  };

  // Run simulation
  const runSimulation = async () => {
    setSimulating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch('/api/admin/scoring-config/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          testConfig: config,
          testThreshold: config.autoApproval.threshold,
          sampleSize: 100
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSimulationResult(data.simulation);
        toast.success('Simulation complete');
      } else {
        toast.error('Failed to run simulation');
      }
    } catch (error) {
      console.error('Simulation error:', error);
      toast.error('Failed to run simulation');
    } finally {
      setSimulating(false);
    }
  };

  // Save configuration
  const saveConfiguration = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch('/api/admin/scoring-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          config: config,
          threshold: config.autoApproval.threshold,
          reason: 'Manual configuration update via simulator'
        })
      });

      if (response.ok) {
        toast.success('Configuration saved successfully');
        setOriginalConfig(config);
      } else {
        toast.error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setConfig(DEFAULT_SCORING_CONFIG);
    toast.info('Reset to default configuration');
  };

  // Export configuration
  const exportConfig = () => {
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `scoring-config-${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('Configuration exported');
  };

  if (loading) {
    return (
      <Card className="bg-[#1a1a1a] border-white/10">
        <CardContent className="p-8">
          <div className="flex items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 text-white animate-spin" />
            <span className="text-white">Loading configuration...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-[#1a1a1a] border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-green-400" />
                Scoring Configuration Simulator
              </CardTitle>
              <CardDescription className="text-white/60">
                Test and tune scoring weights without deploying code
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={exportConfig}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button
                onClick={resetToDefaults}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
              >
                Reset
              </Button>
              <Button
                onClick={saveConfiguration}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="weights" className="space-y-4">
        <TabsList className="bg-black/50 border border-white/10">
          <TabsTrigger value="weights" className="text-white/60 data-[state=active]:text-white">
            <Settings className="w-4 h-4 mr-2" />
            Scoring Weights
          </TabsTrigger>
          <TabsTrigger value="test" className="text-white/60 data-[state=active]:text-white">
            <Calculator className="w-4 h-4 mr-2" />
            Test Scoring
          </TabsTrigger>
          <TabsTrigger value="simulate" className="text-white/60 data-[state=active]:text-white">
            <BarChart className="w-4 h-4 mr-2" />
            Simulate Impact
          </TabsTrigger>
        </TabsList>

        {/* Weights Configuration */}
        <TabsContent value="weights">
          <Card className="bg-[#1a1a1a] border-white/10">
            <CardContent className="p-6 space-y-6">
              {/* Auto-Approval Threshold */}
              <div>
                <Label className="text-white mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Auto-Approval Threshold: {config.autoApproval.threshold}
                </Label>
                <Slider
                  value={[config.autoApproval.threshold]}
                  onValueChange={(v) => updateThreshold(v[0])}
                  min={0}
                  max={10}
                  step={1}
                  className="mt-2"
                />
                <p className="text-white/40 text-sm mt-1">
                  Minimum score required for automatic approval
                </p>
              </div>

              {/* Role Weights */}
              <div>
                <Label className="text-white mb-2">Role Weights</Label>
                <div className="space-y-3">
                  {Object.entries(config.weights.role).map(([role, weight]) => (
                    <div key={role} className="flex items-center gap-4">
                      <span className="text-white/60 w-32 text-sm">
                        {role.replace('_', ' ')}
                      </span>
                      <Slider
                        value={[weight]}
                        onValueChange={(v) => updateWeight(['role', role], v[0])}
                        min={0}
                        max={5}
                        step={1}
                        className="flex-1"
                      />
                      <Badge variant="secondary" className="w-8 text-center">
                        {weight}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Frequency Weights */}
              <div>
                <Label className="text-white mb-2">Buy Frequency Weights</Label>
                <div className="space-y-3">
                  {Object.entries(config.weights.buyFrequency).map(([freq, weight]) => (
                    <div key={freq} className="flex items-center gap-4">
                      <span className="text-white/60 w-32 text-sm">
                        {freq.replace('_', ' ')}
                      </span>
                      <Slider
                        value={[weight]}
                        onValueChange={(v) => updateWeight(['buyFrequency', freq], v[0])}
                        min={0}
                        max={3}
                        step={1}
                        className="flex-1"
                      />
                      <Badge variant="secondary" className="w-8 text-center">
                        {weight}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Engagement Bonuses */}
              <div>
                <Label className="text-white mb-2">Engagement Bonuses</Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="text-white/60 w-32 text-sm">
                      Profile Completion
                    </span>
                    <Slider
                      value={[config.weights.profileCompletion.bonus]}
                      onValueChange={(v) => updateWeight(['profileCompletion', 'bonus'], v[0])}
                      min={0}
                      max={3}
                      step={1}
                      className="flex-1"
                    />
                    <Badge variant="secondary" className="w-8 text-center">
                      {config.weights.profileCompletion.bonus}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-white/60 w-32 text-sm">
                      First Equipment
                    </span>
                    <Slider
                      value={[config.weights.equipmentEngagement.firstItem]}
                      onValueChange={(v) => updateWeight(['equipmentEngagement', 'firstItem'], v[0])}
                      min={0}
                      max={3}
                      step={1}
                      className="flex-1"
                    />
                    <Badge variant="secondary" className="w-8 text-center">
                      {config.weights.equipmentEngagement.firstItem}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Scoring */}
        <TabsContent value="test">
          <Card className="bg-[#1a1a1a] border-white/10">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-white font-medium">Test Application</h3>
                  
                  <div>
                    <Label className="text-white/60">Role</Label>
                    <select
                      value={testAnswers.role}
                      onChange={(e) => setTestAnswers({ ...testAnswers, role: e.target.value as any })}
                      className="w-full mt-1 bg-black/50 border border-white/20 text-white rounded px-3 py-2"
                    >
                      <option value="golfer">Golfer</option>
                      <option value="creator">Creator</option>
                      <option value="fitter_builder">Fitter/Builder</option>
                      <option value="league_captain">League Captain</option>
                      <option value="retailer_other">Retailer/Other</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-white/60">Buy Frequency</Label>
                    <select
                      value={testAnswers.buy_frequency}
                      onChange={(e) => setTestAnswers({ ...testAnswers, buy_frequency: e.target.value as any })}
                      className="w-full mt-1 bg-black/50 border border-white/20 text-white rounded px-3 py-2"
                    >
                      <option value="never">Never</option>
                      <option value="yearly_1_2">1-2 per year</option>
                      <option value="few_per_year">Few per year</option>
                      <option value="monthly">Monthly</option>
                      <option value="weekly_plus">Weekly+</option>
                    </select>
                  </div>

                  <Button
                    onClick={testScoring}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    Calculate Score
                  </Button>
                </div>

                <div className="space-y-4">
                  <h3 className="text-white font-medium">Result</h3>
                  
                  {testScore !== null && (
                    <div className="p-4 bg-black/50 rounded-lg border border-white/10">
                      <div className="text-3xl font-bold text-white mb-2">
                        {testScore} / {config.weights.totalCap}
                      </div>
                      <div className="flex items-center gap-2">
                        {testScore >= config.autoApproval.threshold ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-green-400">Auto-approve eligible</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-yellow-400" />
                            <span className="text-yellow-400">Manual review required</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Simulate Impact */}
        <TabsContent value="simulate">
          <Card className="bg-[#1a1a1a] border-white/10">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">Impact Simulation</h3>
                    <p className="text-white/60 text-sm">
                      See how changes affect pending applications
                    </p>
                  </div>
                  <Button
                    onClick={runSimulation}
                    disabled={simulating}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {simulating ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <BarChart className="w-4 h-4 mr-2" />
                    )}
                    Run Simulation
                  </Button>
                </div>

                {simulationResult && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-black/50 rounded-lg border border-white/10">
                        <div className="text-white/60 text-sm mb-1">Average Score Change</div>
                        <div className="text-2xl font-bold text-white">
                          {simulationResult.statistics.averageScoreChange > 0 ? '+' : ''}
                          {simulationResult.statistics.averageScoreChange.toFixed(1)}
                        </div>
                      </div>
                      
                      <div className="p-4 bg-black/50 rounded-lg border border-white/10">
                        <div className="text-white/60 text-sm mb-1">Auto-Approve Change</div>
                        <div className="text-2xl font-bold text-white">
                          {simulationResult.statistics.newAutoApproveCount - simulationResult.statistics.currentAutoApproveCount > 0 ? '+' : ''}
                          {simulationResult.statistics.newAutoApproveCount - simulationResult.statistics.currentAutoApproveCount}
                        </div>
                      </div>
                      
                      <div className="p-4 bg-black/50 rounded-lg border border-white/10">
                        <div className="text-white/60 text-sm mb-1">New Eligible</div>
                        <div className="text-2xl font-bold text-green-400">
                          +{simulationResult.statistics.gainedAutoApproval}
                        </div>
                      </div>
                    </div>

                    <Alert className="bg-black/50 border-white/10">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-white/80">
                        Based on {simulationResult.sampleSize} pending applications.
                        {simulationResult.statistics.gainedAutoApproval > 0 && 
                          ` ${simulationResult.statistics.gainedAutoApproval} would gain auto-approval.`}
                        {simulationResult.statistics.lostAutoApproval > 0 && 
                          ` ${simulationResult.statistics.lostAutoApproval} would lose auto-approval.`}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}