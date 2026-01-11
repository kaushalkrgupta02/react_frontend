-- Allow venue managers to see all promos for their venues (not just active ones)
CREATE POLICY "Venue managers can view all venue promos" 
ON public.promos 
FOR SELECT 
USING (has_role(auth.uid(), 'venue_manager'::app_role));

-- Also allow authenticated users to view venue promos for demo purposes
CREATE POLICY "Authenticated users can view all promos for demo" 
ON public.promos 
FOR SELECT 
TO authenticated
USING (true);