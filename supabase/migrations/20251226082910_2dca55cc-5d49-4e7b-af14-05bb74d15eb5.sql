-- Create venue_tables table for per-table configuration
CREATE TABLE public.venue_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  table_number TEXT NOT NULL,
  seats INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'maintenance')),
  location_zone TEXT DEFAULT 'indoor' CHECK (location_zone IN ('indoor', 'outdoor', 'vip', 'terrace', 'rooftop', 'bar')),
  minimum_spend NUMERIC DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  special_features TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint for table number within a venue
ALTER TABLE public.venue_tables ADD CONSTRAINT venue_tables_venue_table_unique UNIQUE (venue_id, table_number);

-- Enable RLS
ALTER TABLE public.venue_tables ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view venue tables" 
ON public.venue_tables 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage venue tables" 
ON public.venue_tables 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Venue managers can manage venue tables" 
ON public.venue_tables 
FOR ALL 
USING (has_role(auth.uid(), 'venue_manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'venue_manager'::app_role));

-- Allow demo mode operations
CREATE POLICY "Anyone can insert venue tables for demo" 
ON public.venue_tables 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update venue tables for demo" 
ON public.venue_tables 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete venue tables for demo" 
ON public.venue_tables 
FOR DELETE 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_venue_tables_updated_at
  BEFORE UPDATE ON public.venue_tables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();