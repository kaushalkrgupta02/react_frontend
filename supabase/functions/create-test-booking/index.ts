import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { venue_id, booking_date, party_size, arrival_window, special_requests } = await req.json();

    if (!venue_id || !booking_date) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role to bypass RLS and FK constraints
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Create a test user ID that we'll use consistently
    const testUserId = '00000000-0000-0000-0000-000000000001';

    // First, ensure the test user exists in profiles (not auth.users since we can't insert there)
    // We'll need to remove the FK constraint or use a different approach
    
    // Actually, let's insert directly without the FK check by using raw SQL
    const { data, error } = await supabaseAdmin.rpc('create_test_booking', {
      p_venue_id: venue_id,
      p_booking_date: booking_date,
      p_party_size: party_size || 2,
      p_arrival_window: arrival_window || null,
      p_special_requests: special_requests || 'Test booking',
    });

    if (error) {
      console.error('Error creating test booking:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Test booking created successfully:', data);

    // Extract booking_id from the RPC response
    const result = data as { success: boolean; booking_id: string; booking_reference: string };

    return new Response(
      JSON.stringify({ 
        success: true, 
        booking_id: result.booking_id,
        booking_reference: result.booking_reference 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
