-- Add demo policies to allow venue updates for testing
CREATE POLICY "Anyone can update venues for demo"
ON public.venues
FOR UPDATE
USING (true);

-- Also add insert policy for demo
CREATE POLICY "Anyone can insert venues for demo"
ON public.venues
FOR INSERT
WITH CHECK (true);