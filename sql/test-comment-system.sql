-- Test the comment system setup

-- Check tables exist
SELECT 
  'feed_comments' as table_name, 
  COUNT(*) as column_count 
FROM information_schema.columns 
WHERE table_name = 'feed_comments'
UNION ALL
SELECT 
  'comment_tees' as table_name, 
  COUNT(*) as column_count 
FROM information_schema.columns 
WHERE table_name = 'comment_tees'
UNION ALL
SELECT 
  'comment_downvotes' as table_name, 
  COUNT(*) as column_count 
FROM information_schema.columns 
WHERE table_name = 'comment_downvotes';

-- Check RLS is enabled
SELECT 
  tablename,
  rowsecurity 
FROM pg_tables 
WHERE tablename IN ('feed_comments', 'comment_tees', 'comment_downvotes') 
  AND schemaname = 'public';