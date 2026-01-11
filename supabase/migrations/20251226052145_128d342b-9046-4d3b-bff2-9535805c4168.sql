-- Create venue_analytics table for hourly venue metrics
CREATE TABLE public.venue_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  footfall_count INTEGER DEFAULT 0,
  capacity_percentage INTEGER DEFAULT 0,
  revenue_estimate NUMERIC DEFAULT 0,
  peak_hour_flag BOOLEAN DEFAULT false,
  weather_condition TEXT,
  day_of_week INTEGER,
  hour_of_day INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_venue_analytics_venue_recorded ON public.venue_analytics(venue_id, recorded_at DESC);
CREATE INDEX idx_venue_analytics_day_hour ON public.venue_analytics(venue_id, day_of_week, hour_of_day);

-- Enable RLS
ALTER TABLE public.venue_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies: Admins and venue managers can manage
CREATE POLICY "Admins can manage venue analytics"
ON public.venue_analytics FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Venue managers can view venue analytics"
ON public.venue_analytics FOR SELECT
USING (has_role(auth.uid(), 'venue_manager'));

-- Create booking_outcomes table to track what happens to each booking
CREATE TABLE public.booking_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL CHECK (outcome IN ('showed', 'no_show', 'cancelled', 'partial')),
  actual_party_size INTEGER,
  spend_amount NUMERIC,
  arrived_at TIMESTAMP WITH TIME ZONE,
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_booking_outcomes_venue ON public.booking_outcomes(venue_id, created_at DESC);
CREATE INDEX idx_booking_outcomes_booking ON public.booking_outcomes(booking_id);

-- Enable RLS
ALTER TABLE public.booking_outcomes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage booking outcomes"
ON public.booking_outcomes FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Venue managers can manage booking outcomes"
ON public.booking_outcomes FOR ALL
USING (has_role(auth.uid(), 'venue_manager'))
WITH CHECK (has_role(auth.uid(), 'venue_manager'));

-- Create promo_analytics table to track promo performance
CREATE TABLE public.promo_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id UUID NOT NULL REFERENCES public.promos(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  redemptions INTEGER DEFAULT 0,
  revenue_generated NUMERIC DEFAULT 0,
  conversion_rate NUMERIC GENERATED ALWAYS AS (
    CASE WHEN impressions > 0 THEN (redemptions::NUMERIC / impressions::NUMERIC) * 100 ELSE 0 END
  ) STORED,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_promo_analytics_promo ON public.promo_analytics(promo_id, recorded_date DESC);
CREATE INDEX idx_promo_analytics_venue ON public.promo_analytics(venue_id, recorded_date DESC);

-- Enable RLS
ALTER TABLE public.promo_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage promo analytics"
ON public.promo_analytics FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Venue managers can view promo analytics"
ON public.promo_analytics FOR SELECT
USING (has_role(auth.uid(), 'venue_manager'));

-- Enhance promos table with venue-specific and AI fields
ALTER TABLE public.promos
ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS promo_category TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed', 'bogo', 'free_item', 'bundle')),
ADD COLUMN IF NOT EXISTS discount_value NUMERIC,
ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'all',
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS predicted_impact JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS min_party_size INTEGER,
ADD COLUMN IF NOT EXISTS max_redemptions INTEGER,
ADD COLUMN IF NOT EXISTS current_redemptions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS promo_code TEXT,
ADD COLUMN IF NOT EXISTS terms_conditions TEXT;

-- Create index for venue promos
CREATE INDEX IF NOT EXISTS idx_promos_venue ON public.promos(venue_id, is_active);

-- Add trigger for updated_at on promo_analytics
CREATE TRIGGER update_promo_analytics_updated_at
BEFORE UPDATE ON public.promo_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();