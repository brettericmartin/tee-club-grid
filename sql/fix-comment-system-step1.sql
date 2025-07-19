-- Step 1: Check existing feed_posts types
SELECT DISTINCT type, COUNT(*) FROM feed_posts GROUP BY type ORDER BY COUNT(*) DESC;