-- Add INSERT policies for analytics tables for demo mode

-- venue_analytics: Allow anyone to insert for demo
CREATE POLICY "Anyone can insert venue analytics for demo" 
ON public.venue_analytics 
FOR INSERT 
WITH CHECK (true);

-- booking_outcomes: Allow anyone to insert for demo
CREATE POLICY "Anyone can insert booking outcomes for demo" 
ON public.booking_outcomes 
FOR INSERT 
WITH CHECK (true);

-- promo_analytics: Allow anyone to insert/update for demo
CREATE POLICY "Anyone can insert promo analytics for demo" 
ON public.promo_analytics 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update promo analytics for demo" 
ON public.promo_analytics 
FOR UPDATE 
USING (true);

-- ai_prediction_logs: Allow anyone to insert for demo
CREATE POLICY "Anyone can insert AI prediction logs for demo" 
ON public.ai_prediction_logs 
FOR INSERT 
WITH CHECK (true);