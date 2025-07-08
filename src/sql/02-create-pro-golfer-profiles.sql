-- Create professional golfer profiles
-- This script creates profiles for demo/showcase purposes
-- Note: These are demo profiles not linked to real auth.users

-- First, let's create a function to bypass RLS for admin operations (optional)
-- You can skip this if you run these queries as a service role

-- Insert pro golfer profiles
-- Using UUIDs that we'll reference later when creating bags
INSERT INTO profiles (id, username, full_name, email, avatar_url, handicap, location, bio, bag_background) VALUES
-- Rory McIlroy
('11111111-1111-1111-1111-111111111111', 'rory_mcilroy', 'Rory McIlroy', 'rory@demo.golf', 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400&h=400&fit=crop', -8.5, 'Northern Ireland', '4-time major champion and former World #1', 'links-coastal'),

-- Scottie Scheffler  
('22222222-2222-2222-2222-222222222222', 'scottie_scheffler', 'Scottie Scheffler', 'scottie@demo.golf', 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=400&h=400&fit=crop', -9.0, 'Dallas, TX', 'Current World #1, Masters Champion', 'augusta-azaleas'),

-- Jon Rahm
('33333333-3333-3333-3333-333333333333', 'jon_rahm', 'Jon Rahm', 'jon@demo.golf', 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400&h=400&fit=crop', -8.8, 'Spain', 'Masters Champion, Spanish Armada', 'desert-dunes'),

-- Viktor Hovland
('44444444-4444-4444-4444-444444444444', 'viktor_hovland', 'Viktor Hovland', 'viktor@demo.golf', 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=400&h=400&fit=crop', -8.2, 'Norway', 'FedEx Cup Champion, Norwegian Thunder', 'mountain-mist'),

-- Xander Schauffele
('55555555-5555-5555-5555-555555555555', 'xander_schauffele', 'Xander Schauffele', 'xander@demo.golf', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop', -8.4, 'San Diego, CA', 'Olympic Gold Medalist, PGA Champion', 'ocean-horizon'),

-- Collin Morikawa
('66666666-6666-6666-6666-666666666666', 'collin_morikawa', 'Collin Morikawa', 'collin@demo.golf', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop', -8.6, 'Los Angeles, CA', '2-time major champion, Iron specialist', 'midwest-lush'),

-- Justin Thomas
('77777777-7777-7777-7777-777777777777', 'justin_thomas', 'Justin Thomas', 'jt@demo.golf', 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400&h=400&fit=crop', -8.7, 'Louisville, KY', 'PGA Champion, Former World #1', 'morning-fog'),

-- Jordan Spieth
('88888888-8888-8888-8888-888888888888', 'jordan_spieth', 'Jordan Spieth', 'jordan@demo.golf', 'https://images.unsplash.com/photo-1593111774642-a746f5006b7b?w=400&h=400&fit=crop', -8.3, 'Dallas, TX', '3-time major champion, Texas Forever', 'sunset-golden'),

-- Patrick Cantlay
('99999999-9999-9999-9999-999999999999', 'patrick_cantlay', 'Patrick Cantlay', 'patrick@demo.golf', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop', -8.5, 'Los Angeles, CA', 'FedEx Cup Champion, Mr. Calculated', 'tropical-palms'),

-- Dustin Johnson
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dustin_johnson', 'Dustin Johnson', 'dj@demo.golf', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop', -8.9, 'Jupiter, FL', 'Masters Champion, Long Ball Specialist', 'pro-tournament');

-- If you need to disable RLS temporarily (run as database owner/service role):
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- Run the INSERT above
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Or create a temporary RLS policy for demo data (if needed):
-- CREATE POLICY "Allow demo profiles" ON profiles
-- FOR ALL USING (
--   id IN (
--     '11111111-1111-1111-1111-111111111111',
--     '22222222-2222-2222-2222-222222222222',
--     '33333333-3333-3333-3333-333333333333',
--     '44444444-4444-4444-4444-444444444444',
--     '55555555-5555-5555-5555-555555555555',
--     '66666666-6666-6666-6666-666666666666',
--     '77777777-7777-7777-7777-777777777777',
--     '88888888-8888-8888-8888-888888888888',
--     '99999999-9999-9999-9999-999999999999',
--     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
--   )
-- );