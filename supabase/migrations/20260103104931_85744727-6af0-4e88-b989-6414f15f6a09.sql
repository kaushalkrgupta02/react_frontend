-- Add estimated_ready_at column to session_order_items for AI prep time predictions
ALTER TABLE public.session_order_items 
ADD COLUMN IF NOT EXISTS estimated_ready_at timestamp with time zone;