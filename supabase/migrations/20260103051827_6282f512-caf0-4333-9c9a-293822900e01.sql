-- Create enum for location types
CREATE TYPE location_target_type AS ENUM ('home', 'office', 'current', 'anywhere');

-- Create enum for crowd levels
CREATE TYPE crowd_level AS ENUM ('quiet', 'moderate', 'busy', 'very_busy', 'packed');

-- Table: user_locations - Stores user's linked Telkomsel location data
CREATE TABLE public.user_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  phone_number TEXT,
  home_latitude NUMERIC(10, 7),
  home_longitude NUMERIC(10, 7),
  home_address TEXT,
  office_latitude NUMERIC(10, 7),
  office_longitude NUMERIC(10, 7),
  office_address TEXT,
  consent_granted BOOLEAN NOT NULL DEFAULT false,
  telkomsel_linked_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_location UNIQUE (user_id)
);

-- Table: venue_crowd_snapshots - Stores crowd density data for venues
CREATE TABLE public.venue_crowd_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  population_density INTEGER,
  crowd_level crowd_level NOT NULL DEFAULT 'moderate',
  confidence NUMERIC(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
  source TEXT NOT NULL DEFAULT 'telkomsel_api',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: location_promos - Links promos to location targeting
CREATE TABLE public.location_promos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_id UUID NOT NULL REFERENCES public.promos(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  location_type location_target_type NOT NULL DEFAULT 'anywhere',
  radius_km NUMERIC(5, 2) NOT NULL DEFAULT 5.0,
  time_window_start TIME,
  time_window_end TIME,
  days_of_week INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: venue_audience_insights - Aggregate counts of potential customers
CREATE TABLE public.venue_audience_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  home_zone_count INTEGER NOT NULL DEFAULT 0,
  office_zone_count INTEGER NOT NULL DEFAULT 0,
  total_potential_reach INTEGER NOT NULL DEFAULT 0,
  avg_daily_footfall INTEGER,
  peak_hour_start INTEGER CHECK (peak_hour_start >= 0 AND peak_hour_start <= 23),
  peak_hour_end INTEGER CHECK (peak_hour_end >= 0 AND peak_hour_end <= 23),
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_venue_insights UNIQUE (venue_id)
);

-- Enable RLS on all tables
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_crowd_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_audience_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_locations
CREATE POLICY "Users can view own location"
ON public.user_locations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own location"
ON public.user_locations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own location"
ON public.user_locations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own location"
ON public.user_locations FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all user locations"
ON public.user_locations FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for venue_crowd_snapshots
CREATE POLICY "Anyone can view crowd snapshots"
ON public.venue_crowd_snapshots FOR SELECT
USING (true);

CREATE POLICY "Admins can manage crowd snapshots"
ON public.venue_crowd_snapshots FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Venue managers can insert crowd snapshots"
ON public.venue_crowd_snapshots FOR INSERT
WITH CHECK (has_role(auth.uid(), 'venue_manager'));

-- RLS Policies for location_promos
CREATE POLICY "Anyone can view active location promos"
ON public.location_promos FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage location promos"
ON public.location_promos FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Venue managers can manage location promos"
ON public.location_promos FOR ALL
USING (has_role(auth.uid(), 'venue_manager'))
WITH CHECK (has_role(auth.uid(), 'venue_manager'));

-- RLS Policies for venue_audience_insights
CREATE POLICY "Venue managers can view audience insights"
ON public.venue_audience_insights FOR SELECT
USING (has_role(auth.uid(), 'venue_manager'));

CREATE POLICY "Admins can manage audience insights"
ON public.venue_audience_insights FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_user_locations_user ON public.user_locations(user_id);
CREATE INDEX idx_venue_crowd_snapshots_venue ON public.venue_crowd_snapshots(venue_id);
CREATE INDEX idx_venue_crowd_snapshots_time ON public.venue_crowd_snapshots(snapshot_at DESC);
CREATE INDEX idx_location_promos_venue ON public.location_promos(venue_id);
CREATE INDEX idx_location_promos_promo ON public.location_promos(promo_id);
CREATE INDEX idx_venue_audience_insights_venue ON public.venue_audience_insights(venue_id);

-- Triggers for updated_at
CREATE TRIGGER update_user_locations_updated_at
BEFORE UPDATE ON public.user_locations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_location_promos_updated_at
BEFORE UPDATE ON public.location_promos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_venue_audience_insights_updated_at
BEFORE UPDATE ON public.venue_audience_insights
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for crowd snapshots (for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.venue_crowd_snapshots;