import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface AvailabilityRequest {
  venueId: string;
  date: string;
  partySize: number;
  seatingType?: string;
}

interface CreateReservationRequest {
  venueId: string;
  slotId?: string;
  date: string;
  time: string;
  partySize: number;
  guest: {
    name: string;
    phone?: string;
    email?: string;
  };
  notes?: string;
  seatingType?: string;
}

interface ModifyReservationRequest {
  reservationId: string;
  changes: {
    date?: string;
    time?: string;
    partySize?: number;
    notes?: string;
  };
}

interface CancelReservationRequest {
  reservationId: string;
  reason?: string;
}

// Generate idempotency key for reservation
function generateIdempotencyKey(venueId: string, date: string, time: string, guestPhone: string): string {
  const data = `${venueId}-${date}-${time}-${guestPhone}-${Date.now()}`;
  return btoa(data).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    console.log(`[reservation-api] Action: ${action}`);

    switch (action) {
      case 'availability': {
        const body: AvailabilityRequest = await req.json();
        return await handleGetAvailability(supabase, body);
      }

      case 'create': {
        const body: CreateReservationRequest = await req.json();
        return await handleCreateReservation(supabase, body);
      }

      case 'modify': {
        const body: ModifyReservationRequest = await req.json();
        return await handleModifyReservation(supabase, body);
      }

      case 'cancel': {
        const body: CancelReservationRequest = await req.json();
        return await handleCancelReservation(supabase, body);
      }

      case 'providers': {
        const { venueId } = await req.json();
        return await handleGetProviders(supabase, venueId);
      }

      case 'sync-status': {
        const { bookingId } = await req.json();
        return await handleGetSyncStatus(supabase, bookingId);
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('[reservation-api] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleGetAvailability(supabase: any, request: AvailabilityRequest) {
  const { venueId, date, partySize, seatingType } = request;

  console.log(`[availability] Fetching for venue ${venueId}, date ${date}, party ${partySize}`);

  // Check if venue has provider mapping
  const { data: mappings, error: mappingError } = await supabase
    .from('venue_provider_mappings')
    .select('*')
    .eq('venue_id', venueId)
    .eq('is_active', true);

  if (mappingError) {
    console.error('[availability] Mapping error:', mappingError);
    throw mappingError;
  }

  // If no external provider, return local availability (tables)
  if (!mappings || mappings.length === 0) {
    console.log('[availability] No provider mapping, using local tables');
    return await getLocalAvailability(supabase, venueId, date, partySize);
  }

  // Check cached slots first
  const { data: cachedSlots, error: cacheError } = await supabase
    .from('availability_slots')
    .select('*')
    .eq('venue_id', venueId)
    .eq('slot_date', date)
    .eq('is_available', true)
    .gte('party_max', partySize)
    .lte('party_min', partySize)
    .gte('expires_at', new Date().toISOString());

  if (!cacheError && cachedSlots && cachedSlots.length > 0) {
    console.log(`[availability] Returning ${cachedSlots.length} cached slots`);
    return new Response(
      JSON.stringify({ 
        slots: cachedSlots,
        source: 'cache',
        provider: mappings[0].provider
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Fetch from provider
  const provider = mappings[0];
  console.log(`[availability] Fetching from provider: ${provider.provider}`);

  try {
    const providerSlots = await fetchProviderAvailability(provider, date, partySize, seatingType);
    
    // Cache the results
    if (providerSlots.length > 0) {
      await cacheAvailabilitySlots(supabase, venueId, provider.provider, providerSlots);
    }

    return new Response(
      JSON.stringify({ 
        slots: providerSlots,
        source: 'provider',
        provider: provider.provider
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (providerError) {
    console.error(`[availability] Provider error:`, providerError);
    // Fall back to cached or local
    return await getLocalAvailability(supabase, venueId, date, partySize);
  }
}

async function getLocalAvailability(supabase: any, venueId: string, date: string, partySize: number) {
  // Get venue tables that can accommodate the party
  const { data: tables, error: tablesError } = await supabase
    .from('venue_tables')
    .select('*')
    .eq('venue_id', venueId)
    .eq('is_active', true)
    .gte('seats', partySize);

  if (tablesError) {
    console.error('[availability] Tables error:', tablesError);
  }

  // Get existing bookings for the date
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('*')
    .eq('venue_id', venueId)
    .eq('booking_date', date)
    .in('status', ['pending', 'confirmed']);

  if (bookingsError) {
    console.error('[availability] Bookings error:', bookingsError);
  }

  // Generate time slots (7 PM - 11 PM for nightlife)
  const slots = [];
  const timeSlots = ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00'];
  
  for (const time of timeSlots) {
    const bookedCount = bookings?.filter((b: any) => b.arrival_window?.includes(time.split(':')[0]))?.length || 0;
    const availableTables = (tables?.length || 5) - bookedCount;
    
    if (availableTables > 0) {
      slots.push({
        id: `local-${date}-${time}`,
        slot_date: date,
        start_time: time,
        duration_minutes: 120,
        party_min: 1,
        party_max: 20,
        is_available: true,
        slots_remaining: availableTables,
        provider: 'local'
      });
    }
  }

  return new Response(
    JSON.stringify({ 
      slots,
      source: 'local',
      provider: null
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function fetchProviderAvailability(provider: any, date: string, partySize: number, seatingType?: string) {
  // This will be implemented per-provider
  // For now, return mock data structure
  console.log(`[fetchProviderAvailability] Provider: ${provider.provider}, Venue: ${provider.provider_venue_id}`);
  
  switch (provider.provider) {
    case 'tablecheck':
      return await fetchTableCheckAvailability(provider, date, partySize, seatingType);
    case 'opentable':
      return await fetchOpenTableAvailability(provider, date, partySize, seatingType);
    case 'sevenrooms':
      return await fetchSevenRoomsAvailability(provider, date, partySize, seatingType);
    default:
      console.log(`[fetchProviderAvailability] Unknown provider: ${provider.provider}`);
      return [];
  }
}

async function fetchTableCheckAvailability(provider: any, date: string, partySize: number, seatingType?: string) {
  // TableCheck API integration placeholder
  // Will implement when API credentials are available
  console.log('[TableCheck] Fetching availability...');
  
  // Mock response for now
  return [];
}

async function fetchOpenTableAvailability(provider: any, date: string, partySize: number, seatingType?: string) {
  // OpenTable API integration placeholder
  console.log('[OpenTable] Fetching availability...');
  return [];
}

async function fetchSevenRoomsAvailability(provider: any, date: string, partySize: number, seatingType?: string) {
  // SevenRooms API integration placeholder
  console.log('[SevenRooms] Fetching availability...');
  return [];
}

async function cacheAvailabilitySlots(supabase: any, venueId: string, provider: string, slots: any[]) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 1000); // 1 minute TTL

  const slotsToInsert = slots.map(slot => ({
    venue_id: venueId,
    provider: provider,
    slot_date: slot.slot_date || slot.date,
    start_time: slot.start_time || slot.time,
    end_time: slot.end_time,
    duration_minutes: slot.duration_minutes || 120,
    party_min: slot.party_min || 1,
    party_max: slot.party_max || 20,
    area_zone: slot.area_zone || slot.area,
    table_type: slot.table_type,
    requires_deposit: slot.requires_deposit || false,
    deposit_amount: slot.deposit_amount,
    min_spend: slot.min_spend,
    is_available: true,
    slots_remaining: slot.slots_remaining,
    provider_slot_id: slot.provider_slot_id || slot.id,
    cached_at: now.toISOString(),
    expires_at: expiresAt.toISOString()
  }));

  const { error } = await supabase
    .from('availability_slots')
    .upsert(slotsToInsert, {
      onConflict: 'venue_id,provider,slot_date,start_time,area_zone'
    });

  if (error) {
    console.error('[cacheAvailabilitySlots] Error:', error);
  }
}

async function handleCreateReservation(supabase: any, request: CreateReservationRequest) {
  const { venueId, slotId, date, time, partySize, guest, notes, seatingType } = request;

  console.log(`[create] Creating reservation for venue ${venueId}, date ${date}, time ${time}`);

  // Generate idempotency key
  const idempotencyKey = generateIdempotencyKey(venueId, date, time, guest.phone || guest.email || 'anonymous');

  // Check for existing reservation with same idempotency key
  const { data: existing } = await supabase
    .from('external_reservations')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .single();

  if (existing) {
    console.log('[create] Found existing reservation with same idempotency key');
    return new Response(
      JSON.stringify({ 
        success: true,
        bookingId: existing.booking_id,
        externalId: existing.id,
        message: 'Reservation already exists'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if venue has provider mapping
  const { data: mappings } = await supabase
    .from('venue_provider_mappings')
    .select('*')
    .eq('venue_id', venueId)
    .eq('is_active', true);

  const hasProvider = mappings && mappings.length > 0;
  const provider = hasProvider ? mappings[0] : null;

  // Create local booking first
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      venue_id: venueId,
      user_id: '00000000-0000-0000-0000-000000000001', // Will be replaced with actual user
      booking_date: date,
      arrival_window: time,
      party_size: partySize,
      special_requests: notes,
      status: hasProvider ? 'pending' : 'confirmed',
      booking_type: seatingType || 'night_reservation'
    })
    .select()
    .single();

  if (bookingError) {
    console.error('[create] Booking error:', bookingError);
    throw bookingError;
  }

  // If provider exists, create external reservation record
  if (provider) {
    const { error: extError } = await supabase
      .from('external_reservations')
      .insert({
        booking_id: booking.id,
        venue_id: venueId,
        provider: provider.provider,
        idempotency_key: idempotencyKey,
        sync_status: 'pending'
      });

    if (extError) {
      console.error('[create] External reservation error:', extError);
    }

    // Trigger async sync to provider
    await syncToProvider(supabase, booking.id, provider, {
      action: 'create',
      date,
      time,
      partySize,
      guest,
      notes,
      seatingType,
      idempotencyKey
    });
  }

  return new Response(
    JSON.stringify({ 
      success: true,
      bookingId: booking.id,
      bookingReference: booking.booking_reference,
      status: booking.status,
      provider: provider?.provider || null,
      syncStatus: provider ? 'pending' : 'n/a'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function syncToProvider(supabase: any, bookingId: string, provider: any, data: any) {
  console.log(`[syncToProvider] Syncing booking ${bookingId} to ${provider.provider}`);

  try {
    // Update sync status to syncing
    await supabase
      .from('external_reservations')
      .update({ sync_status: 'syncing' })
      .eq('booking_id', bookingId);

    let providerResult;
    
    switch (provider.provider) {
      case 'tablecheck':
        providerResult = await syncToTableCheck(provider, data);
        break;
      case 'opentable':
        providerResult = await syncToOpenTable(provider, data);
        break;
      case 'sevenrooms':
        providerResult = await syncToSevenRooms(provider, data);
        break;
      default:
        throw new Error(`Unknown provider: ${provider.provider}`);
    }

    // Update with success
    await supabase
      .from('external_reservations')
      .update({
        sync_status: 'synced',
        provider_reservation_id: providerResult.reservationId,
        provider_confirmation_number: providerResult.confirmationNumber,
        provider_response: providerResult,
        last_synced_at: new Date().toISOString()
      })
      .eq('booking_id', bookingId);

    // Update booking status to confirmed
    await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId);

  } catch (error: any) {
    console.error(`[syncToProvider] Error:`, error);
    
    await supabase
      .from('external_reservations')
      .update({
        sync_status: 'failed',
        error_message: error.message,
        retry_count: 1,
        next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      })
      .eq('booking_id', bookingId);
  }
}

async function syncToTableCheck(provider: any, data: any) {
  // TableCheck API sync placeholder
  console.log('[TableCheck] Syncing reservation...');
  // Will implement when API credentials are available
  return { reservationId: null, confirmationNumber: null };
}

async function syncToOpenTable(provider: any, data: any) {
  console.log('[OpenTable] Syncing reservation...');
  return { reservationId: null, confirmationNumber: null };
}

async function syncToSevenRooms(provider: any, data: any) {
  console.log('[SevenRooms] Syncing reservation...');
  return { reservationId: null, confirmationNumber: null };
}

async function handleModifyReservation(supabase: any, request: ModifyReservationRequest) {
  const { reservationId, changes } = request;
  console.log(`[modify] Modifying reservation ${reservationId}`);

  // Get booking and external reservation
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*, external_reservations(*)')
    .eq('id', reservationId)
    .single();

  if (bookingError || !booking) {
    throw new Error('Reservation not found');
  }

  // Update local booking
  const updateData: any = {};
  if (changes.date) updateData.booking_date = changes.date;
  if (changes.time) updateData.arrival_window = changes.time;
  if (changes.partySize) updateData.party_size = changes.partySize;
  if (changes.notes) updateData.special_requests = changes.notes;

  const { error: updateError } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', reservationId);

  if (updateError) {
    throw updateError;
  }

  // If external reservation exists, update sync status
  if (booking.external_reservations && booking.external_reservations.length > 0) {
    await supabase
      .from('external_reservations')
      .update({ sync_status: 'modified' })
      .eq('booking_id', reservationId);

    // TODO: Trigger provider sync for modification
  }

  return new Response(
    JSON.stringify({ success: true, message: 'Reservation modified' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleCancelReservation(supabase: any, request: CancelReservationRequest) {
  const { reservationId, reason } = request;
  console.log(`[cancel] Cancelling reservation ${reservationId}`);

  // Update local booking
  const { error: updateError } = await supabase
    .from('bookings')
    .update({ 
      status: 'cancelled',
      special_requests: reason ? `Cancelled: ${reason}` : 'Cancelled'
    })
    .eq('id', reservationId);

  if (updateError) {
    throw updateError;
  }

  // Update external reservation if exists
  const { data: extRes } = await supabase
    .from('external_reservations')
    .select('*')
    .eq('booking_id', reservationId)
    .single();

  if (extRes) {
    await supabase
      .from('external_reservations')
      .update({ sync_status: 'cancelled' })
      .eq('booking_id', reservationId);

    // TODO: Trigger provider sync for cancellation
  }

  return new Response(
    JSON.stringify({ success: true, message: 'Reservation cancelled' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleGetProviders(supabase: any, venueId: string) {
  const { data, error } = await supabase
    .from('venue_provider_mappings')
    .select('id, provider, provider_venue_id, seating_types, policies, is_active, last_sync_at')
    .eq('venue_id', venueId);

  if (error) {
    throw error;
  }

  return new Response(
    JSON.stringify({ providers: data || [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleGetSyncStatus(supabase: any, bookingId: string) {
  const { data, error } = await supabase
    .from('external_reservations')
    .select('*')
    .eq('booking_id', bookingId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return new Response(
    JSON.stringify({ 
      hasExternalReservation: !!data,
      syncStatus: data?.sync_status || null,
      providerConfirmation: data?.provider_confirmation_number || null,
      lastSyncedAt: data?.last_synced_at || null
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
