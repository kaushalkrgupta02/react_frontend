-- Add logo_url column to venues for branding
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS logo_url text;