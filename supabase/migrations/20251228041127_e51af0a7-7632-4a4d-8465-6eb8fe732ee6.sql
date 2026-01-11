-- Add permissive policies for guest profile management
CREATE POLICY "Anyone can create guest profiles"
  ON public.venue_guest_profiles
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update guest profiles"
  ON public.venue_guest_profiles
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete guest profiles"
  ON public.venue_guest_profiles
  FOR DELETE
  USING (true);