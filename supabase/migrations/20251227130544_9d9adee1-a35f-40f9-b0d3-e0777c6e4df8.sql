-- Allow anyone to insert/update venue_packages for demo purposes
CREATE POLICY "Anyone can insert venue packages for demo" ON public.venue_packages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update venue packages for demo" ON public.venue_packages
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete venue packages for demo" ON public.venue_packages
  FOR DELETE USING (true);