-- Allow venue managers to view passes for any venue
CREATE POLICY "Venue managers can view passes" 
ON public.line_skip_passes
FOR SELECT
USING (has_role(auth.uid(), 'venue_manager'::app_role));

-- Allow venue managers to update pass status (redeem passes)
CREATE POLICY "Venue managers can update passes" 
ON public.line_skip_passes
FOR UPDATE
USING (has_role(auth.uid(), 'venue_manager'::app_role));

-- Enable realtime for line_skip_passes
ALTER PUBLICATION supabase_realtime ADD TABLE public.line_skip_passes;