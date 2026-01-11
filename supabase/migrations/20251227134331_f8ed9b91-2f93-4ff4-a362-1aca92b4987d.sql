-- Add INSERT, UPDATE, DELETE policies for promos table

-- Allow admins and venue managers to insert promos
CREATE POLICY "Admins and venue managers can create promos"
ON public.promos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'venue_manager')
  )
);

-- Allow admins and venue managers to update promos
CREATE POLICY "Admins and venue managers can update promos"
ON public.promos
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'venue_manager')
  )
);

-- Allow admins and venue managers to delete promos
CREATE POLICY "Admins and venue managers can delete promos"
ON public.promos
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'venue_manager')
  )
);