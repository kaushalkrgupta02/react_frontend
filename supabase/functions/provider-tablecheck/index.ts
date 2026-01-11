import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// TableCheck API Configuration
// Docs: https://api.tablecheck.com/docs
const TABLECHECK_API_BASE = 'https://api.tablecheck.com/v2';

interface TableCheckCredentials {
  apiKey: string;
  shopId: string; // TableCheck's venue ID
}

interface AvailabilityParams {
  date: string;
  partySize: number;
  seatingType?: string;
}

interface ReservationParams {
  date: string;
  time: string;
  partySize: number;
  guest: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  };
  notes?: string;
  seatingType?: string;
  idempotencyKey: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, venueId, ...params } = await req.json();

    console.log(`[TableCheck] Action: ${action}, Venue: ${venueId}`);

    // Get provider credentials
    const { data: mapping, error: mappingError } = await supabase
      .from('venue_provider_mappings')
      .select('*')
      .eq('venue_id', venueId)
      .eq('provider', 'tablecheck')
      .eq('is_active', true)
      .single();

    if (mappingError || !mapping) {
      throw new Error('TableCheck not configured for this venue');
    }

    // Decrypt credentials (in production, use proper encryption)
    const credentials: TableCheckCredentials = JSON.parse(mapping.api_credentials_encrypted || '{}');

    if (!credentials.apiKey || !credentials.shopId) {
      throw new Error('TableCheck API credentials not configured');
    }

    switch (action) {
      case 'availability':
        return await getAvailability(credentials, params as AvailabilityParams);
      
      case 'create':
        return await createReservation(credentials, params as ReservationParams);
      
      case 'modify':
        return await modifyReservation(credentials, params);
      
      case 'cancel':
        return await cancelReservation(credentials, params);
      
      case 'get':
        return await getReservation(credentials, params.reservationId);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error: any) {
    console.error('[TableCheck] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getAvailability(credentials: TableCheckCredentials, params: AvailabilityParams) {
  console.log('[TableCheck] Getting availability:', params);

  // TableCheck Availability API
  // GET /shops/{shop_id}/availability
  const queryParams = new URLSearchParams({
    date: params.date,
    num_people: params.partySize.toString(),
  });

  if (params.seatingType) {
    queryParams.append('course_id', params.seatingType);
  }

  try {
    const response = await fetch(
      `${TABLECHECK_API_BASE}/shops/${credentials.shopId}/availability?${queryParams}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TableCheck] Availability API error:', response.status, errorText);
      throw new Error(`TableCheck API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[TableCheck] Availability response:', JSON.stringify(data).substring(0, 500));

    // Transform TableCheck response to our canonical format
    const slots = transformAvailabilityResponse(data, params.date);

    return new Response(
      JSON.stringify({ slots, raw: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (fetchError: any) {
    console.error('[TableCheck] Fetch error:', fetchError);
    return new Response(
      JSON.stringify({ slots: [], error: fetchError.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

function transformAvailabilityResponse(data: any, date: string): any[] {
  // Transform TableCheck availability to our canonical slot format
  // TableCheck returns time slots with availability info
  
  if (!data || !data.availability) {
    return [];
  }

  return data.availability.map((slot: any) => ({
    id: `tc-${date}-${slot.time}`,
    slot_date: date,
    start_time: slot.time,
    duration_minutes: slot.duration || 120,
    party_min: slot.min_people || 1,
    party_max: slot.max_people || 20,
    area_zone: slot.table_type || slot.area,
    requires_deposit: slot.requires_deposit || false,
    deposit_amount: slot.deposit_amount,
    min_spend: slot.minimum_spend,
    is_available: slot.available !== false,
    slots_remaining: slot.remaining_seats,
    provider_slot_id: slot.slot_id || slot.id,
    provider: 'tablecheck'
  }));
}

async function createReservation(credentials: TableCheckCredentials, params: ReservationParams) {
  console.log('[TableCheck] Creating reservation:', params);

  // TableCheck Booking API
  // POST /shops/{shop_id}/reservations
  const payload = {
    date: params.date,
    start_time: params.time,
    num_people: params.partySize,
    customer: {
      first_name: params.guest.firstName,
      last_name: params.guest.lastName,
      phone: params.guest.phone,
      email: params.guest.email,
    },
    notes: params.notes,
    idempotency_key: params.idempotencyKey,
  };

  if (params.seatingType) {
    (payload as any).course_id = params.seatingType;
  }

  try {
    const response = await fetch(
      `${TABLECHECK_API_BASE}/shops/${credentials.shopId}/reservations`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Idempotency-Key': params.idempotencyKey,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TableCheck] Create reservation error:', response.status, errorText);
      throw new Error(`TableCheck API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[TableCheck] Reservation created:', data);

    return new Response(
      JSON.stringify({
        success: true,
        reservationId: data.reservation_id || data.id,
        confirmationNumber: data.confirmation_number,
        status: data.status,
        raw: data,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (fetchError) {
    console.error('[TableCheck] Create reservation fetch error:', fetchError);
    throw fetchError;
  }
}

async function modifyReservation(credentials: TableCheckCredentials, params: any) {
  console.log('[TableCheck] Modifying reservation:', params);

  const { reservationId, changes } = params;

  const payload: any = {};
  if (changes.date) payload.date = changes.date;
  if (changes.time) payload.start_time = changes.time;
  if (changes.partySize) payload.num_people = changes.partySize;
  if (changes.notes) payload.notes = changes.notes;

  try {
    const response = await fetch(
      `${TABLECHECK_API_BASE}/shops/${credentials.shopId}/reservations/${reservationId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TableCheck API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({ success: true, raw: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (fetchError) {
    console.error('[TableCheck] Modify reservation error:', fetchError);
    throw fetchError;
  }
}

async function cancelReservation(credentials: TableCheckCredentials, params: any) {
  console.log('[TableCheck] Cancelling reservation:', params);

  const { reservationId, reason } = params;

  try {
    const response = await fetch(
      `${TABLECHECK_API_BASE}/shops/${credentials.shopId}/reservations/${reservationId}/cancel`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ reason: reason || 'Customer requested cancellation' }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TableCheck API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({ success: true, raw: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (fetchError) {
    console.error('[TableCheck] Cancel reservation error:', fetchError);
    throw fetchError;
  }
}

async function getReservation(credentials: TableCheckCredentials, reservationId: string) {
  console.log('[TableCheck] Getting reservation:', reservationId);

  try {
    const response = await fetch(
      `${TABLECHECK_API_BASE}/shops/${credentials.shopId}/reservations/${reservationId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TableCheck API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({
        reservation: {
          id: data.id,
          status: data.status,
          date: data.date,
          time: data.start_time,
          partySize: data.num_people,
          confirmationNumber: data.confirmation_number,
        },
        raw: data,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (fetchError) {
    console.error('[TableCheck] Get reservation error:', fetchError);
    throw fetchError;
  }
}
