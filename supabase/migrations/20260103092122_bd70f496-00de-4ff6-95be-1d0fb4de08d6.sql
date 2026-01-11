-- Create staff_profiles table for venue staff
CREATE TABLE public.staff_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, venue_id)
);

-- Enable RLS
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX idx_staff_profiles_user_id ON public.staff_profiles(user_id);
CREATE INDEX idx_staff_profiles_venue_id ON public.staff_profiles(venue_id);

-- RLS Policies for staff_profiles
-- Staff can view their own profile
CREATE POLICY "Staff can view own profile"
ON public.staff_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Managers and admins can view all staff at their venue
CREATE POLICY "Managers can view venue staff"
ON public.staff_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staff_profiles sp
    JOIN public.user_roles ur ON sp.user_id = ur.user_id
    WHERE sp.user_id = auth.uid()
    AND sp.venue_id = staff_profiles.venue_id
    AND ur.role IN ('admin', 'manager')
  )
);

-- Managers can insert staff at their venue
CREATE POLICY "Managers can insert venue staff"
ON public.staff_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.staff_profiles sp
    JOIN public.user_roles ur ON sp.user_id = ur.user_id
    WHERE sp.user_id = auth.uid()
    AND sp.venue_id = staff_profiles.venue_id
    AND ur.role = 'manager'
  )
);

-- Managers can update staff at their venue
CREATE POLICY "Managers can update venue staff"
ON public.staff_profiles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.staff_profiles sp
    JOIN public.user_roles ur ON sp.user_id = ur.user_id
    WHERE sp.user_id = auth.uid()
    AND sp.venue_id = staff_profiles.venue_id
    AND ur.role = 'manager'
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_staff_profiles_updated_at
BEFORE UPDATE ON public.staff_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();