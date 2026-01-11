-- Add guest fields to session_invoices for split bill scenarios
ALTER TABLE public.session_invoices
ADD COLUMN guest_name text,
ADD COLUMN guest_phone text,
ADD COLUMN guest_email text,
ADD COLUMN guest_user_id uuid REFERENCES public.profiles(user_id);

-- Add index for guest lookups
CREATE INDEX idx_session_invoices_guest_user_id ON public.session_invoices(guest_user_id);