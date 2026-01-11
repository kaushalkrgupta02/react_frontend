import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DemandPrediction {
  type: 'demand' | 'staffing' | 'noShow' | 'revenue';
  title: string;
  value: string;
  confidence: number;
  insight: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

interface NoShowRiskBooking {
  bookingId: string;
  bookingRef: string;
  partySize: number;
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number;
  riskFactors: string[];
  suggestedAction: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { venueId, targetDate } = await req.json();
    const LITELLM_API_URL = Deno.env.get('LITELLM_API_URL');
    const LITELLM_API_KEY = Deno.env.get('LITELLM_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!LITELLM_API_URL || !LITELLM_API_KEY) {
      throw new Error('LITELLM_API_URL or LITELLM_API_KEY is not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Fetch historical data for the venue
    const targetDateObj = targetDate ? new Date(targetDate) : new Date();
    const dayOfWeek = targetDateObj.getDay();
    const dateStr = targetDateObj.toISOString().split('T')[0];
    
    // Get past bookings for this day of week (last 8 weeks)
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
    
    const { data: historicalBookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('venue_id', venueId)
      .gte('booking_date', eightWeeksAgo.toISOString().split('T')[0])
      .order('booking_date', { ascending: false });

    // Get booking outcomes for no-show analysis
    const { data: outcomes } = await supabase
      .from('booking_outcomes')
      .select('*')
      .eq('venue_id', venueId)
      .gte('created_at', eightWeeksAgo.toISOString());

    // Get today's/target date bookings for risk assessment
    const { data: todayBookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('venue_id', venueId)
      .eq('booking_date', dateStr)
      .in('status', ['pending', 'confirmed']);

    // Get venue analytics for the same day of week
    const { data: venueAnalytics } = await supabase
      .from('venue_analytics')
      .select('*')
      .eq('venue_id', venueId)
      .eq('day_of_week', dayOfWeek)
      .order('recorded_at', { ascending: false })
      .limit(50);

    // Calculate historical metrics
    const sameDayBookings = historicalBookings?.filter(b => {
      const d = new Date(b.booking_date);
      return d.getDay() === dayOfWeek;
    }) || [];

    const avgBookings = sameDayBookings.length > 0 
      ? sameDayBookings.length / 8 
      : 0;
    
    const avgPartySize = sameDayBookings.length > 0
      ? sameDayBookings.reduce((sum, b) => sum + (b.party_size || 2), 0) / sameDayBookings.length
      : 2;

    const noShowRate = outcomes && outcomes.length > 0
      ? (outcomes.filter(o => o.outcome === 'no_show').length / outcomes.length) * 100
      : 15;

    const avgCapacity = venueAnalytics && venueAnalytics.length > 0
      ? venueAnalytics.reduce((sum, a) => sum + (a.capacity_percentage || 0), 0) / venueAnalytics.length
      : 50;

    const avgRevenue = venueAnalytics && venueAnalytics.length > 0
      ? venueAnalytics.reduce((sum, a) => sum + (a.revenue_estimate || 0), 0) / venueAnalytics.length
      : 0;

    // Build context for AI
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    const currentBookingsCount = todayBookings?.length || 0;
    const currentTotalGuests = todayBookings?.reduce((sum, b) => sum + (b.party_size || 2), 0) || 0;

    const prompt = `You are an expert nightlife venue analytics AI. Analyze this data and provide predictions.

VENUE DATA FOR ${dayName}:
- Historical average bookings on ${dayName}s: ${avgBookings.toFixed(1)}
- Average party size: ${avgPartySize.toFixed(1)} guests
- Historical no-show rate: ${noShowRate.toFixed(1)}%
- Average capacity utilization: ${avgCapacity.toFixed(0)}%
- Average revenue: Rp ${avgRevenue.toLocaleString()}
- Is weekend: ${isWeekend}

TODAY'S STATUS (${dateStr}):
- Current bookings: ${currentBookingsCount}
- Expected guests: ${currentTotalGuests}

Provide predictions in this exact JSON format:
{
  "demandLevel": "low|moderate|high|very_high",
  "expectedFootfall": <number>,
  "expectedRevenueMin": <number>,
  "expectedRevenueMax": <number>,
  "recommendedStaff": <number>,
  "peakHours": ["10PM", "11PM", "12AM"],
  "noShowRiskPercent": <number>,
  "confidence": <0-100>,
  "insights": [
    "insight 1",
    "insight 2"
  ],
  "staffingBreakdown": {
    "bartenders": <number>,
    "servers": <number>,
    "security": <number>,
    "hosts": <number>
  }
}`;

    // Ensure proper endpoint path - LiteLLM may need /v1/chat/completions or /chat/completions
    const apiEndpoint = LITELLM_API_URL.endsWith('/v1') 
      ? `${LITELLM_API_URL}/chat/completions`
      : LITELLM_API_URL.includes('/v1/') 
        ? `${LITELLM_API_URL.replace(/\/+$/, '')}/chat/completions`.replace('/v1/chat', '/v1/chat')
        : `${LITELLM_API_URL.replace(/\/+$/, '')}/v1/chat/completions`;

    console.log('Calling AI endpoint:', apiEndpoint);
    console.log('Using model: azure_ai/gpt-5-mini');

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LITELLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'azure_ai/gpt-5-mini',
        messages: [
          { role: 'system', content: 'You are a venue analytics AI. Always respond with valid JSON only, no markdown.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('AI gateway error:', response.status, errorBody);
      throw new Error(`AI gateway error: ${response.status} - ${errorBody}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '{}';
    
    let aiPredictions;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      aiPredictions = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      aiPredictions = {};
    }

    // Build predictions array
    const predictions: DemandPrediction[] = [
      {
        type: 'demand',
        title: `${dayName}'s Forecast`,
        value: aiPredictions.demandLevel === 'very_high' ? 'Very High' 
             : aiPredictions.demandLevel === 'high' ? 'High Demand'
             : aiPredictions.demandLevel === 'moderate' ? 'Moderate'
             : 'Low Demand',
        confidence: aiPredictions.confidence || 75,
        insight: aiPredictions.insights?.[0] || `Expected ${aiPredictions.expectedFootfall || Math.round(currentTotalGuests * 1.2)} guests`,
        metadata: {
          expectedFootfall: aiPredictions.expectedFootfall,
          peakHours: aiPredictions.peakHours,
        }
      },
      {
        type: 'staffing',
        title: 'Staffing Recommendation',
        value: `${aiPredictions.recommendedStaff || 5} Staff`,
        confidence: aiPredictions.confidence || 75,
        insight: aiPredictions.staffingBreakdown 
          ? `${aiPredictions.staffingBreakdown.bartenders || 2} bar, ${aiPredictions.staffingBreakdown.servers || 2} floor, ${aiPredictions.staffingBreakdown.security || 1} security`
          : 'Based on predicted guest count',
        action: 'Adjust Schedule',
        metadata: {
          breakdown: aiPredictions.staffingBreakdown
        }
      },
      {
        type: 'revenue',
        title: 'Revenue Estimate',
        value: aiPredictions.expectedRevenueMin 
          ? `Rp ${(aiPredictions.expectedRevenueMin / 1000000).toFixed(1)}M - ${(aiPredictions.expectedRevenueMax / 1000000).toFixed(1)}M`
          : 'Calculating...',
        confidence: aiPredictions.confidence || 70,
        insight: aiPredictions.insights?.[1] || 'Based on historical patterns',
      },
    ];

    // Analyze no-show risk for each booking
    const noShowRiskBookings: NoShowRiskBooking[] = (todayBookings || []).map(booking => {
      const riskFactors: string[] = [];
      let riskScore = 0;
      
      // Large party = higher risk
      if (booking.party_size >= 6) {
        riskScore += 20;
        riskFactors.push('Large party size');
      }
      
      // No special requests might indicate less committed
      if (!booking.special_requests) {
        riskScore += 10;
        riskFactors.push('No special requests');
      }
      
      // Late bookings (same day) = higher risk
      const bookingCreated = new Date(booking.created_at);
      const bookingDate = new Date(booking.booking_date);
      const daysInAdvance = Math.floor((bookingDate.getTime() - bookingCreated.getTime()) / (1000 * 60 * 60 * 24));
      if (daysInAdvance <= 0) {
        riskScore += 25;
        riskFactors.push('Same-day booking');
      } else if (daysInAdvance <= 1) {
        riskScore += 15;
        riskFactors.push('Last-minute booking');
      }
      
      // Add base historical no-show rate
      riskScore += noShowRate * 0.5;
      
      // Determine risk level
      const riskLevel = riskScore >= 40 ? 'high' : riskScore >= 20 ? 'medium' : 'low';
      
      // Suggest action
      let suggestedAction = 'Standard confirmation';
      if (riskLevel === 'high') {
        suggestedAction = 'Request deposit or send extra reminder';
      } else if (riskLevel === 'medium') {
        suggestedAction = 'Send WhatsApp reminder';
      }

      return {
        bookingId: booking.id,
        bookingRef: booking.booking_reference,
        partySize: booking.party_size,
        riskLevel,
        riskScore: Math.min(100, Math.round(riskScore)),
        riskFactors,
        suggestedAction,
      };
    });

    // Add no-show prediction to insights
    const highRiskCount = noShowRiskBookings.filter(b => b.riskLevel === 'high').length;
    const overallNoShowRisk = noShowRiskBookings.length > 0
      ? noShowRiskBookings.reduce((sum, b) => sum + b.riskScore, 0) / noShowRiskBookings.length
      : aiPredictions.noShowRiskPercent || noShowRate;

    predictions.push({
      type: 'noShow',
      title: 'No-Show Risk',
      value: `${Math.round(overallNoShowRisk)}% Risk`,
      confidence: 80,
      insight: highRiskCount > 0 
        ? `${highRiskCount} booking${highRiskCount > 1 ? 's' : ''} flagged as high-risk`
        : 'All bookings look reliable',
      action: highRiskCount > 0 ? 'Send Reminders' : undefined,
      metadata: {
        highRiskCount,
        totalBookings: noShowRiskBookings.length,
      }
    });

    return new Response(JSON.stringify({ 
      predictions,
      noShowRiskBookings,
      rawPredictions: aiPredictions,
      dataContext: {
        dayOfWeek: dayName,
        isWeekend,
        historicalBookings: sameDayBookings.length,
        currentBookings: currentBookingsCount,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-demand-forecast:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      predictions: [],
      noShowRiskBookings: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
