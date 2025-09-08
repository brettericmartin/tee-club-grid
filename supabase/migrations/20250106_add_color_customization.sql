-- Add color customization fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#10B981',
ADD COLUMN IF NOT EXISTS accent_color VARCHAR(7) DEFAULT '#FFD700',
ADD COLUMN IF NOT EXISTS theme_mode VARCHAR(10) DEFAULT 'dark',
ADD COLUMN IF NOT EXISTS custom_gradient JSONB DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN profiles.primary_color IS 'User primary theme color (hex format)';
COMMENT ON COLUMN profiles.accent_color IS 'User accent/secondary color (hex format)';
COMMENT ON COLUMN profiles.theme_mode IS 'Color theme mode (dark/light/auto)';
COMMENT ON COLUMN profiles.custom_gradient IS 'Custom gradient configuration for backgrounds';