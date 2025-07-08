-- Migration Script: Consolidate 'bags' table to 'user_bags'
-- This script handles the migration from the old 'bags' table to 'user_bags'

-- Step 1: Check if both tables exist
DO $$
DECLARE
    bags_exists boolean;
    user_bags_exists boolean;
BEGIN
    -- Check if 'bags' table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bags'
    ) INTO bags_exists;
    
    -- Check if 'user_bags' table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_bags'
    ) INTO user_bags_exists;
    
    -- Report findings
    IF bags_exists AND user_bags_exists THEN
        RAISE NOTICE 'Both bags and user_bags tables exist. Migration needed.';
    ELSIF bags_exists AND NOT user_bags_exists THEN
        RAISE NOTICE 'Only bags table exists. Renaming to user_bags.';
    ELSIF NOT bags_exists AND user_bags_exists THEN
        RAISE NOTICE 'Only user_bags table exists. No migration needed.';
    ELSE
        RAISE NOTICE 'Neither table exists. Run schema creation first.';
    END IF;
END $$;

-- Step 2: If only 'bags' exists, rename it to 'user_bags'
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bags')
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_bags') THEN
        
        -- Rename the table
        ALTER TABLE bags RENAME TO user_bags;
        
        -- Rename constraints
        ALTER TABLE user_bags RENAME CONSTRAINT bags_pkey TO user_bags_pkey;
        ALTER TABLE user_bags RENAME CONSTRAINT bags_user_id_fkey TO user_bags_user_id_fkey;
        
        -- Rename indexes
        ALTER INDEX IF EXISTS idx_bags_user_id RENAME TO idx_user_bags_user_id;
        
        RAISE NOTICE 'Renamed bags table to user_bags';
    END IF;
END $$;

-- Step 3: If both exist, migrate data from 'bags' to 'user_bags'
DO $$
DECLARE
    migrated_count integer;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bags')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_bags') THEN
        
        -- Migrate data
        INSERT INTO user_bags (id, user_id, name, description, is_public, background_image, created_at, updated_at)
        SELECT id, user_id, name, description, is_public, background_image, created_at, updated_at
        FROM bags
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            is_public = EXCLUDED.is_public,
            background_image = EXCLUDED.background_image,
            updated_at = EXCLUDED.updated_at;
        
        GET DIAGNOSTICS migrated_count = ROW_COUNT;
        RAISE NOTICE 'Migrated % bags from bags to user_bags', migrated_count;
        
        -- Check if bag_equipment references need updating
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'bag_equipment' 
            AND column_name = 'bag_id'
        ) THEN
            -- Update foreign key if it points to bags
            IF EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_type = 'FOREIGN KEY' 
                AND table_name = 'bag_equipment'
                AND constraint_name LIKE '%bags%'
            ) THEN
                ALTER TABLE bag_equipment DROP CONSTRAINT IF EXISTS bag_equipment_bag_id_fkey;
                ALTER TABLE bag_equipment ADD CONSTRAINT bag_equipment_bag_id_fkey 
                    FOREIGN KEY (bag_id) REFERENCES user_bags(id) ON DELETE CASCADE;
                RAISE NOTICE 'Updated bag_equipment foreign key to reference user_bags';
            END IF;
        END IF;
        
        -- Update likes table if needed
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'likes' 
            AND column_name = 'bag_id'
        ) THEN
            ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_bag_id_fkey;
            ALTER TABLE likes ADD CONSTRAINT likes_bag_id_fkey 
                FOREIGN KEY (bag_id) REFERENCES user_bags(id) ON DELETE CASCADE;
            RAISE NOTICE 'Updated likes foreign key to reference user_bags';
        END IF;
        
        -- Backup old bags table before dropping
        ALTER TABLE bags RENAME TO bags_backup_20240101;
        RAISE NOTICE 'Renamed old bags table to bags_backup_20240101';
        
        -- Note: To completely remove the backup table later, run:
        -- DROP TABLE bags_backup_20240101 CASCADE;
    END IF;
END $$;

-- Step 4: Create bag_likes table if using old schema with generic likes table
DO $$
BEGIN
    -- If bag_likes doesn't exist but we have bag likes in a generic likes table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bag_likes')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'likes' AND column_name = 'bag_id') THEN
        
        -- Create bag_likes table
        CREATE TABLE bag_likes (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
            bag_id UUID REFERENCES user_bags(id) ON DELETE CASCADE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
            UNIQUE(user_id, bag_id)
        );
        
        -- Migrate bag likes from generic likes table
        INSERT INTO bag_likes (user_id, bag_id, created_at)
        SELECT user_id, bag_id, created_at
        FROM likes
        WHERE bag_id IS NOT NULL
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Created bag_likes table and migrated data from likes table';
        
        -- Enable RLS
        ALTER TABLE bag_likes ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Bag likes are viewable by everyone" ON bag_likes
            FOR SELECT USING (true);
        
        CREATE POLICY "Users can create own bag likes" ON bag_likes
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can delete own bag likes" ON bag_likes
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Step 5: Verify migration
DO $$
DECLARE
    user_bags_count integer;
    bag_equipment_count integer;
    bag_likes_count integer;
BEGIN
    SELECT COUNT(*) INTO user_bags_count FROM user_bags;
    SELECT COUNT(*) INTO bag_equipment_count FROM bag_equipment;
    SELECT COUNT(*) INTO bag_likes_count FROM bag_likes;
    
    RAISE NOTICE 'Migration complete. Counts:';
    RAISE NOTICE '  user_bags: %', user_bags_count;
    RAISE NOTICE '  bag_equipment: %', bag_equipment_count;
    RAISE NOTICE '  bag_likes: %', bag_likes_count;
END $$;