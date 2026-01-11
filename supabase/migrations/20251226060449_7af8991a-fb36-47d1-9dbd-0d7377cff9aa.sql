-- Create waitlist table for capacity overflow
CREATE TABLE public.waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  party_size INTEGER NOT NULL DEFAULT 1,
  phone TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'waiting',
  position INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notified_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Users can view their own waitlist entries
CREATE POLICY "Users can view own waitlist entries"
ON public.waitlist
FOR SELECT
USING (auth.uid() = user_id);

-- Users can join waitlist
CREATE POLICY "Users can join waitlist"
ON public.waitlist
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can cancel their own waitlist entry
CREATE POLICY "Users can cancel own waitlist entry"
ON public.waitlist
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own waitlist entry
CREATE POLICY "Users can delete own waitlist entry"
ON public.waitlist
FOR DELETE
USING (auth.uid() = user_id);

-- Venue managers can manage all waitlist entries
CREATE POLICY "Venue managers can manage waitlist"
ON public.waitlist
FOR ALL
USING (has_role(auth.uid(), 'venue_manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'venue_manager'::app_role));

-- Admins can manage all waitlist entries
CREATE POLICY "Admins can manage waitlist"
ON public.waitlist
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for efficient queries
CREATE INDEX idx_waitlist_venue_status ON public.waitlist(venue_id, status);
CREATE INDEX idx_waitlist_user ON public.waitlist(user_id);