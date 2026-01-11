-- =============================================
-- RESERVATION ABSTRACTION LAYER SCHEMA
-- =============================================

-- 1. Venue Provider Mappings - Links internal venues to external booking systems
CREATE TABLE public.venue_provider_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('tablecheck', 'opentable', 'sevenrooms', 'chope', 'grab', 'resy')),
  provider_venue_id text NOT NULL,
  api_credentials_encrypted text, -- encrypted JSON with API keys/tokens
  policies jsonb DEFAULT '{}'::jsonb, -- cancellation cutoff, no-show rules, etc.
  seating_types text[] DEFAULT ARRAY[]::text[], -- dining, bar, lounge, vip, outdoor
  timezone text DEFAULT 'Asia/Jakarta',
  sync_enabled boolean DEFAULT true,
  last_sync_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(venue_id, provider)
);

-- 2. External Reservations - Tracks sync status between internal bookings and external providers
CREATE TABLE public.external_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_reservation_id text,
  idempotency_key text UNIQUE NOT NULL,
  sync_status text DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed', 'cancelled', 'modified')),
  provider_status text, -- status from the provider's system
  last_synced_at timestamptz,
  provider_response jsonb DEFAULT '{}'::jsonb,
  provider_confirmation_number text,
  error_message text,
  retry_count integer DEFAULT 0,
  next_retry_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Availability Slots - Cache of availability from providers
CREATE TABLE public.availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  provider text NOT NULL,
  slot_date date NOT NULL,
  start_time time NOT NULL,
  end_time time,
  duration_minutes integer DEFAULT 120,
  party_min integer DEFAULT 1,
  party_max integer DEFAULT 20,
  area_zone text, -- 'main_dining', 'vip', 'outdoor', 'bar', etc.
  table_type text, -- specific table type from provider
  requires_deposit boolean DEFAULT false,
  deposit_amount numeric,
  min_spend numeric,
  is_available boolean DEFAULT true,
  slots_remaining integer,
  provider_slot_id text, -- provider's internal slot ID
  cached_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '1 minute',
  UNIQUE(venue_id, provider, slot_date, start_time, area_zone)
);

-- 4. Provider Webhook Logs - Audit trail for webhook events
CREATE TABLE public.provider_webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_type text NOT NULL,
  event_id text, -- provider's event ID for deduplication
  venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  payload jsonb NOT NULL,
  headers jsonb DEFAULT '{}'::jsonb,
  signature text,
  signature_verified boolean DEFAULT false,
  processing_status text DEFAULT 'received' CHECK (processing_status IN ('received', 'processing', 'processed', 'failed', 'ignored')),
  error_message text,
  processing_attempts integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  UNIQUE(provider, event_id)
);

-- Enable RLS on all tables
ALTER TABLE public.venue_provider_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for venue_provider_mappings
CREATE POLICY "Admins can manage provider mappings"
  ON public.venue_provider_mappings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Venue managers can manage provider mappings"
  ON public.venue_provider_mappings FOR ALL
  USING (has_role(auth.uid(), 'venue_manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'venue_manager'::app_role));

CREATE POLICY "Anyone can view active provider mappings"
  ON public.venue_provider_mappings FOR SELECT
  USING (is_active = true);

-- RLS Policies for external_reservations
CREATE POLICY "Admins can manage external reservations"
  ON public.external_reservations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Venue managers can manage external reservations"
  ON public.external_reservations FOR ALL
  USING (has_role(auth.uid(), 'venue_manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'venue_manager'::app_role));

CREATE POLICY "Users can view own external reservations"
  ON public.external_reservations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = external_reservations.booking_id
      AND b.user_id = auth.uid()
    )
  );

-- RLS Policies for availability_slots
CREATE POLICY "Anyone can view availability slots"
  ON public.availability_slots FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage availability slots"
  ON public.availability_slots FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Venue managers can manage availability slots"
  ON public.availability_slots FOR ALL
  USING (has_role(auth.uid(), 'venue_manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'venue_manager'::app_role));

-- RLS Policies for provider_webhook_logs
CREATE POLICY "Admins can manage webhook logs"
  ON public.provider_webhook_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Venue managers can view webhook logs"
  ON public.provider_webhook_logs FOR SELECT
  USING (has_role(auth.uid(), 'venue_manager'::app_role));

-- Indexes for performance
CREATE INDEX idx_venue_provider_mappings_venue ON public.venue_provider_mappings(venue_id);
CREATE INDEX idx_venue_provider_mappings_provider ON public.venue_provider_mappings(provider);
CREATE INDEX idx_external_reservations_booking ON public.external_reservations(booking_id);
CREATE INDEX idx_external_reservations_sync_status ON public.external_reservations(sync_status);
CREATE INDEX idx_external_reservations_provider ON public.external_reservations(provider, provider_reservation_id);
CREATE INDEX idx_availability_slots_venue_date ON public.availability_slots(venue_id, slot_date);
CREATE INDEX idx_availability_slots_expires ON public.availability_slots(expires_at);
CREATE INDEX idx_provider_webhook_logs_status ON public.provider_webhook_logs(processing_status);
CREATE INDEX idx_provider_webhook_logs_provider ON public.provider_webhook_logs(provider, event_type);

-- Trigger for updated_at
CREATE TRIGGER update_venue_provider_mappings_updated_at
  BEFORE UPDATE ON public.venue_provider_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_external_reservations_updated_at
  BEFORE UPDATE ON public.external_reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();