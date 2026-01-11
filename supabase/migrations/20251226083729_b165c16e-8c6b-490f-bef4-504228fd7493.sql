-- Add pass type columns to venues table for Entry Pass and VIP Pass configuration
ALTER TABLE public.venues 
ADD COLUMN entry_pass_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN entry_pass_price NUMERIC DEFAULT NULL,
ADD COLUMN entry_pass_daily_limit INTEGER DEFAULT NULL,
ADD COLUMN entry_pass_sold_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN vip_pass_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN vip_pass_price NUMERIC DEFAULT NULL,
ADD COLUMN vip_pass_daily_limit INTEGER DEFAULT NULL,
ADD COLUMN vip_pass_sold_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN vip_pass_free_item TEXT DEFAULT NULL;

-- Add pass_type to line_skip_passes to track which type was purchased
ALTER TABLE public.line_skip_passes 
ADD COLUMN pass_type TEXT NOT NULL DEFAULT 'entry' CHECK (pass_type IN ('entry', 'vip')),
ADD COLUMN free_item_claimed BOOLEAN NOT NULL DEFAULT false;

-- Migrate existing line skip data to entry pass
UPDATE public.venues SET 
  entry_pass_enabled = line_skip_enabled,
  entry_pass_price = line_skip_price,
  entry_pass_daily_limit = line_skip_daily_limit,
  entry_pass_sold_count = line_skip_sold_count;