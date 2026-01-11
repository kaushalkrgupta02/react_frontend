-- Create enum for session status
CREATE TYPE public.session_status AS ENUM ('open', 'billing', 'paid', 'closed', 'cancelled');

-- Create enum for order status
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled');

-- Create enum for order item status
CREATE TYPE public.order_item_status AS ENUM ('pending', 'preparing', 'ready', 'served', 'cancelled');

-- Create enum for invoice status
CREATE TYPE public.invoice_status AS ENUM ('draft', 'pending', 'paid', 'partially_paid', 'void');

-- Create enum for payment status
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Venue POS Settings table
CREATE TABLE public.venue_pos_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  service_charge_rate NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'IDR',
  auto_print_kitchen BOOLEAN DEFAULT false,
  auto_print_bar BOOLEAN DEFAULT false,
  require_table_for_orders BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(venue_id)
);

-- Table Sessions - tracks table occupancy
CREATE TABLE public.table_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  table_id UUID REFERENCES public.venue_tables(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  package_purchase_id UUID REFERENCES public.package_purchases(id) ON DELETE SET NULL,
  status session_status NOT NULL DEFAULT 'open',
  guest_count INTEGER NOT NULL DEFAULT 1,
  guest_name TEXT,
  notes TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  opened_by UUID,
  closed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session Orders - order rounds
CREATE TABLE public.session_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.table_sessions(id) ON DELETE CASCADE,
  order_number INTEGER NOT NULL DEFAULT 1,
  status order_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  ordered_by UUID,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session Order Items - individual items
CREATE TABLE public.session_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_order_id UUID NOT NULL REFERENCES public.session_orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  modifiers JSONB DEFAULT '[]',
  notes TEXT,
  status order_item_status NOT NULL DEFAULT 'pending',
  destination TEXT DEFAULT 'kitchen',
  served_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session Invoices - bills
CREATE TABLE public.session_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.table_sessions(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  service_charge NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  discount_reason TEXT,
  deposit_credit NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  status invoice_status NOT NULL DEFAULT 'draft',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  void_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session Payments - payment records
CREATE TABLE public.session_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.session_invoices(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reference_number TEXT,
  status payment_status NOT NULL DEFAULT 'completed',
  processed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.venue_pos_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for venue_pos_settings
CREATE POLICY "Admins can manage all POS settings" ON public.venue_pos_settings
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Venue managers can manage POS settings" ON public.venue_pos_settings
  FOR ALL USING (has_role(auth.uid(), 'venue_manager')) WITH CHECK (has_role(auth.uid(), 'venue_manager'));

CREATE POLICY "Anyone can view POS settings for demo" ON public.venue_pos_settings
  FOR SELECT USING (true);

-- RLS Policies for table_sessions
CREATE POLICY "Admins can manage all sessions" ON public.table_sessions
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Venue managers can manage sessions" ON public.table_sessions
  FOR ALL USING (has_role(auth.uid(), 'venue_manager')) WITH CHECK (has_role(auth.uid(), 'venue_manager'));

CREATE POLICY "Anyone can view sessions for demo" ON public.table_sessions
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert sessions for demo" ON public.table_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update sessions for demo" ON public.table_sessions
  FOR UPDATE USING (true);

-- RLS Policies for session_orders
CREATE POLICY "Admins can manage all orders" ON public.session_orders
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Venue managers can manage orders" ON public.session_orders
  FOR ALL USING (has_role(auth.uid(), 'venue_manager')) WITH CHECK (has_role(auth.uid(), 'venue_manager'));

CREATE POLICY "Anyone can view orders for demo" ON public.session_orders
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert orders for demo" ON public.session_orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update orders for demo" ON public.session_orders
  FOR UPDATE USING (true);

-- RLS Policies for session_order_items
CREATE POLICY "Admins can manage all order items" ON public.session_order_items
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Venue managers can manage order items" ON public.session_order_items
  FOR ALL USING (has_role(auth.uid(), 'venue_manager')) WITH CHECK (has_role(auth.uid(), 'venue_manager'));

CREATE POLICY "Anyone can view order items for demo" ON public.session_order_items
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert order items for demo" ON public.session_order_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update order items for demo" ON public.session_order_items
  FOR UPDATE USING (true);

-- RLS Policies for session_invoices
CREATE POLICY "Admins can manage all invoices" ON public.session_invoices
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Venue managers can manage invoices" ON public.session_invoices
  FOR ALL USING (has_role(auth.uid(), 'venue_manager')) WITH CHECK (has_role(auth.uid(), 'venue_manager'));

CREATE POLICY "Anyone can view invoices for demo" ON public.session_invoices
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert invoices for demo" ON public.session_invoices
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update invoices for demo" ON public.session_invoices
  FOR UPDATE USING (true);

-- RLS Policies for session_payments
CREATE POLICY "Admins can manage all payments" ON public.session_payments
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Venue managers can manage payments" ON public.session_payments
  FOR ALL USING (has_role(auth.uid(), 'venue_manager')) WITH CHECK (has_role(auth.uid(), 'venue_manager'));

CREATE POLICY "Anyone can view payments for demo" ON public.session_payments
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert payments for demo" ON public.session_payments
  FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_table_sessions_venue ON public.table_sessions(venue_id);
CREATE INDEX idx_table_sessions_status ON public.table_sessions(status);
CREATE INDEX idx_table_sessions_table ON public.table_sessions(table_id);
CREATE INDEX idx_session_orders_session ON public.session_orders(session_id);
CREATE INDEX idx_session_order_items_order ON public.session_order_items(session_order_id);
CREATE INDEX idx_session_invoices_session ON public.session_invoices(session_id);
CREATE INDEX idx_session_payments_invoice ON public.session_payments(invoice_id);

-- Update trigger for updated_at
CREATE TRIGGER update_venue_pos_settings_updated_at BEFORE UPDATE ON public.venue_pos_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_table_sessions_updated_at BEFORE UPDATE ON public.table_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_session_orders_updated_at BEFORE UPDATE ON public.session_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_session_order_items_updated_at BEFORE UPDATE ON public.session_order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_session_invoices_updated_at BEFORE UPDATE ON public.session_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := 'INV-';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.table_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_order_items;