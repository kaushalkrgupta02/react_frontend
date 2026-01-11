-- Add table and seating management columns to venues
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS total_tables integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS seats_per_table integer DEFAULT 4,
ADD COLUMN IF NOT EXISTS total_capacity integer DEFAULT 40;

-- Add comment for clarity
COMMENT ON COLUMN public.venues.total_tables IS 'Total number of tables available at the venue';
COMMENT ON COLUMN public.venues.seats_per_table IS 'Default number of seats per table';
COMMENT ON COLUMN public.venues.total_capacity IS 'Total seating capacity (can be calculated or manual)';