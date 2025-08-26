/**
 * Scoring Configuration Module
 * Centralized configuration for waitlist scoring system
 * Supports runtime updates via database or environment variables
 */

import { supabase } from '@/lib/supabase';

// Scoring weight configuration types
export interface ScoringWeights {
  role: {
    fitter_builder: number;
    creator: number;
    league_captain: number;
    golfer: number;
    retailer_other: number;
  };
  shareChannels: {
    reddit: number;
    golfwrx: number;
    socialMedia: number; // instagram/tiktok/youtube
    cap: number;
  };
  learnChannels: {
    youtube: number;
    reddit: number;
    fitterBuilder: number;
    manufacturerSites: number;
    cap: number;
  };
  uses: {
    discoverDeepDive: number;
    followFriends: number;
    trackBuilds: number;
    cap: number;
  };
  buyFrequency: {
    never: number;
    yearly_1_2: number;
    few_per_year: number;
    monthly: number;
    weekly_plus: number;
  };
  shareFrequency: {
    never: number;
    yearly_1_2: number;
    few_per_year: number;
    monthly: number;
    weekly_plus: number;
  };
  location: {
    phoenixMetro: number;
  };
  inviteCode: {
    present: number;
  };
  // New engagement bonuses
  profileCompletion: {
    threshold: number; // Percentage threshold (0-100)
    bonus: number;
  };
  equipmentEngagement: {
    firstItem: number;
    multipleItemsThreshold: number; // Number of items
    multipleItemsBonus: number;
    photoBonus: number;
  };
  totalCap: number;
}

// Auto-approval configuration
export interface AutoApprovalConfig {
  threshold: number;
  requireEmailVerification: boolean;
  capacityBuffer: number; // Reserve spots for manual approvals
}

// Complete scoring configuration
export interface ScoringConfig {
  version: string;
  weights: ScoringWeights;
  autoApproval: AutoApprovalConfig;
  metadata: {
    lastUpdated: string;
    updatedBy?: string;
    description?: string;
  };
}

// Default configuration (current hard-coded values)
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  version: '1.0.0',
  weights: {
    role: {
      fitter_builder: 3,
      creator: 2,
      league_captain: 1,
      golfer: 0,
      retailer_other: 0
    },
    shareChannels: {
      reddit: 1,
      golfwrx: 1,
      socialMedia: 1,
      cap: 2
    },
    learnChannels: {
      youtube: 1,
      reddit: 1,
      fitterBuilder: 1,
      manufacturerSites: 1,
      cap: 3
    },
    uses: {
      discoverDeepDive: 1,
      followFriends: 1,
      trackBuilds: 1,
      cap: 2
    },
    buyFrequency: {
      never: 0,
      yearly_1_2: 0,
      few_per_year: 1,
      monthly: 2,
      weekly_plus: 2
    },
    shareFrequency: {
      never: 0,
      yearly_1_2: 0,
      few_per_year: 1,
      monthly: 2,
      weekly_plus: 2
    },
    location: {
      phoenixMetro: 1
    },
    inviteCode: {
      present: 2
    },
    profileCompletion: {
      threshold: 80, // 80% complete
      bonus: 1
    },
    equipmentEngagement: {
      firstItem: 1,
      multipleItemsThreshold: 5,
      multipleItemsBonus: 2,
      photoBonus: 1
    },
    totalCap: 10
  },
  autoApproval: {
    threshold: 4,
    requireEmailVerification: true,
    capacityBuffer: 10
  },
  metadata: {
    lastUpdated: new Date().toISOString(),
    description: 'Default scoring configuration'
  }
};

// Configuration source priority
export enum ConfigSource {
  DATABASE = 'database',
  ENVIRONMENT = 'environment',
  DEFAULT = 'default'
}

// Configuration loader class
export class ScoringConfigLoader {
  private static instance: ScoringConfigLoader;
  private config: ScoringConfig | null = null;
  private source: ConfigSource = ConfigSource.DEFAULT;
  private lastFetched: Date | null = null;
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): ScoringConfigLoader {
    if (!ScoringConfigLoader.instance) {
      ScoringConfigLoader.instance = new ScoringConfigLoader();
    }
    return ScoringConfigLoader.instance;
  }

  /**
   * Get the current scoring configuration
   * Checks database first, then environment, then falls back to default
   */
  public async getConfig(forceRefresh = false): Promise<ScoringConfig> {
    // Return cached config if valid
    if (!forceRefresh && this.config && this.isCacheValid()) {
      return this.config;
    }

    // Try to load from database first
    const dbConfig = await this.loadFromDatabase();
    if (dbConfig) {
      this.config = dbConfig;
      this.source = ConfigSource.DATABASE;
      this.lastFetched = new Date();
      return this.config;
    }

    // Try to load from environment variables
    const envConfig = this.loadFromEnvironment();
    if (envConfig) {
      this.config = envConfig;
      this.source = ConfigSource.ENVIRONMENT;
      this.lastFetched = new Date();
      return this.config;
    }

    // Fall back to default configuration
    this.config = DEFAULT_SCORING_CONFIG;
    this.source = ConfigSource.DEFAULT;
    this.lastFetched = new Date();
    return this.config;
  }

  /**
   * Load configuration from database
   */
  private async loadFromDatabase(): Promise<ScoringConfig | null> {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('scoring_config, auto_approve_threshold')
        .eq('id', 1)
        .single();

      if (error || !data?.scoring_config) {
        return null;
      }

      // Merge database config with defaults
      const config: ScoringConfig = {
        ...DEFAULT_SCORING_CONFIG,
        ...data.scoring_config,
        autoApproval: {
          ...DEFAULT_SCORING_CONFIG.autoApproval,
          ...(data.scoring_config.autoApproval || {}),
          threshold: data.auto_approve_threshold || DEFAULT_SCORING_CONFIG.autoApproval.threshold
        }
      };

      return this.validateConfig(config) ? config : null;
    } catch (error) {
      console.error('Failed to load scoring config from database:', error);
      return null;
    }
  }

  /**
   * Load configuration from environment variables
   */
  private loadFromEnvironment(): ScoringConfig | null {
    try {
      const configJson = process.env.VITE_SCORING_CONFIG || process.env.SCORING_CONFIG;
      if (!configJson) {
        return null;
      }

      const parsedConfig = JSON.parse(configJson);
      const config: ScoringConfig = {
        ...DEFAULT_SCORING_CONFIG,
        ...parsedConfig,
        metadata: {
          ...DEFAULT_SCORING_CONFIG.metadata,
          ...(parsedConfig.metadata || {}),
          lastUpdated: new Date().toISOString()
        }
      };

      return this.validateConfig(config) ? config : null;
    } catch (error) {
      console.error('Failed to load scoring config from environment:', error);
      return null;
    }
  }

  /**
   * Validate configuration structure
   */
  private validateConfig(config: any): config is ScoringConfig {
    // Basic structure validation
    if (!config.weights || !config.autoApproval) {
      return false;
    }

    // Validate required weight categories exist
    const requiredCategories = ['role', 'shareChannels', 'learnChannels', 'uses', 'buyFrequency', 'shareFrequency'];
    for (const category of requiredCategories) {
      if (!config.weights[category]) {
        console.error(`Missing required weight category: ${category}`);
        return false;
      }
    }

    // Validate auto-approval config
    if (typeof config.autoApproval.threshold !== 'number' || config.autoApproval.threshold < 0) {
      console.error('Invalid auto-approval threshold');
      return false;
    }

    return true;
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    if (!this.lastFetched) {
      return false;
    }
    return Date.now() - this.lastFetched.getTime() < this.CACHE_DURATION_MS;
  }

  /**
   * Update configuration in database (admin only)
   */
  public async updateConfig(config: Partial<ScoringConfig>, updatedBy?: string): Promise<boolean> {
    try {
      const currentConfig = await this.getConfig();
      const newConfig: ScoringConfig = {
        ...currentConfig,
        ...config,
        version: this.incrementVersion(currentConfig.version),
        metadata: {
          ...currentConfig.metadata,
          lastUpdated: new Date().toISOString(),
          updatedBy
        }
      };

      // Validate new configuration
      if (!this.validateConfig(newConfig)) {
        throw new Error('Invalid configuration structure');
      }

      // Save to database
      const { error } = await supabase
        .from('feature_flags')
        .upsert({
          id: 1,
          scoring_config: newConfig,
          auto_approve_threshold: newConfig.autoApproval.threshold
        });

      if (error) {
        throw error;
      }

      // Clear cache to force reload
      this.config = null;
      this.lastFetched = null;

      return true;
    } catch (error) {
      console.error('Failed to update scoring config:', error);
      return false;
    }
  }

  /**
   * Get configuration source
   */
  public getSource(): ConfigSource {
    return this.source;
  }

  /**
   * Increment version number
   */
  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  /**
   * Reset to default configuration
   */
  public async resetToDefault(): Promise<boolean> {
    return this.updateConfig(DEFAULT_SCORING_CONFIG);
  }
}

// Export singleton instance
export const scoringConfigLoader = ScoringConfigLoader.getInstance();