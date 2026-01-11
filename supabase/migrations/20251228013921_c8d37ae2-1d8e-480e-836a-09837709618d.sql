-- Drop the existing insert policy that requires roles
DROP POLICY IF EXISTS "Admins and venue managers can create promos" ON public.promos;

-- Create a more permissive policy for demo purposes
-- Any authenticated user can create promos (for demo/testing)
CREATE POLICY "Authenticated users can create promos" 
ON public.promos 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Note: In production, you'd want stricter controls like:
-- WITH CHECK (
--   EXISTS (
--     SELECT 1 FROM public.user_roles 
--     WHERE user_id = auth.uid() 
--     AND role IN ('admin', 'venue_manager')
--   )
-- )