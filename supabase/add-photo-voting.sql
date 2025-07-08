-- Add voting support to equipment photos

-- Add vote counts to equipment_photos table
ALTER TABLE equipment_photos 
ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS score INTEGER GENERATED ALWAYS AS (upvotes - downvotes) STORED,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create photo votes table
CREATE TABLE IF NOT EXISTS equipment_photo_votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  photo_id UUID REFERENCES equipment_photos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  vote_type VARCHAR(10) CHECK (vote_type IN ('upvote', 'downvote')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(photo_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_equipment_photos_score ON equipment_photos(score DESC);
CREATE INDEX IF NOT EXISTS idx_equipment_photos_equipment_score ON equipment_photos(equipment_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_photo_votes_photo ON equipment_photo_votes(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_votes_user ON equipment_photo_votes(user_id);

-- Function to update vote counts
CREATE OR REPLACE FUNCTION update_photo_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'upvote' THEN
      UPDATE equipment_photos 
      SET upvotes = upvotes + 1 
      WHERE id = NEW.photo_id;
    ELSE
      UPDATE equipment_photos 
      SET downvotes = downvotes + 1 
      WHERE id = NEW.photo_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'upvote' THEN
      UPDATE equipment_photos 
      SET upvotes = upvotes - 1 
      WHERE id = OLD.photo_id;
    ELSE
      UPDATE equipment_photos 
      SET downvotes = downvotes - 1 
      WHERE id = OLD.photo_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle vote change
    IF OLD.vote_type = 'upvote' AND NEW.vote_type = 'downvote' THEN
      UPDATE equipment_photos 
      SET upvotes = upvotes - 1, downvotes = downvotes + 1 
      WHERE id = NEW.photo_id;
    ELSIF OLD.vote_type = 'downvote' AND NEW.vote_type = 'upvote' THEN
      UPDATE equipment_photos 
      SET downvotes = downvotes - 1, upvotes = upvotes + 1 
      WHERE id = NEW.photo_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for vote count updates
DROP TRIGGER IF EXISTS update_photo_votes_trigger ON equipment_photo_votes;
CREATE TRIGGER update_photo_votes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON equipment_photo_votes
  FOR EACH ROW EXECUTE FUNCTION update_photo_vote_counts();

-- RLS policies for photo votes
ALTER TABLE equipment_photo_votes ENABLE ROW LEVEL SECURITY;

-- Everyone can view votes
CREATE POLICY "Photo votes are viewable by everyone" ON equipment_photo_votes
  FOR SELECT USING (true);

-- Users can manage their own votes
CREATE POLICY "Users can manage own photo votes" ON equipment_photo_votes
  FOR ALL USING (auth.uid() = user_id);

-- Function to toggle photo vote
CREATE OR REPLACE FUNCTION toggle_photo_vote(
  p_photo_id UUID,
  p_vote_type VARCHAR(10)
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_existing_vote equipment_photo_votes%ROWTYPE;
  v_result JSON;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;
  
  -- Check for existing vote
  SELECT * INTO v_existing_vote
  FROM equipment_photo_votes
  WHERE photo_id = p_photo_id AND user_id = v_user_id;
  
  IF v_existing_vote.id IS NOT NULL THEN
    IF v_existing_vote.vote_type = p_vote_type THEN
      -- Remove vote if clicking same type
      DELETE FROM equipment_photo_votes WHERE id = v_existing_vote.id;
      v_result := json_build_object('action', 'removed', 'vote_type', p_vote_type);
    ELSE
      -- Change vote type
      UPDATE equipment_photo_votes 
      SET vote_type = p_vote_type 
      WHERE id = v_existing_vote.id;
      v_result := json_build_object('action', 'changed', 'vote_type', p_vote_type);
    END IF;
  ELSE
    -- Create new vote
    INSERT INTO equipment_photo_votes (photo_id, user_id, vote_type)
    VALUES (p_photo_id, v_user_id, p_vote_type);
    v_result := json_build_object('action', 'created', 'vote_type', p_vote_type);
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for photo with vote status
CREATE OR REPLACE VIEW equipment_photos_with_votes AS
SELECT 
  p.*,
  COALESCE(
    (SELECT vote_type 
     FROM equipment_photo_votes 
     WHERE photo_id = p.id AND user_id = auth.uid()
    ), 
    NULL
  ) as user_vote
FROM equipment_photos p;