-- Add guest_count to venue_packages and package_purchases
ALTER TABLE public.venue_packages ADD COLUMN IF NOT EXISTS guest_count integer DEFAULT 1;
ALTER TABLE public.package_purchases ADD COLUMN IF NOT EXISTS guest_count integer DEFAULT 1;

-- Create booking_guests table
CREATE TABLE public.booking_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  guest_number integer NOT NULL,
  qr_code text UNIQUE NOT NULL,
  guest_name text,
  guest_phone text,
  guest_email text,
  is_primary boolean DEFAULT false,
  check_in_status text DEFAULT 'pending',
  checked_in_at timestamptz,
  spend_amount numeric,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(booking_id, guest_number)
);

-- Create package_guests table
CREATE TABLE public.package_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.package_purchases(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  guest_number integer NOT NULL,
  qr_code text UNIQUE NOT NULL,
  guest_name text,
  guest_phone text,
  guest_email text,
  is_primary boolean DEFAULT false,
  redemption_status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(purchase_id, guest_number)
);

-- Enable RLS
ALTER TABLE public.booking_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_guests ENABLE ROW LEVEL SECURITY;

-- Trigger function for booking primary guest
CREATE OR REPLACE FUNCTION public.create_booking_primary_guest()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.booking_guests (booking_id, user_id, guest_number, qr_code, is_primary)
  VALUES (NEW.id, NEW.user_id, 1, 'BG-' || substr(gen_random_uuid()::text, 1, 8), true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger function for package primary guest
CREATE OR REPLACE FUNCTION public.create_package_primary_guest()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.package_guests (purchase_id, user_id, guest_number, qr_code, is_primary)
  VALUES (NEW.id, NEW.user_id, 1, 'PG-' || substr(gen_random_uuid()::text, 1, 8), true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
CREATE TRIGGER on_booking_created_add_primary_guest
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.create_booking_primary_guest();

CREATE TRIGGER on_package_purchase_created_add_primary_guest
  AFTER INSERT ON public.package_purchases
  FOR EACH ROW EXECUTE FUNCTION public.create_package_primary_guest();

-- RLS Policies for booking_guests
CREATE POLICY "Users can view their own guest records"
ON public.booking_guests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view guests for their bookings"
ON public.booking_guests FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.bookings b
  WHERE b.id = booking_guests.booking_id AND b.user_id = auth.uid()
));

CREATE POLICY "Users can manage guests for their bookings"
ON public.booking_guests FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.bookings b
  WHERE b.id = booking_guests.booking_id AND b.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.bookings b
  WHERE b.id = booking_guests.booking_id AND b.user_id = auth.uid()
));

CREATE POLICY "Venue managers can view all booking guests"
ON public.booking_guests FOR SELECT
USING (has_role(auth.uid(), 'venue_manager'::app_role));

CREATE POLICY "Venue managers can update booking guests"
ON public.booking_guests FOR UPDATE
USING (has_role(auth.uid(), 'venue_manager'::app_role));

CREATE POLICY "Admins can manage all booking guests"
ON public.booking_guests FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for package_guests
CREATE POLICY "Users can view their own package guest records"
ON public.package_guests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view guests for their package purchases"
ON public.package_guests FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.package_purchases pp
  WHERE pp.id = package_guests.purchase_id AND pp.user_id = auth.uid()
));

CREATE POLICY "Users can manage guests for their package purchases"
ON public.package_guests FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.package_purchases pp
  WHERE pp.id = package_guests.purchase_id AND pp.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.package_purchases pp
  WHERE pp.id = package_guests.purchase_id AND pp.user_id = auth.uid()
));

CREATE POLICY "Venue managers can view all package guests"
ON public.package_guests FOR SELECT
USING (has_role(auth.uid(), 'venue_manager'::app_role));

CREATE POLICY "Venue managers can update package guests"
ON public.package_guests FOR UPDATE
USING (has_role(auth.uid(), 'venue_manager'::app_role));

CREATE POLICY "Admins can manage all package guests"
ON public.package_guests FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Public access for guest pass viewing (non-app guests via QR code)
CREATE POLICY "Anyone can view guest by QR code"
ON public.booking_guests FOR SELECT
USING (true);

CREATE POLICY "Anyone can view package guest by QR code"
ON public.package_guests FOR SELECT
USING (true);