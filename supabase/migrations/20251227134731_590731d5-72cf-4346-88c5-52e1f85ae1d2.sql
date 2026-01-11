-- Create table for venue social media credentials
CREATE TABLE public.venue_social_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  account_id TEXT,
  account_name TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(venue_id, platform)
);

-- Enable RLS
ALTER TABLE public.venue_social_credentials ENABLE ROW LEVEL SECURITY;

-- Only admins and venue managers can view credentials
CREATE POLICY "Admins and venue managers can view social credentials"
ON public.venue_social_credentials
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'venue_manager')
  )
);

-- Only admins and venue managers can insert credentials
CREATE POLICY "Admins and venue managers can insert social credentials"
ON public.venue_social_credentials
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'venue_manager')
  )
);

-- Only admins and venue managers can update credentials
CREATE POLICY "Admins and venue managers can update social credentials"
ON public.venue_social_credentials
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'venue_manager')
  )
);

-- Only admins and venue managers can delete credentials
CREATE POLICY "Admins and venue managers can delete social credentials"
ON public.venue_social_credentials
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'venue_manager')
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_venue_social_credentials_updated_at
BEFORE UPDATE ON public.venue_social_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add column to promos table to track where it was published
ALTER TABLE public.promos
ADD COLUMN IF NOT EXISTS published_platforms TEXT[] DEFAULT ARRAY['app'];
