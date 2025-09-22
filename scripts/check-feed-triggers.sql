-- Check all triggers related to feed_posts and equipment_photos
SELECT 
    tg.trigger_name,
    tg.event_object_table,
    tg.event_manipulation,
    tg.action_timing,
    tg.action_orientation,
    pg_get_functiondef(p.oid) as function_definition
FROM 
    information_schema.triggers tg
    JOIN pg_proc p ON p.proname = tg.action_statement
WHERE 
    tg.trigger_schema = 'public'
    AND (
        tg.event_object_table IN ('feed_posts', 'equipment_photos')
        OR tg.action_statement LIKE '%feed_post%'
        OR tg.action_statement LIKE '%equipment_photo%'
    )
ORDER BY 
    tg.event_object_table, 
    tg.trigger_name;

-- Also check for any functions that might create feed posts
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM 
    pg_proc
WHERE 
    pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND (
        pg_get_functiondef(oid) ILIKE '%INSERT%INTO%feed_posts%'
        OR pg_get_functiondef(oid) ILIKE '%equipment_photo%feed%'
    );