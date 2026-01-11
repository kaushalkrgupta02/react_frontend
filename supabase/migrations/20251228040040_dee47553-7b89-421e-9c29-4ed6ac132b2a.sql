-- Add a policy to allow reading guest profiles for demo mode
CREATE POLICY "Anyone can view guest profiles for demo" 
ON public.venue_guest_profiles 
FOR SELECT 
USING (true);