-- Allow users to insert their own role during registration
-- This policy only allows INSERT where the user_id matches auth.uid()
CREATE POLICY "Users can insert own role during registration"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);