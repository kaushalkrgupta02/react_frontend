-- Add policy to allow anyone to view passes for demo mode
CREATE POLICY "Anyone can view passes for demo" 
ON public.line_skip_passes
FOR SELECT
USING (true);