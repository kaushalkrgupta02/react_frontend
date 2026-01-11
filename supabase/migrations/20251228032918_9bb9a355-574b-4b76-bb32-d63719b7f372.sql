-- Create venue_guest_profiles table for CRM functionality
CREATE TABLE public.venue_guest_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_phone TEXT,
  guest_name TEXT,
  guest_email TEXT,
  dietary_restrictions TEXT[] DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  vip_status TEXT DEFAULT 'regular',
  total_visits INTEGER DEFAULT 0,
  total_spend NUMERIC DEFAULT 0,
  last_visit_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(venue_id, user_id),
  UNIQUE(venue_id, guest_phone)
);

-- Create guest_notes table for staff notes
CREATE TABLE public.guest_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_profile_id UUID NOT NULL REFERENCES public.venue_guest_profiles(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  staff_user_id UUID,
  note_type TEXT DEFAULT 'general',
  note_text TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deposits table for payment deposits
CREATE TABLE public.booking_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'IDR',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  payment_provider TEXT,
  external_payment_id TEXT,
  refund_amount NUMERIC DEFAULT 0,
  refunded_at TIMESTAMP WITH TIME ZONE,
  charged_no_show_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create booking_reminders table to track sent reminders
CREATE TABLE public.booking_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add deposit settings to venues table
ALTER TABLE public.venues 
  ADD COLUMN IF NOT EXISTS deposit_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_percentage NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_show_charge_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_24h_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_2h_enabled BOOLEAN DEFAULT true;

-- Enable RLS on all new tables
ALTER TABLE public.venue_guest_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies for venue_guest_profiles
CREATE POLICY "Venue managers can manage guest profiles" 
ON public.venue_guest_profiles 
FOR ALL 
USING (has_role(auth.uid(), 'venue_manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'venue_manager'::app_role));

CREATE POLICY "Admins can manage all guest profiles" 
ON public.venue_guest_profiles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for guest_notes
CREATE POLICY "Venue managers can manage guest notes" 
ON public.guest_notes 
FOR ALL 
USING (has_role(auth.uid(), 'venue_manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'venue_manager'::app_role));

CREATE POLICY "Admins can manage all guest notes" 
ON public.guest_notes 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for booking_deposits
CREATE POLICY "Users can view own deposits" 
ON public.booking_deposits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Venue managers can manage deposits" 
ON public.booking_deposits 
FOR ALL 
USING (has_role(auth.uid(), 'venue_manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'venue_manager'::app_role));

CREATE POLICY "Admins can manage all deposits" 
ON public.booking_deposits 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for booking_reminders
CREATE POLICY "Venue managers can view reminders" 
ON public.booking_reminders 
FOR SELECT 
USING (has_role(auth.uid(), 'venue_manager'::app_role));

CREATE POLICY "Admins can manage all reminders" 
ON public.booking_reminders 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_venue_guest_profiles_venue_id ON public.venue_guest_profiles(venue_id);
CREATE INDEX idx_venue_guest_profiles_user_id ON public.venue_guest_profiles(user_id);
CREATE INDEX idx_venue_guest_profiles_phone ON public.venue_guest_profiles(guest_phone);
CREATE INDEX idx_guest_notes_profile_id ON public.guest_notes(guest_profile_id);
CREATE INDEX idx_booking_deposits_booking_id ON public.booking_deposits(booking_id);
CREATE INDEX idx_booking_deposits_status ON public.booking_deposits(status);
CREATE INDEX idx_booking_reminders_booking_id ON public.booking_reminders(booking_id);
CREATE INDEX idx_booking_reminders_scheduled ON public.booking_reminders(scheduled_for) WHERE status = 'pending';

-- Trigger for updated_at on new tables
CREATE TRIGGER update_venue_guest_profiles_updated_at
  BEFORE UPDATE ON public.venue_guest_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_booking_deposits_updated_at
  BEFORE UPDATE ON public.booking_deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();