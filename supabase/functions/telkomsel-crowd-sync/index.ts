import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock crowd levels for demo - In production, fetch from Telkomsel API
function getMockCrowdData(venueId: string) {
  const hour = new Date().getHours();
  let baseDensity = 50;
  
  // Simulate nightlife patterns
  if (hour >= 21 && hour < 24) baseDensity = 150 + Math.random() * 100;
  else if (hour >= 0 && hour < 3) baseDensity = 200 + Math.random() * 100;
  else if (hour >= 18 && hour < 21) baseDensity = 80 + Math.random() * 70;
  else baseDensity = 20 + Math.random() * 30;
  
  const density = Math.round(baseDensity);
  let crowdLevel: string;
  
  if (density < 50) crowdLevel = 'quiet';
  else if (density < 100) crowdLevel = 'moderate';
  else if (density < 200) crowdLevel = 'busy';
  else if (density < 300) crowdLevel = 'very_busy';
  else crowdLevel = 'packed';
  
  return {
    population_density: density,
    crowd_level: crowdLevel,
    confidence: 0.75 + Math.random() * 0.2,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting Telkomsel crowd sync...');

    // Get all venues
    const { data: venues, error: venueError } = await supabaseClient
      .from('venues')
      .select('id, name, latitude, longitude')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (venueError) throw venueError;

    console.log(`Syncing crowd data for ${venues?.length || 0} venues`);

    const snapshots = [];
    const now = new Date().toISOString();

    for (const venue of venues || []) {
      // In production: Call Telkomsel API with venue coordinates
      // For demo: Use mock data
      const crowdData = getMockCrowdData(venue.id);

      snapshots.push({
        venue_id: venue.id,
        snapshot_at: now,
        population_density: crowdData.population_density,
        crowd_level: crowdData.crowd_level,
        confidence: crowdData.confidence,
        source: 'telkomsel_api_mock',
      });

      console.log(`${venue.name}: ${crowdData.crowd_level} (${crowdData.population_density} people)`);
    }

    // Insert all snapshots
    if (snapshots.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('venue_crowd_snapshots')
        .insert(snapshots);

      if (insertError) {
        console.error('Failed to insert snapshots:', insertError);
        throw insertError;
      }
    }

    // Optionally update venue status based on crowd level
    // This can be enabled per-venue in settings
    for (const snapshot of snapshots) {
      const statusMap: Record<string, string> = {
        'quiet': 'quiet',
        'moderate': 'perfect',
        'busy': 'busy',
        'very_busy': 'too_busy',
        'packed': 'too_busy',
      };

      // Uncomment to enable auto-status updates
      // await supabaseClient
      //   .from('venues')
      //   .update({ status: statusMap[snapshot.crowd_level] })
      //   .eq('id', snapshot.venue_id);
    }

    console.log(`Successfully synced ${snapshots.length} venue crowd snapshots`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: snapshots.length,
        timestamp: now
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Crowd sync error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
