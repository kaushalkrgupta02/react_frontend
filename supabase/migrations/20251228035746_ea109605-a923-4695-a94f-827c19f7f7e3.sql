-- Add a policy to allow reading deposits if user has any venue-related role 
-- or for demo mode to work (users viewing venues they're associated with)
CREATE POLICY "Users can view deposits for venues" 
ON public.booking_deposits 
FOR SELECT 
USING (true);

-- Note: This is a permissive policy for development/demo. 
-- In production, you'd want stricter controls like checking venue ownership