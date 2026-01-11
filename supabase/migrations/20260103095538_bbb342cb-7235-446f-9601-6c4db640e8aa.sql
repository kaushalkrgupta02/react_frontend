-- Create a security definer function to check if user is a manager at a venue
CREATE OR REPLACE FUNCTION public.is_venue_manager(_user_id uuid, _venue_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_profiles sp
    JOIN public.user_roles ur ON sp.user_id = ur.user_id
    WHERE sp.user_id = _user_id
      AND sp.venue_id = _venue_id
      AND ur.role IN ('admin', 'manager', 'venue_manager')
  )
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Managers can view venue staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "Managers can insert venue staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "Managers can update venue staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "Staff can view own profile" ON public.staff_profiles;

-- Create new policies using security definer function
CREATE POLICY "Staff can view own profile"
ON public.staff_profiles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Managers can view venue staff"
ON public.staff_profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  is_venue_manager(auth.uid(), venue_id)
);

CREATE POLICY "Managers can insert venue staff"
ON public.staff_profiles
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR
  is_venue_manager(auth.uid(), venue_id)
);

CREATE POLICY "Managers can update venue staff"
ON public.staff_profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR
  user_id = auth.uid() OR
  is_venue_manager(auth.uid(), venue_id)
);

CREATE POLICY "Managers can delete venue staff"
ON public.staff_profiles
FOR DELETE
USING (
  has_role(auth.uid(), 'admin') OR
  is_venue_manager(auth.uid(), venue_id)
);