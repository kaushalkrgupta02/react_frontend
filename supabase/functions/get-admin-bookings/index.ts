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
    // Parse request body for filters
    let venueId: string | null = null;
    let startDate: string | null = null;
    let endDate: string | null = null;
    
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        venueId = body?.venue_id || null;
        startDate = body?.start_date || null;
        endDate = body?.end_date || null;
      } catch {
        // No body or invalid JSON, that's ok
      }
    }

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    console.log('Fetching bookings with service role...', 
      venueId ? `for venue: ${venueId}` : 'all venues',
      startDate ? `from: ${startDate}` : '',
      endDate ? `to: ${endDate}` : ''
    );

    let query = supabaseAdmin
      .from('bookings')
      .select(`
        *,
        venue:venues(id, name)
      `)
      .order('booking_date', { ascending: false })
      .order('created_at', { ascending: false });

    // Filter by venue if specified
    if (venueId) {
      query = query.eq('venue_id', venueId);
    }

    // Filter by date range if specified
    if (startDate) {
      query = query.gte('booking_date', startDate);
    }
    if (endDate) {
      query = query.lte('booking_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching bookings:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${data?.length || 0} bookings`);

    return new Response(
      JSON.stringify({ success: true, bookings: data }),
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
