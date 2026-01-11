-- Add venue payout account info
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS stripe_account_id text;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS payout_enabled boolean DEFAULT false;

-- Add more fields to promo_commissions for payment tracking
ALTER TABLE public.promo_commissions ADD COLUMN IF NOT EXISTS stripe_transfer_id text;
ALTER TABLE public.promo_commissions ADD COLUMN IF NOT EXISTS payout_batch_id uuid;
ALTER TABLE public.promo_commissions ADD COLUMN IF NOT EXISTS error_message text;

-- Create payout batches table to track batch payouts
CREATE TABLE IF NOT EXISTS public.payout_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_amount numeric NOT NULL,
  commission_count integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  stripe_batch_id text,
  processed_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- Enable RLS
ALTER TABLE public.payout_batches ENABLE ROW LEVEL SECURITY;

-- Only admins can manage payout batches
CREATE POLICY "Admins can manage payout batches" ON public.payout_batches
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));