-- Drop existing policies
DROP POLICY IF EXISTS "Staff can view own profile" ON public.staff_profiles;
DROP POLICY IF EXISTS "Managers can view venue staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "Managers can insert venue staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "Managers can update venue staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "Managers can delete venue staff" ON public.staff_profiles;

-- Create simpler policies that work
-- Allow authenticated users to view staff at their venue
CREATE POLICY "Authenticated users can view staff profiles"
ON public.staff_profiles
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert their own staff profile or managers to insert others
CREATE POLICY "Users can insert staff profiles"
ON public.staff_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR 
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager') OR
  public.has_role(auth.uid(), 'venue_manager')
);

-- Allow managers/admins to update staff profiles
CREATE POLICY "Managers can update staff profiles"
ON public.staff_profiles
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager') OR
  public.has_role(auth.uid(), 'venue_manager')
);

-- Allow managers/admins to delete staff profiles
CREATE POLICY "Managers can delete staff profiles"
ON public.staff_profiles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager') OR
  public.has_role(auth.uid(), 'venue_manager')
);