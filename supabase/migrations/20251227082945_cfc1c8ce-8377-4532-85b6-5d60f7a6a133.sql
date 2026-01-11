-- =====================================================
-- PHASE 1: AI-Powered Customer & Venue 360 Segmentation Tables
-- =====================================================

-- 1. Customer Segments Table - Stores AI-computed micro-segments
CREATE TABLE public.customer_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  
  -- Segment classification
  segment_name text NOT NULL, -- e.g., "High Spender", "Weekend Warrior", "Promo Hunter"
  segment_score numeric DEFAULT 0, -- 0-100 confidence
  
  -- RFM Analysis
  rfm_recency_days integer, -- Days since last visit
  rfm_frequency integer, -- Visits in last 90 days
  rfm_monetary numeric, -- Total spend in last 90 days
  rfm_tier text, -- "Champion", "Loyal", "At Risk", "Hibernating"
  
  -- Behavioral patterns
  avg_party_size numeric,
  preferred_day_of_week integer, -- 0=Sun, 6=Sat
  preferred_arrival_hour integer, -- 20=8PM, 22=10PM
  preferred_venue_types text[] DEFAULT '{}',
  
  -- Engagement metrics
  promo_responsiveness numeric DEFAULT 0, -- 0-1 score
  no_show_risk numeric DEFAULT 0, -- 0-1 probability
  clv_score numeric DEFAULT 0, -- Customer lifetime value estimate
  
  -- Metadata
  last_calculated_at timestamptz DEFAULT now(),
  calculation_version text DEFAULT 'v1',
  raw_metrics jsonb DEFAULT '{}',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id)
);

-- 2. Venue Profiles Table - Aggregated venue intelligence
CREATE TABLE public.venue_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  
  -- Performance metrics
  avg_capacity_utilization numeric DEFAULT 0,
  avg_show_up_rate numeric DEFAULT 0,
  avg_customer_spend numeric DEFAULT 0,
  total_revenue_30d numeric DEFAULT 0,
  total_bookings_30d integer DEFAULT 0,
  
  -- Time patterns
  peak_days jsonb DEFAULT '[]', -- [{"day": 5, "score": 95}]
  slow_days jsonb DEFAULT '[]', -- [{"day": 1, "score": 30}]
  peak_hours jsonb DEFAULT '[]', -- [{"hour": 22, "footfall": 150}]
  
  -- Customer composition
  top_customer_segments jsonb DEFAULT '[]', -- [{"segment": "High Spender", "percentage": 35}]
  avg_party_size numeric DEFAULT 0,
  repeat_customer_rate numeric DEFAULT 0,
  
  -- Promo effectiveness
  promo_effectiveness_score numeric DEFAULT 0, -- 0-100
  best_performing_promo_types text[] DEFAULT '{}',
  avg_promo_redemption_rate numeric DEFAULT 0,
  
  -- AI insights
  growth_opportunities jsonb DEFAULT '[]',
  risk_factors jsonb DEFAULT '[]',
  ai_recommendations jsonb DEFAULT '[]',
  
  last_calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(venue_id)
);

-- 3. AI Recommendations Table - Stores AI matching results
CREATE TABLE public.ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recommendation type
  recommendation_type text NOT NULL, -- 'venue_to_customer', 'customer_to_venue', 'promo_to_segment'
  
  -- Source/Target
  source_id uuid, -- venue_id or promo_id
  source_type text, -- 'venue', 'promo'
  target_user_id uuid, -- specific user
  target_segment text, -- segment name for bulk targeting
  
  -- Matching details
  match_score numeric DEFAULT 0, -- 0-100
  match_reasoning text,
  match_factors jsonb DEFAULT '{}', -- {"time_match": 0.8, "preference_match": 0.9}
  
  -- Timing recommendation
  timing_recommendation jsonb DEFAULT '{}', -- {"best_day": 5, "best_hour": 21, "promo_code": "HAPPY50"}
  
  -- Lifecycle
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  was_actioned boolean DEFAULT false,
  actioned_at timestamptz,
  action_result jsonb DEFAULT '{}'
);

-- 4. Add target_segments column to promos table
ALTER TABLE public.promos ADD COLUMN IF NOT EXISTS target_segments text[] DEFAULT '{}';

-- Enable RLS on all new tables
ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_segments
CREATE POLICY "Admins can manage customer segments"
  ON public.customer_segments FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Venue managers can view customer segments"
  ON public.customer_segments FOR SELECT
  USING (has_role(auth.uid(), 'venue_manager'));

CREATE POLICY "Users can view own segment"
  ON public.customer_segments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert customer segments for demo"
  ON public.customer_segments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update customer segments for demo"
  ON public.customer_segments FOR UPDATE
  USING (true);

-- RLS Policies for venue_profiles
CREATE POLICY "Admins can manage venue profiles"
  ON public.venue_profiles FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Venue managers can view venue profiles"
  ON public.venue_profiles FOR SELECT
  USING (has_role(auth.uid(), 'venue_manager'));

CREATE POLICY "Anyone can view venue profiles for demo"
  ON public.venue_profiles FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert venue profiles for demo"
  ON public.venue_profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update venue profiles for demo"
  ON public.venue_profiles FOR UPDATE
  USING (true);

-- RLS Policies for ai_recommendations
CREATE POLICY "Admins can manage ai recommendations"
  ON public.ai_recommendations FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Venue managers can view ai recommendations"
  ON public.ai_recommendations FOR SELECT
  USING (has_role(auth.uid(), 'venue_manager'));

CREATE POLICY "Users can view own recommendations"
  ON public.ai_recommendations FOR SELECT
  USING (auth.uid() = target_user_id);

CREATE POLICY "Anyone can insert ai recommendations for demo"
  ON public.ai_recommendations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update ai recommendations for demo"
  ON public.ai_recommendations FOR UPDATE
  USING (true);

-- Indexes for performance
CREATE INDEX idx_customer_segments_user_id ON public.customer_segments(user_id);
CREATE INDEX idx_customer_segments_segment_name ON public.customer_segments(segment_name);
CREATE INDEX idx_customer_segments_rfm_tier ON public.customer_segments(rfm_tier);
CREATE INDEX idx_venue_profiles_venue_id ON public.venue_profiles(venue_id);
CREATE INDEX idx_ai_recommendations_type ON public.ai_recommendations(recommendation_type);
CREATE INDEX idx_ai_recommendations_source ON public.ai_recommendations(source_id, source_type);
CREATE INDEX idx_ai_recommendations_target_user ON public.ai_recommendations(target_user_id);
CREATE INDEX idx_ai_recommendations_target_segment ON public.ai_recommendations(target_segment);

-- Update triggers
CREATE TRIGGER update_customer_segments_updated_at
  BEFORE UPDATE ON public.customer_segments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_venue_profiles_updated_at
  BEFORE UPDATE ON public.venue_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();