-- Add booking preference columns to venues table
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS show_arrival_window boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_special_requests boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS min_party_size integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_party_size integer DEFAULT 20,
ADD COLUMN IF NOT EXISTS max_bookings_per_night integer DEFAULT null;

-- Add comment for documentation
COMMENT ON COLUMN public.venues.show_arrival_window IS 'Whether to show arrival time selection during booking';
COMMENT ON COLUMN public.venues.allow_special_requests IS 'Whether to allow special requests text field during booking';
COMMENT ON COLUMN public.venues.min_party_size IS 'Minimum party size for bookings';
COMMENT ON COLUMN public.venues.max_party_size IS 'Maximum party size for bookings';
COMMENT ON COLUMN public.venues.max_bookings_per_night IS 'Maximum number of bookings allowed per night';