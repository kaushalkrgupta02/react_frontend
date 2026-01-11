-- Create table for AI prediction accuracy tracking
CREATE TABLE public.ai_prediction_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  prediction_type text NOT NULL, -- 'demand', 'staffing', 'noShow', 'revenue', 'promo'
  prediction_date date NOT NULL,
  predicted_value jsonb NOT NULL, -- The AI's prediction
  actual_value jsonb, -- The actual outcome (filled in later)
  confidence_score integer, -- AI's confidence 0-100
  accuracy_score integer, -- Calculated accuracy 0-100 (filled in later)
  model_version text DEFAULT 'v1',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  evaluated_at timestamp with time zone -- When accuracy was calculated
);

-- Create table for guest feedback after visits
CREATE TABLE public.visit_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  overall_rating integer NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  service_rating integer CHECK (service_rating >= 1 AND service_rating <= 5),
  atmosphere_rating integer CHECK (atmosphere_rating >= 1 AND atmosphere_rating <= 5),
  value_rating integer CHECK (value_rating >= 1 AND value_rating <= 5),
  wait_time_minutes integer,
  would_recommend boolean,
  feedback_text text,
  visited_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table for AI model improvement suggestions
CREATE TABLE public.ai_learning_insights (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE,
  insight_type text NOT NULL, -- 'pattern', 'anomaly', 'improvement', 'correlation'
  title text NOT NULL,
  description text NOT NULL,
  data_points jsonb DEFAULT '{}',
  confidence integer DEFAULT 75,
  is_actioned boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_prediction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_learning_insights ENABLE ROW LEVEL SECURITY;

-- RLS for ai_prediction_logs (admin/venue manager only)
CREATE POLICY "Admins can manage AI prediction logs"
ON public.ai_prediction_logs FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Venue managers can view AI prediction logs"
ON public.ai_prediction_logs FOR SELECT
USING (has_role(auth.uid(), 'venue_manager'::app_role));

-- RLS for visit_feedback
CREATE POLICY "Users can create own feedback"
ON public.visit_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback"
ON public.visit_feedback FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all feedback"
ON public.visit_feedback FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Venue managers can view venue feedback"
ON public.visit_feedback FOR SELECT
USING (has_role(auth.uid(), 'venue_manager'::app_role));

-- RLS for ai_learning_insights
CREATE POLICY "Admins can manage AI learning insights"
ON public.ai_learning_insights FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Venue managers can view AI learning insights"
ON public.ai_learning_insights FOR SELECT
USING (has_role(auth.uid(), 'venue_manager'::app_role));