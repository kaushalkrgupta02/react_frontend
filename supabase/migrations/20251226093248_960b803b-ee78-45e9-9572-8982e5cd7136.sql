-- Add policy for venue managers to create and manage promos
CREATE POLICY "Venue managers can manage promos" 
ON public.promos 
FOR ALL 
USING (has_role(auth.uid(), 'venue_manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'venue_manager'::app_role));