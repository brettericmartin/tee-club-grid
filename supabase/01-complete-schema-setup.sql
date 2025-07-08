-- Complete Schema Setup for Tee Club Grid
-- Run this first to ensure all tables exist with correct structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table if not exists
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  handicap NUMERIC(3,1),
  location TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create equipment table
CREATE TABLE IF NOT EXISTS equipment (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('driver', 'fairway_wood', 'hybrid', 'irons', 'wedges', 'putter', 'golf_ball', 'accessories')),
  image_url TEXT,
  msrp NUMERIC(10,2),
  specs JSONB DEFAULT '{}',
  features TEXT[],
  description TEXT,
  release_date DATE,
  popularity_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create user_bags table (this is the main bags table)
CREATE TABLE IF NOT EXISTS user_bags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Bag',
  description TEXT,
  is_public BOOLEAN DEFAULT true,
  background_image TEXT DEFAULT 'midwest-lush',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create bag_equipment table
CREATE TABLE IF NOT EXISTS bag_equipment (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  bag_id UUID REFERENCES user_bags(id) ON DELETE CASCADE NOT NULL,
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE NOT NULL,
  is_featured BOOLEAN DEFAULT false,
  purchase_date DATE,
  purchase_price NUMERIC(10,2),
  notes TEXT,
  custom_specs JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(bag_id, equipment_id)
);

-- Create bag_likes table
CREATE TABLE IF NOT EXISTS bag_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  bag_id UUID REFERENCES user_bags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, bag_id)
);

-- Create user_follows table
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Create feed_posts table
CREATE TABLE IF NOT EXISTS feed_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('new_equipment', 'bag_update', 'milestone', 'playing')),
  content JSONB NOT NULL DEFAULT '{}',
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create equipment_reviews table
CREATE TABLE IF NOT EXISTS equipment_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  pros TEXT[],
  cons TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, equipment_id)
);

-- Create equipment_photos table
CREATE TABLE IF NOT EXISTS equipment_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_bags_user_id ON user_bags(user_id);
CREATE INDEX IF NOT EXISTS idx_bag_equipment_bag_id ON bag_equipment(bag_id);
CREATE INDEX IF NOT EXISTS idx_bag_equipment_equipment_id ON bag_equipment(equipment_id);
CREATE INDEX IF NOT EXISTS idx_bag_likes_bag_id ON bag_likes(bag_id);
CREATE INDEX IF NOT EXISTS idx_bag_likes_user_id ON bag_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category);
CREATE INDEX IF NOT EXISTS idx_equipment_brand ON equipment(brand);
CREATE INDEX IF NOT EXISTS idx_feed_posts_user_id ON feed_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_type ON feed_posts(type);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_bags_updated_at ON user_bags;
CREATE TRIGGER update_user_bags_updated_at BEFORE UPDATE ON user_bags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_equipment_reviews_updated_at ON equipment_reviews;
CREATE TRIGGER update_equipment_reviews_updated_at BEFORE UPDATE ON equipment_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Profiles
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Equipment (public read)
CREATE POLICY "Equipment is viewable by everyone" ON equipment
  FOR SELECT USING (true);

-- User bags
CREATE POLICY "Public bags are viewable by everyone" ON user_bags
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create own bags" ON user_bags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bags" ON user_bags
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bags" ON user_bags
  FOR DELETE USING (auth.uid() = user_id);

-- Bag equipment
CREATE POLICY "Bag equipment viewable if bag is viewable" ON bag_equipment
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_bags 
      WHERE user_bags.id = bag_equipment.bag_id 
      AND (user_bags.is_public = true OR user_bags.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage own bag equipment" ON bag_equipment
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_bags 
      WHERE user_bags.id = bag_equipment.bag_id 
      AND user_bags.user_id = auth.uid()
    )
  );

-- Bag likes
CREATE POLICY "Bag likes are viewable by everyone" ON bag_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can create own bag likes" ON bag_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bag likes" ON bag_likes
  FOR DELETE USING (auth.uid() = user_id);

-- User follows
CREATE POLICY "Follows are viewable by everyone" ON user_follows
  FOR SELECT USING (true);

CREATE POLICY "Users can create own follows" ON user_follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete own follows" ON user_follows
  FOR DELETE USING (auth.uid() = follower_id);

-- Feed posts
CREATE POLICY "Feed posts are viewable by everyone" ON feed_posts
  FOR SELECT USING (true);

CREATE POLICY "Users can create own posts" ON feed_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" ON feed_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON feed_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Equipment reviews
CREATE POLICY "Equipment reviews are viewable by everyone" ON equipment_reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create own reviews" ON equipment_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON equipment_reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews" ON equipment_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- Equipment photos
CREATE POLICY "Equipment photos are viewable by everyone" ON equipment_photos
  FOR SELECT USING (true);

CREATE POLICY "Users can upload own photos" ON equipment_photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own photos" ON equipment_photos
  FOR DELETE USING (auth.uid() = user_id);