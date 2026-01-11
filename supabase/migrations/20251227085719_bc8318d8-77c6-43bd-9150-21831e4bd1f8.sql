-- Add promo tier and tracking columns to promos table
ALTER TABLE public.promos ADD COLUMN IF NOT EXISTS promo_tier text DEFAULT 'basic';
ALTER TABLE public.promos ADD COLUMN IF NOT EXISTS created_by_role text;
ALTER TABLE public.promos ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 0.15;
ALTER TABLE public.promos ADD COLUMN IF NOT EXISTS boost_spend numeric DEFAULT 0;

-- Create promo_commissions table to track venue commissions
CREATE TABLE public.promo_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id uuid REFERENCES public.promos(id) ON DELETE CASCADE NOT NULL,
  venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  redemption_id uuid,
  amount numeric NOT NULL,
  commission_rate numeric NOT NULL,
  commission_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  paid_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.promo_commissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for promo_commissions
CREATE POLICY "Admins can manage promo commissions" ON public.promo_commissions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Venue managers can view their commissions" ON public.promo_commissions
  FOR SELECT USING (has_role(auth.uid(), 'venue_manager'::app_role));