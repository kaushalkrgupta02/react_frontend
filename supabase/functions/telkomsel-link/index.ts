import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Demo/Mock Telkomsel API - Replace with actual API in production
const MOCK_TELKOMSEL_DATA = {
  homeLocation: { latitude: -6.2088, longitude: 106.8456, address: "Jakarta Pusat, DKI Jakarta" },
  officeLocation: { latitude: -6.2297, longitude: 106.8295, address: "SCBD, Jakarta Selatan" },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    const { phoneNumber, otp, action } = await req.json();

    console.log(`Telkomsel Link - Action: ${action}, Phone: ${phoneNumber}, User: ${user.id}`);

    if (action === 'request-otp') {
      // In production: Call Telkomsel API to send OTP
      // For demo: Simulate OTP sent
      console.log(`[MOCK] Sending OTP to ${phoneNumber}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'OTP sent (Demo Mode - use any 6-digit code)' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'link') {
      // In production: Verify OTP with Telkomsel, then fetch Customer 360 data
      // For demo: Accept any 6-digit OTP and use mock data
      
      if (!otp || otp.length !== 6) {
        throw new Error('Invalid OTP');
      }

      console.log(`[MOCK] Verifying OTP ${otp} for ${phoneNumber}`);
      console.log(`[MOCK] Fetching Customer 360 data from Telkomsel`);

      // Simulate fetching location data from Telkomsel
      const telkomselData = MOCK_TELKOMSEL_DATA;

      // Store/update user location data
      const { error: upsertError } = await supabaseClient
        .from('user_locations')
        .upsert({
          user_id: user.id,
          phone_number: phoneNumber,
          home_latitude: telkomselData.homeLocation.latitude,
          home_longitude: telkomselData.homeLocation.longitude,
          home_address: telkomselData.homeLocation.address,
          office_latitude: telkomselData.officeLocation.latitude,
          office_longitude: telkomselData.officeLocation.longitude,
          office_address: telkomselData.officeLocation.address,
          consent_granted: true,
          telkomsel_linked_at: new Date().toISOString(),
          last_sync_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) {
        console.error('Failed to store user location:', upsertError);
        throw new Error('Failed to link phone number');
      }

      console.log(`Successfully linked ${phoneNumber} for user ${user.id}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Phone linked successfully',
          locations: {
            home: telkomselData.homeLocation.address,
            office: telkomselData.officeLocation.address
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Telkomsel Link error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
