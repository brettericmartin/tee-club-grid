import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { 
  ScoringConfig, 
  DEFAULT_SCORING_CONFIG,
  scoringConfigLoader 
} from '../../src/config/scoring-config';
import { scoringEngine } from '../../src/lib/scoring-engine';
import { WaitlistAnswers } from '../../src/lib/waitlist';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface GetConfigResponse {
  config: ScoringConfig;
  source: string;
  statistics?: {
    pendingApplications: number;
    averageScore: number;
    scoreDistribution: Record<number, number>;
    wouldAutoApprove: number;
  };
}

interface UpdateConfigRequest {
  config?: Partial<ScoringConfig>;
  threshold?: number;
  reason?: string;
}

interface TestScoringRequest {
  answers: WaitlistAnswers;
  testConfig?: Partial<ScoringConfig>;
  includeProfile?: boolean;
  includeEquipment?: boolean;
}

interface SimulateRequest {
  testConfig: Partial<ScoringConfig>;
  testThreshold?: number;
  sampleSize?: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Check authentication
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check admin status
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (adminError || !adminData) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Route based on method
    switch (req.method) {
      case 'GET':
        return handleGetConfig(req, res);
      case 'PUT':
        return handleUpdateConfig(req, res, user.id);
      case 'POST':
        return handlePostRequest(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Scoring config API error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}

/**
 * GET /api/admin/scoring-config
 * Get current scoring configuration with statistics
 */
async function handleGetConfig(req: VercelRequest, res: VercelResponse) {
  try {
    // Get current configuration
    const config = await scoringConfigLoader.getConfig();
    const source = scoringConfigLoader.getSource();

    // Get statistics if requested
    let statistics;
    if (req.query.includeStats === 'true') {
      statistics = await getStatistics(config);
    }

    const response: GetConfigResponse = {
      config,
      source,
      statistics
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Failed to get config:', error);
    return res.status(500).json({ error: 'Failed to retrieve configuration' });
  }
}

/**
 * PUT /api/admin/scoring-config
 * Update scoring configuration
 */
async function handleUpdateConfig(
  req: VercelRequest, 
  res: VercelResponse,
  userId: string
) {
  try {
    const { config, threshold, reason } = req.body as UpdateConfigRequest;

    if (!config && threshold === undefined) {
      return res.status(400).json({ error: 'No configuration changes provided' });
    }

    // Prepare update
    const updates: any = {};
    
    if (config) {
      // Merge with current config
      const currentConfig = await scoringConfigLoader.getConfig();
      updates.scoring_config = {
        ...currentConfig,
        ...config,
        metadata: {
          ...currentConfig.metadata,
          lastUpdated: new Date().toISOString(),
          updatedBy: userId
        }
      };
    }

    if (threshold !== undefined) {
      if (threshold < 0 || threshold > 10) {
        return res.status(400).json({ error: 'Threshold must be between 0 and 10' });
      }
      updates.auto_approve_threshold = threshold;
    }

    // Update in database
    const { data, error } = await supabase
      .from('feature_flags')
      .update(updates)
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log to history
    await logConfigChange(updates, userId, reason);

    // Clear cache
    await scoringConfigLoader.getConfig(true);

    return res.status(200).json({
      success: true,
      config: data.scoring_config,
      threshold: data.auto_approve_threshold,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    console.error('Failed to update config:', error);
    return res.status(500).json({ error: 'Failed to update configuration' });
  }
}

/**
 * POST /api/admin/scoring-config/*
 * Handle various POST endpoints
 */
async function handlePostRequest(req: VercelRequest, res: VercelResponse) {
  const endpoint = req.url?.split('/').pop();

  switch (endpoint) {
    case 'test':
      return handleTestScoring(req, res);
    case 'simulate':
      return handleSimulation(req, res);
    case 'reset':
      return handleReset(req, res);
    default:
      return res.status(404).json({ error: 'Endpoint not found' });
  }
}

/**
 * POST /api/admin/scoring-config/test
 * Test scoring with sample data
 */
async function handleTestScoring(req: VercelRequest, res: VercelResponse) {
  try {
    const { 
      answers, 
      testConfig, 
      includeProfile = false, 
      includeEquipment = false 
    } = req.body as TestScoringRequest;

    if (!answers) {
      return res.status(400).json({ error: 'Answers required for testing' });
    }

    // Fetch profile/equipment data if requested
    let profileData;
    let equipmentData;

    if (includeProfile) {
      profileData = await scoringEngine.fetchProfileData(answers.email);
    }

    if (includeEquipment && profileData?.userId) {
      equipmentData = await scoringEngine.fetchEquipmentData(profileData.userId);
    }

    // Score with test config if provided
    const result = testConfig
      ? await scoringEngine.simulateScoring(answers, testConfig)
      : await scoringEngine.scoreApplication(answers, profileData || undefined, equipmentData || undefined);

    return res.status(200).json({
      score: result.cappedTotal,
      breakdown: result.breakdown,
      metadata: result.metadata,
      profileData,
      equipmentData
    });
  } catch (error) {
    console.error('Test scoring failed:', error);
    return res.status(500).json({ error: 'Failed to test scoring' });
  }
}

/**
 * POST /api/admin/scoring-config/simulate
 * Simulate scoring changes across pending applications
 */
async function handleSimulation(req: VercelRequest, res: VercelResponse) {
  try {
    const { testConfig, testThreshold, sampleSize = 100 } = req.body as SimulateRequest;

    if (!testConfig) {
      return res.status(400).json({ error: 'Test configuration required' });
    }

    // Get sample of pending applications
    const { data: applications, error } = await supabase
      .from('waitlist_applications')
      .select('*')
      .eq('status', 'pending')
      .limit(sampleSize);

    if (error || !applications) {
      throw new Error('Failed to fetch applications');
    }

    // Score with current and test configurations
    const currentResults = await Promise.all(
      applications.map(app => 
        scoringEngine.scoreApplication(app.answers as WaitlistAnswers)
      )
    );

    const testResults = await Promise.all(
      applications.map(app => 
        scoringEngine.simulateScoring(app.answers as WaitlistAnswers, testConfig)
      )
    );

    // Calculate changes
    const threshold = testThreshold || testConfig.autoApproval?.threshold || 4;
    const changes = applications.map((app, i) => ({
      email: app.email,
      currentScore: currentResults[i].cappedTotal,
      newScore: testResults[i].cappedTotal,
      scoreDiff: testResults[i].cappedTotal - currentResults[i].cappedTotal,
      currentAutoApprove: currentResults[i].metadata.autoApproveEligible,
      newAutoApprove: testResults[i].cappedTotal >= threshold
    }));

    // Calculate statistics
    const stats = {
      totalApplications: applications.length,
      averageScoreChange: changes.reduce((sum, c) => sum + c.scoreDiff, 0) / changes.length,
      currentAutoApproveCount: changes.filter(c => c.currentAutoApprove).length,
      newAutoApproveCount: changes.filter(c => c.newAutoApprove).length,
      gainedAutoApproval: changes.filter(c => !c.currentAutoApprove && c.newAutoApprove).length,
      lostAutoApproval: changes.filter(c => c.currentAutoApprove && !c.newAutoApprove).length
    };

    return res.status(200).json({
      simulation: {
        sampleSize: applications.length,
        changes: changes.slice(0, 10), // Return first 10 for review
        statistics: stats
      }
    });
  } catch (error) {
    console.error('Simulation failed:', error);
    return res.status(500).json({ error: 'Failed to run simulation' });
  }
}

/**
 * POST /api/admin/scoring-config/reset
 * Reset to default configuration
 */
async function handleReset(req: VercelRequest, res: VercelResponse) {
  try {
    const success = await scoringConfigLoader.resetToDefault();
    
    if (!success) {
      throw new Error('Failed to reset configuration');
    }

    return res.status(200).json({
      success: true,
      config: DEFAULT_SCORING_CONFIG,
      message: 'Configuration reset to defaults'
    });
  } catch (error) {
    console.error('Reset failed:', error);
    return res.status(500).json({ error: 'Failed to reset configuration' });
  }
}

/**
 * Get scoring statistics
 */
async function getStatistics(config: ScoringConfig) {
  try {
    // Get pending applications
    const { data: applications, error } = await supabase
      .from('waitlist_applications')
      .select('score')
      .eq('status', 'pending');

    if (error || !applications) {
      return undefined;
    }

    // Calculate statistics
    const scores = applications.map(a => a.score || 0);
    const averageScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    
    // Score distribution
    const distribution: Record<number, number> = {};
    scores.forEach(score => {
      distribution[score] = (distribution[score] || 0) + 1;
    });

    // Count auto-approve eligible
    const wouldAutoApprove = scores.filter(s => s >= config.autoApproval.threshold).length;

    return {
      pendingApplications: applications.length,
      averageScore: Math.round(averageScore * 10) / 10,
      scoreDistribution: distribution,
      wouldAutoApprove
    };
  } catch (error) {
    console.error('Failed to get statistics:', error);
    return undefined;
  }
}

/**
 * Log configuration change to history
 */
async function logConfigChange(
  updates: any,
  userId: string,
  reason?: string
) {
  try {
    await supabase
      .from('scoring_config_history')
      .insert({
        config_version: updates.scoring_config?.version || '1.0.0',
        config: updates.scoring_config || {},
        auto_approve_threshold: updates.auto_approve_threshold,
        updated_by: userId,
        change_reason: reason
      });
  } catch (error) {
    console.error('Failed to log config change:', error);
  }
}