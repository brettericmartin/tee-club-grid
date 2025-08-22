#!/bin/bash

echo "========================================================================="
echo "APPLYING RLS POLICIES FOR AFFILIATE VIDEO FEATURES"
echo "========================================================================="
echo ""
echo "Since automated execution isn't available, please follow these steps:"
echo ""
echo "📋 MANUAL STEPS REQUIRED:"
echo ""
echo "1. Open your Supabase Dashboard:"
echo "   https://app.supabase.com"
echo ""
echo "2. Navigate to your project (Teed.club)"
echo ""
echo "3. Click on 'SQL Editor' in the left sidebar"
echo ""
echo "4. Click 'New Query' button"
echo ""
echo "5. Copy ALL contents from this file:"
echo "   scripts/fix-affiliate-video-rls-policies.sql"
echo ""
echo "6. Paste the SQL into the editor"
echo ""
echo "7. Click 'Run' button (or press Cmd/Ctrl + Enter)"
echo ""
echo "8. You should see success messages for each statement"
echo ""
echo "========================================================================="
echo "WHAT THIS WILL DO:"
echo "========================================================================="
echo ""
echo "✅ Enable RLS on 4 tables:"
echo "   • user_equipment_links"
echo "   • equipment_videos"
echo "   • user_bag_videos"
echo "   • link_clicks"
echo ""
echo "✅ Create proper security policies:"
echo "   • Public read access where appropriate"
echo "   • Owner-only write operations"
echo "   • Anonymous link click tracking"
echo "   • Correct column names (created_at not clicked_at)"
echo ""
echo "✅ Add performance indexes for RLS queries"
echo ""
echo "========================================================================="
echo "VERIFICATION:"
echo "========================================================================="
echo ""
echo "After running the SQL, verify with:"
echo "  node scripts/verify-affiliate-rls.js"
echo ""
echo "========================================================================="
echo ""
echo "Press Enter to open the SQL file in your default editor..."
read

# Try to open the file in the default editor
if command -v code &> /dev/null; then
    code scripts/fix-affiliate-video-rls-policies.sql
elif command -v open &> /dev/null; then
    open scripts/fix-affiliate-video-rls-policies.sql
elif command -v xdg-open &> /dev/null; then
    xdg-open scripts/fix-affiliate-video-rls-policies.sql
else
    cat scripts/fix-affiliate-video-rls-policies.sql
fi