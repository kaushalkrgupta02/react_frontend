
-- Add policy to allow anyone to view waitlist entries (for demo mode)
-- This is a temporary policy for testing purposes
CREATE POLICY "Anyone can view waitlist for demo" 
ON public.waitlist 
FOR SELECT 
USING (true);

-- Add policy to allow anyone to update waitlist for demo
CREATE POLICY "Anyone can update waitlist for demo" 
ON public.waitlist 
FOR UPDATE 
USING (true);
