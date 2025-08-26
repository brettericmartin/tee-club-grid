# Scoring Configuration Guide

## Overview

The Teed.club waitlist scoring system is now fully configurable without requiring code deployment. This guide explains how to tune scoring weights, adjust auto-approval thresholds, and test changes safely.

## Table of Contents
1. [Configuration Structure](#configuration-structure)
2. [Configuration Sources](#configuration-sources)
3. [Scoring Categories](#scoring-categories)
4. [Profile & Equipment Bonuses](#profile--equipment-bonuses)
5. [Auto-Approval Settings](#auto-approval-settings)
6. [Using the Simulator](#using-the-simulator)
7. [API Endpoints](#api-endpoints)
8. [Best Practices](#best-practices)
9. [Testing & Validation](#testing--validation)
10. [Rollback Procedures](#rollback-procedures)

## Configuration Structure

The scoring configuration is stored as JSONB in the `feature_flags` table:

```json
{
  "version": "1.0.0",
  "weights": {
    "role": {
      "fitter_builder": 3,
      "creator": 2,
      "league_captain": 1,
      "golfer": 0,
      "retailer_other": 0
    },
    "shareChannels": {
      "reddit": 1,
      "golfwrx": 1,
      "socialMedia": 1,
      "cap": 2
    },
    "learnChannels": {
      "youtube": 1,
      "reddit": 1,
      "fitterBuilder": 1,
      "manufacturerSites": 1,
      "cap": 3
    },
    "uses": {
      "discoverDeepDive": 1,
      "followFriends": 1,
      "trackBuilds": 1,
      "cap": 2
    },
    "buyFrequency": {
      "never": 0,
      "yearly_1_2": 0,
      "few_per_year": 1,
      "monthly": 2,
      "weekly_plus": 2
    },
    "shareFrequency": {
      "never": 0,
      "yearly_1_2": 0,
      "few_per_year": 1,
      "monthly": 2,
      "weekly_plus": 2
    },
    "location": {
      "phoenixMetro": 1
    },
    "inviteCode": {
      "present": 2
    },
    "profileCompletion": {
      "threshold": 80,
      "bonus": 1
    },
    "equipmentEngagement": {
      "firstItem": 1,
      "multipleItemsThreshold": 5,
      "multipleItemsBonus": 2,
      "photoBonus": 1
    },
    "totalCap": 10
  },
  "autoApproval": {
    "threshold": 4,
    "requireEmailVerification": true,
    "capacityBuffer": 10
  },
  "metadata": {
    "lastUpdated": "2024-01-01T00:00:00Z",
    "updatedBy": "admin-user-id",
    "description": "Q1 2024 scoring configuration"
  }
}
```

## Configuration Sources

The system checks for configuration in this priority order:

1. **Database** (Recommended)
   - Stored in `feature_flags.scoring_config`
   - Can be updated via admin API
   - Changes take effect immediately
   - Includes audit trail

2. **Environment Variables**
   - Set `SCORING_CONFIG` or `VITE_SCORING_CONFIG`
   - JSON string format
   - Requires restart to apply
   - Good for staging/testing

3. **Default Configuration**
   - Hard-coded fallback
   - Used if no other config found
   - Ensures system always works

## Scoring Categories

### Role Weights (0-3 points)
- **fitter_builder**: 3 - High-value users with expertise
- **creator**: 2 - Content creators drive engagement
- **league_captain**: 1 - Community organizers
- **golfer**: 0 - General users
- **retailer_other**: 0 - Commercial accounts

### Share Channels (0-2 points, capped)
- **reddit**: 1 - Active golf community
- **golfwrx**: 1 - Dedicated golf forum
- **socialMedia**: 1 - Instagram/TikTok/YouTube

### Learn Channels (0-3 points, capped)
- **youtube**: 1 - Video content consumption
- **reddit**: 1 - Community discussions
- **fitterBuilder**: 1 - Professional resources
- **manufacturerSites**: 1 - Brand engagement

### Platform Uses (0-2 points, capped)
- **discoverDeepDive**: 1 - Research intent
- **followFriends**: 1 - Social engagement
- **trackBuilds**: 1 - Active participation

### Frequency Scores
- **Buy Frequency** (0-2 points)
  - never: 0
  - yearly_1_2: 0
  - few_per_year: 1
  - monthly: 2
  - weekly_plus: 2

- **Share Frequency** (0-2 points)
  - never: 0
  - yearly_1_2: 0
  - few_per_year: 1
  - monthly: 2
  - weekly_plus: 2

### Special Bonuses
- **Location**: Phoenix metro area: 1 point
- **Invite Code**: Valid code: 2 points

## Profile & Equipment Bonuses

### Profile Completion Bonus
- **Threshold**: 80% complete
- **Bonus**: 1 point
- **Tracked Fields**:
  - Display name
  - Bio
  - Location
  - Handicap
  - Favorite club
  - Profile photo

### Equipment Engagement
- **First Item**: 1 point for adding first equipment
- **Multiple Items**: 2 points for 5+ items
- **Photo Bonus**: 1 point for uploading equipment photos

## Auto-Approval Settings

### Threshold Configuration
- **Default**: 4 points
- **Range**: 0-10 points
- **Recommendation**: 4-6 for balanced approval

### Capacity Management
- **capacityBuffer**: Reserve spots for manual approvals
- **Default**: 10 spots reserved
- **Purpose**: Ensure space for VIP/special cases

### Email Verification
- **requireEmailVerification**: true/false
- **Default**: true
- **Impact**: Prevents bot submissions

## Using the Simulator

### Access the Simulator
1. Navigate to `/admin/scoring-simulator`
2. Requires admin authentication
3. Load current configuration automatically

### Test Individual Scores
1. Select "Test Scoring" tab
2. Configure test application parameters
3. Click "Calculate Score"
4. View breakdown and auto-approval eligibility

### Simulate Bulk Impact
1. Select "Simulate Impact" tab
2. Adjust weights and threshold
3. Click "Run Simulation"
4. Review statistics:
   - Average score change
   - Auto-approval count change
   - Users gaining/losing eligibility

### Save Changes
1. Review all modifications
2. Click "Save Changes"
3. Changes apply immediately
4. History tracked for rollback

## API Endpoints

### Get Current Configuration
```bash
GET /api/admin/scoring-config?includeStats=true
Authorization: Bearer {token}

Response:
{
  "config": { ... },
  "source": "database",
  "statistics": {
    "pendingApplications": 150,
    "averageScore": 4.5,
    "scoreDistribution": { "0": 10, "1": 20, ... },
    "wouldAutoApprove": 75
  }
}
```

### Update Configuration
```bash
PUT /api/admin/scoring-config
Authorization: Bearer {token}
Content-Type: application/json

{
  "config": { ... },
  "threshold": 5,
  "reason": "Q1 2024 adjustment"
}
```

### Test Scoring
```bash
POST /api/admin/scoring-config/test
Authorization: Bearer {token}
Content-Type: application/json

{
  "answers": { ... },
  "testConfig": { ... },
  "includeProfile": true,
  "includeEquipment": true
}
```

### Simulate Changes
```bash
POST /api/admin/scoring-config/simulate
Authorization: Bearer {token}
Content-Type: application/json

{
  "testConfig": { ... },
  "testThreshold": 5,
  "sampleSize": 100
}
```

## Best Practices

### 1. Test Before Applying
- Always run simulations first
- Review impact on pending applications
- Check score distribution changes
- Verify auto-approval counts

### 2. Gradual Adjustments
- Change weights incrementally (±1 point)
- Monitor conversion rates
- Track user quality metrics
- Adjust based on data

### 3. Document Changes
- Always provide change reason
- Track configuration versions
- Maintain change log
- Review historical performance

### 4. Monitor Impact
- Track daily approval rates
- Monitor user activation
- Check engagement metrics
- Review referral effectiveness

### 5. A/B Testing Strategy
- Test threshold changes on small batches
- Compare cohort performance
- Measure long-term retention
- Optimize for quality over quantity

## Testing & Validation

### Unit Tests
```bash
# Run scoring engine tests
npm test src/lib/__tests__/scoring-engine.test.ts
```

### Integration Tests
```bash
# Test with real data
node scripts/test-scoring-config.js
```

### Data Drift Detection
The test suite includes drift detection to alert when:
- Expected scores change unexpectedly
- Configuration parsing fails
- Edge cases produce errors
- Performance degrades

### Performance Benchmarks
- Single score calculation: < 10ms
- Batch scoring (100 items): < 500ms
- Configuration load: < 50ms
- Simulation (100 samples): < 1s

## Rollback Procedures

### Quick Rollback
1. Access scoring simulator
2. Click "Reset to Defaults"
3. Save changes
4. Verify with simulation

### History-Based Rollback
```sql
-- View configuration history
SELECT * FROM scoring_config_history 
ORDER BY updated_at DESC 
LIMIT 10;

-- Rollback to specific version
UPDATE feature_flags 
SET scoring_config = (
  SELECT config 
  FROM scoring_config_history 
  WHERE id = 'history-id-here'
)
WHERE id = 1;
```

### Emergency Reset
```sql
-- Reset to hardcoded defaults
UPDATE feature_flags 
SET 
  scoring_config = NULL,
  auto_approve_threshold = 4
WHERE id = 1;
```

## Troubleshooting

### Common Issues

**Configuration Not Loading**
- Check database connection
- Verify admin authentication
- Review server logs
- Check CORS settings

**Scores Not Updating**
- Clear configuration cache
- Force reload: `getConfig(true)`
- Check for syntax errors in JSON
- Verify weight paths

**Simulation Failures**
- Check sample data availability
- Verify API authentication
- Review memory limits
- Check timeout settings

### Debug Mode
Enable debug logging:
```javascript
// In scoring-config.ts
const DEBUG = true;
```

### Support
For issues or questions:
- Check server logs: `/api/logs/scoring`
- Review history: `scoring_config_history` table
- Contact: dev-team@teed.club