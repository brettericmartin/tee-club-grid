-- Create equipment_prices table for storing prices from multiple retailers
CREATE TABLE IF NOT EXISTS equipment_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  retailer VARCHAR(100) NOT NULL,
  retailer_logo_url TEXT,
  price DECIMAL(10,2) NOT NULL,
  sale_price DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  url TEXT NOT NULL,
  affiliate_url TEXT,
  in_stock BOOLEAN DEFAULT true,
  condition VARCHAR(50) DEFAULT 'new',
  shipping_cost DECIMAL(10,2),
  availability_text TEXT,
  last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  scraped_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_equipment_retailer_condition UNIQUE(equipment_id, retailer, condition)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_equipment_prices_equipment_id ON equipment_prices(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_prices_retailer ON equipment_prices(retailer);
CREATE INDEX IF NOT EXISTS idx_equipment_prices_last_checked ON equipment_prices(last_checked);
CREATE INDEX IF NOT EXISTS idx_equipment_prices_active ON equipment_prices(is_active) WHERE is_active = true;

-- Add comments for documentation
COMMENT ON TABLE equipment_prices IS 'Stores pricing information from various retailers for golf equipment';
COMMENT ON COLUMN equipment_prices.retailer IS 'Name of the retailer (e.g., PGA Superstore, Amazon, 2nd Swing)';
COMMENT ON COLUMN equipment_prices.condition IS 'Product condition: new, used-like-new, used-excellent, used-good, used-fair, refurbished';
COMMENT ON COLUMN equipment_prices.scraped_data IS 'Raw scraped data from retailer for debugging and reference';
COMMENT ON COLUMN equipment_prices.affiliate_url IS 'Affiliate tracking URL if available';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_equipment_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS equipment_prices_updated_at ON equipment_prices;
CREATE TRIGGER equipment_prices_updated_at
  BEFORE UPDATE ON equipment_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_equipment_prices_updated_at();

-- Enable RLS
ALTER TABLE equipment_prices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Equipment prices are viewable by everyone" ON equipment_prices;
DROP POLICY IF EXISTS "Only service role can insert equipment prices" ON equipment_prices;
DROP POLICY IF EXISTS "Only service role can update equipment prices" ON equipment_prices;
DROP POLICY IF EXISTS "Only service role can delete equipment prices" ON equipment_prices;

-- Create policies
-- Everyone can view prices
CREATE POLICY "Equipment prices are viewable by everyone" ON equipment_prices
  FOR SELECT
  USING (true);

-- Only service role can insert (for scraping)
CREATE POLICY "Only service role can insert equipment prices" ON equipment_prices
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.jwt()->>'role' = 'service_role');

-- Only service role can update
CREATE POLICY "Only service role can update equipment prices" ON equipment_prices
  FOR UPDATE
  USING (auth.role() = 'service_role' OR auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.role() = 'service_role' OR auth.jwt()->>'role' = 'service_role');

-- Only service role can delete
CREATE POLICY "Only service role can delete equipment prices" ON equipment_prices
  FOR DELETE
  USING (auth.role() = 'service_role' OR auth.jwt()->>'role' = 'service_role');

-- Function to get the best price for an equipment item
CREATE OR REPLACE FUNCTION get_best_equipment_price(p_equipment_id UUID)
RETURNS TABLE (
  retailer VARCHAR,
  price DECIMAL,
  sale_price DECIMAL,
  url TEXT,
  condition VARCHAR,
  in_stock BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ep.retailer,
    ep.price,
    ep.sale_price,
    ep.url,
    ep.condition,
    ep.in_stock
  FROM equipment_prices ep
  WHERE ep.equipment_id = p_equipment_id
    AND ep.is_active = true
    AND ep.in_stock = true
  ORDER BY COALESCE(ep.sale_price, ep.price) ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get all prices for equipment with calculated savings
CREATE OR REPLACE FUNCTION get_equipment_prices_with_savings(p_equipment_id UUID)
RETURNS TABLE (
  id UUID,
  retailer VARCHAR,
  retailer_logo_url TEXT,
  price DECIMAL,
  sale_price DECIMAL,
  savings DECIMAL,
  savings_percent INTEGER,
  url TEXT,
  affiliate_url TEXT,
  condition VARCHAR,
  in_stock BOOLEAN,
  availability_text TEXT,
  shipping_cost DECIMAL,
  last_checked TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ep.id,
    ep.retailer,
    ep.retailer_logo_url,
    ep.price,
    ep.sale_price,
    CASE 
      WHEN ep.sale_price IS NOT NULL THEN ep.price - ep.sale_price
      ELSE 0::DECIMAL
    END as savings,
    CASE 
      WHEN ep.sale_price IS NOT NULL AND ep.price > 0 THEN 
        ROUND(((ep.price - ep.sale_price) / ep.price * 100)::NUMERIC)::INTEGER
      ELSE 0
    END as savings_percent,
    ep.url,
    ep.affiliate_url,
    ep.condition,
    ep.in_stock,
    ep.availability_text,
    ep.shipping_cost,
    ep.last_checked
  FROM equipment_prices ep
  WHERE ep.equipment_id = p_equipment_id
    AND ep.is_active = true
  ORDER BY 
    ep.in_stock DESC,
    COALESCE(ep.sale_price, ep.price) ASC;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for functions
GRANT EXECUTE ON FUNCTION get_best_equipment_price TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_equipment_prices_with_savings TO anon, authenticated;