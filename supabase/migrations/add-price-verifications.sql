-- Create price_verifications table for user-submitted price data
CREATE TABLE IF NOT EXISTS price_verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    retailer_name VARCHAR(255) NOT NULL,
    product_url TEXT,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_price_verifications_equipment_id ON price_verifications(equipment_id);
CREATE INDEX IF NOT EXISTS idx_price_verifications_user_id ON price_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_price_verifications_verified_at ON price_verifications(verified_at);

-- Enable RLS
ALTER TABLE price_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view all price verifications
CREATE POLICY "Users can view price verifications" 
    ON price_verifications FOR SELECT 
    USING (TRUE);

-- Users can insert their own price verifications
CREATE POLICY "Users can insert own price verifications" 
    ON price_verifications FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own price verifications
CREATE POLICY "Users can update own price verifications" 
    ON price_verifications FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own price verifications
CREATE POLICY "Users can delete own price verifications" 
    ON price_verifications FOR DELETE 
    USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_price_verifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_price_verifications_updated_at
    BEFORE UPDATE ON price_verifications
    FOR EACH ROW
    EXECUTE FUNCTION update_price_verifications_updated_at();