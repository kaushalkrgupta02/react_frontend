-- Add new columns to venue_packages table
ALTER TABLE public.venue_packages 
ADD COLUMN IF NOT EXISTS package_type text DEFAULT 'custom',
ADD COLUMN IF NOT EXISTS valid_from date,
ADD COLUMN IF NOT EXISTS valid_until date,
ADD COLUMN IF NOT EXISTS max_quantity integer,
ADD COLUMN IF NOT EXISTS sold_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS image_url text;

-- Create package_items table to define what's included in each package
CREATE TABLE public.package_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id uuid NOT NULL REFERENCES public.venue_packages(id) ON DELETE CASCADE,
  item_type text NOT NULL DEFAULT 'other',
  item_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  redemption_rule text NOT NULL DEFAULT 'once',
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create package_purchases table to track customer purchases
CREATE TABLE public.package_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id uuid NOT NULL REFERENCES public.venue_packages(id) ON DELETE CASCADE,
  user_id uuid,
  venue_id uuid NOT NULL,
  qr_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  purchased_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  guest_name text,
  guest_phone text,
  total_paid numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create package_redemptions table to track individual item redemptions
CREATE TABLE public.package_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id uuid NOT NULL REFERENCES public.package_purchases(id) ON DELETE CASCADE,
  package_item_id uuid NOT NULL REFERENCES public.package_items(id) ON DELETE CASCADE,
  quantity_redeemed integer NOT NULL DEFAULT 1,
  redeemed_by uuid,
  redeemed_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for package_items
CREATE POLICY "Anyone can view package items" ON public.package_items
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage package items" ON public.package_items
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Venue managers can manage package items" ON public.package_items
  FOR ALL USING (has_role(auth.uid(), 'venue_manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'venue_manager'::app_role));

-- RLS policies for package_purchases
CREATE POLICY "Users can view own purchases" ON public.package_purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create purchases" ON public.package_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can manage all purchases" ON public.package_purchases
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Venue managers can view and update purchases" ON public.package_purchases
  FOR SELECT USING (has_role(auth.uid(), 'venue_manager'::app_role));

CREATE POLICY "Venue managers can update purchases" ON public.package_purchases
  FOR UPDATE USING (has_role(auth.uid(), 'venue_manager'::app_role));

CREATE POLICY "Anyone can view purchases for demo" ON public.package_purchases
  FOR SELECT USING (true);

-- RLS policies for package_redemptions
CREATE POLICY "Users can view own redemptions" ON public.package_redemptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.package_purchases pp 
      WHERE pp.id = package_redemptions.purchase_id 
      AND pp.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all redemptions" ON public.package_redemptions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Venue managers can manage redemptions" ON public.package_redemptions
  FOR ALL USING (has_role(auth.uid(), 'venue_manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'venue_manager'::app_role));

CREATE POLICY "Anyone can insert redemptions for demo" ON public.package_redemptions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view redemptions for demo" ON public.package_redemptions
  FOR SELECT USING (true);

-- Create indexes for performance
CREATE INDEX idx_package_items_package_id ON public.package_items(package_id);
CREATE INDEX idx_package_purchases_venue_id ON public.package_purchases(venue_id);
CREATE INDEX idx_package_purchases_qr_code ON public.package_purchases(qr_code);
CREATE INDEX idx_package_purchases_status ON public.package_purchases(status);
CREATE INDEX idx_package_redemptions_purchase_id ON public.package_redemptions(purchase_id);

-- Trigger for updated_at on package_purchases
CREATE TRIGGER update_package_purchases_updated_at
  BEFORE UPDATE ON public.package_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();