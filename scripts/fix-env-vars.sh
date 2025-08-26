#!/bin/bash

# Update all API files to support both SUPABASE_SERVICE_KEY and SUPABASE_SERVICE_ROLE_KEY

files=(
  "api/invites/list.ts"
  "api/invites/issue.ts"
  "api/invites/revoke.ts"
  "api/referral/attribute.ts"
  "api/beta/redeem.ts"
  "api/beta/summary-enhanced.ts"
  "api/referrals/leaderboard.ts"
  "api/admin/scoring-config.ts"
  "api/cron/recalc-beta-stats.ts"
  "api/waitlist/export.ts"
  "api/waitlist/approve.ts"
  "api/waitlist/bulk-reject.ts"
  "api/waitlist/me.ts"
  "api/waitlist/redeem.ts"
  "api/waitlist/bulk-approve.ts"
  "api/waitlist/submit.ts"
  "api/analytics/track.ts"
  "api/links/redirect.ts"
  "api/equipment/analyze-image.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Updating $file"
    sed -i 's/process\.env\.SUPABASE_SERVICE_KEY || '"'"''"'"'/process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '"'"''"'"'/g' "$file"
  fi
done

echo "Done! Updated all API files to support both environment variable names."