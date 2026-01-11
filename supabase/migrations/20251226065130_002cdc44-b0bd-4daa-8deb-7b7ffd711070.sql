-- Add demo policies for venue analytics tables to allow public access for testing

-- venue_analytics: Allow anyone to view for demo
CREATE POLICY "Anyone can view venue analytics for demo" 
ON public.venue_analytics 
FOR SELECT 
USING (true);

-- booking_outcomes: Allow anyone to view for demo
CREATE POLICY "Anyone can view booking outcomes for demo" 
ON public.booking_outcomes 
FOR SELECT 
USING (true);

-- promo_analytics: Allow anyone to view for demo
CREATE POLICY "Anyone can view promo analytics for demo" 
ON public.promo_analytics 
FOR SELECT 
USING (true);

-- visit_feedback: Allow anyone to view for demo
CREATE POLICY "Anyone can view feedback for demo" 
ON public.visit_feedback 
FOR SELECT 
USING (true);

-- ai_prediction_logs: Allow anyone to view for demo
CREATE POLICY "Anyone can view AI prediction logs for demo" 
ON public.ai_prediction_logs 
FOR SELECT 
USING (true);

-- ai_learning_insights: Allow anyone to view for demo
CREATE POLICY "Anyone can view AI learning insights for demo" 
ON public.ai_learning_insights 
FOR SELECT 
USING (true);