import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getLiteLLMEndpoint(baseUrl: string): string {
  if (baseUrl.endsWith('/v1')) {
    return `${baseUrl}/chat/completions`;
  } else if (baseUrl.includes('/v1/')) {
    return `${baseUrl.replace(/\/+$/, '')}/chat/completions`.replace('/v1/chat', '/v1/chat');
  }
  return `${baseUrl.replace(/\/+$/, '')}/v1/chat/completions`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { venueId, recalculateAll } = await req.json();
    
    const LITELLM_API_URL = Deno.env.get('LITELLM_API_URL');
    const LITELLM_API_KEY = Deno.env.get('LITELLM_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!LITELLM_API_URL || !LITELLM_API_KEY) {
      throw new Error('LITELLM_API_URL or LITELLM_API_KEY is not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const apiEndpoint = getLiteLLMEndpoint(LITELLM_API_URL);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();
    
    // Get venues to process
    let venuesQuery = supabase.from('venues').select('id, name');
    if (venueId) {
      venuesQuery = venuesQuery.eq('id', venueId);
    }
    
    const { data: venues } = await venuesQuery;
    
    if (!venues || venues.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No venues found',
        profilesCreated: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${venues.length} venues for profiling`);
    
    const profiles: any[] = [];
    
    for (const venue of venues) {
      // Fetch all data for venue
      const [
        analyticsResult,
        bookingsResult,
        outcomesResult,
        feedbackResult,
        promoAnalyticsResult,
        customerSegmentsResult,
      ] = await Promise.all([
        supabase.from('venue_analytics')
          .select('*')
          .eq('venue_id', venue.id)
          .gte('created_at', thirtyDaysAgoStr),
        supabase.from('bookings')
          .select('*')
          .eq('venue_id', venue.id)
          .gte('booking_date', thirtyDaysAgo.toISOString().split('T')[0]),
        supabase.from('booking_outcomes')
          .select('*')
          .eq('venue_id', venue.id)
          .gte('created_at', thirtyDaysAgoStr),
        supabase.from('visit_feedback')
          .select('*')
          .eq('venue_id', venue.id)
          .gte('created_at', thirtyDaysAgoStr),
        supabase.from('promo_analytics')
          .select('*, promos(title, discount_type)')
          .eq('venue_id', venue.id),
        supabase.from('customer_segments')
          .select('segment_name, user_id'),
      ]);
      
      const analytics = analyticsResult.data || [];
      const bookings = bookingsResult.data || [];
      const outcomes = outcomesResult.data || [];
      const feedback = feedbackResult.data || [];
      const promoAnalytics = promoAnalyticsResult.data || [];
      const customerSegments = customerSegmentsResult.data || [];
      
      // Calculate capacity utilization
      const avgCapacityUtilization = analytics.length > 0
        ? analytics.reduce((sum, a) => sum + (a.capacity_percentage || 0), 0) / analytics.length
        : 0;
      
      // Calculate show-up rate
      const totalOutcomes = outcomes.length;
      const showedUp = outcomes.filter(o => o.outcome === 'showed').length;
      const avgShowUpRate = totalOutcomes > 0 ? (showedUp / totalOutcomes) * 100 : 85;
      
      // Calculate avg spend
      const spendOutcomes = outcomes.filter(o => o.spend_amount);
      const avgCustomerSpend = spendOutcomes.length > 0
        ? spendOutcomes.reduce((sum, o) => sum + Number(o.spend_amount), 0) / spendOutcomes.length
        : 0;
      
      // Total revenue and bookings
      const totalRevenue30d = spendOutcomes.reduce((sum, o) => sum + Number(o.spend_amount), 0);
      const totalBookings30d = bookings.length;
      
      // Calculate peak days
      const dayStats: Record<number, { count: number; revenue: number }> = {};
      bookings.forEach(b => {
        const day = new Date(b.booking_date).getDay();
        if (!dayStats[day]) dayStats[day] = { count: 0, revenue: 0 };
        dayStats[day].count++;
      });
      outcomes.forEach(o => {
        const booking = bookings.find(b => b.id === o.booking_id);
        if (booking) {
          const day = new Date(booking.booking_date).getDay();
          if (dayStats[day]) {
            dayStats[day].revenue += Number(o.spend_amount || 0);
          }
        }
      });
      
      const dayScores = Object.entries(dayStats)
        .map(([day, stats]) => ({ day: Number(day), score: stats.count * 10 + stats.revenue / 100000 }))
        .sort((a, b) => b.score - a.score);
      
      const peakDays = dayScores.slice(0, 3);
      const slowDays = dayScores.slice(-3).reverse();
      
      // Peak hours from analytics
      const hourStats: Record<number, number> = {};
      analytics.forEach(a => {
        if (a.hour_of_day !== null) {
          hourStats[a.hour_of_day] = (hourStats[a.hour_of_day] || 0) + (a.footfall_count || 0);
        }
      });
      
      const peakHours = Object.entries(hourStats)
        .map(([hour, footfall]) => ({ hour: Number(hour), footfall }))
        .sort((a, b) => b.footfall - a.footfall)
        .slice(0, 5);
      
      // Customer segment distribution
      const venueCustomerIds = new Set(bookings.map(b => b.user_id));
      const venueSegments = customerSegments.filter(s => venueCustomerIds.has(s.user_id));
      const segmentCounts: Record<string, number> = {};
      venueSegments.forEach(s => {
        segmentCounts[s.segment_name] = (segmentCounts[s.segment_name] || 0) + 1;
      });
      
      const topCustomerSegments = Object.entries(segmentCounts)
        .map(([segment, count]) => ({
          segment,
          count,
          percentage: venueSegments.length > 0 ? (count / venueSegments.length) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      // Avg party size
      const avgPartySize = bookings.length > 0
        ? bookings.reduce((sum, b) => sum + (b.party_size || 2), 0) / bookings.length
        : 2;
      
      // Repeat customer rate
      const customerBookingCounts: Record<string, number> = {};
      bookings.forEach(b => {
        customerBookingCounts[b.user_id] = (customerBookingCounts[b.user_id] || 0) + 1;
      });
      const repeatCustomers = Object.values(customerBookingCounts).filter(c => c >= 2).length;
      const uniqueCustomers = Object.keys(customerBookingCounts).length;
      const repeatCustomerRate = uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0;
      
      // Promo effectiveness
      const totalImpressions = promoAnalytics.reduce((sum, p) => sum + (p.impressions || 0), 0);
      const totalRedemptions = promoAnalytics.reduce((sum, p) => sum + (p.redemptions || 0), 0);
      const avgPromoRedemptionRate = totalImpressions > 0 ? (totalRedemptions / totalImpressions) * 100 : 0;
      const promoEffectivenessScore = Math.min(100, avgPromoRedemptionRate * 10);
      
      // Best performing promo types
      const promoTypePerformance: Record<string, number> = {};
      promoAnalytics.forEach(p => {
        const type = (p.promos as any)?.discount_type || 'unknown';
        promoTypePerformance[type] = (promoTypePerformance[type] || 0) + (p.redemptions || 0);
      });
      const bestPerformingPromoTypes = Object.entries(promoTypePerformance)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type]) => type);
      
      // Generate AI insights
      const prompt = `You are a venue analytics AI. Analyze this venue's performance and generate growth opportunities and risk factors.

VENUE: ${venue.name}

30-DAY PERFORMANCE:
- Avg Capacity Utilization: ${avgCapacityUtilization.toFixed(1)}%
- Show-up Rate: ${avgShowUpRate.toFixed(1)}%
- Avg Customer Spend: Rp ${avgCustomerSpend.toLocaleString()}
- Total Revenue: Rp ${totalRevenue30d.toLocaleString()}
- Total Bookings: ${totalBookings30d}
- Repeat Customer Rate: ${repeatCustomerRate.toFixed(1)}%

PEAK DAYS: ${peakDays.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.day]).join(', ')}
SLOW DAYS: ${slowDays.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.day]).join(', ')}

TOP CUSTOMER SEGMENTS: ${topCustomerSegments.map(s => `${s.segment} (${s.percentage.toFixed(0)}%)`).join(', ')}

PROMO EFFECTIVENESS: ${promoEffectivenessScore.toFixed(0)}/100

Return JSON with growth opportunities and risk factors:
{
  "growthOpportunities": [
    {"title": "...", "description": "...", "expectedImpact": "high|medium|low"},
    ...
  ],
  "riskFactors": [
    {"title": "...", "description": "...", "severity": "high|medium|low"},
    ...
  ],
  "recommendations": [
    {"action": "...", "targetSegment": "...", "timing": "...", "expectedLift": "..."}
  ]
}`;

      let growthOpportunities: any[] = [];
      let riskFactors: any[] = [];
      let aiRecommendations: any[] = [];

      try {
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LITELLM_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'azure_ai/gpt-5-mini',
            messages: [
              { role: 'system', content: 'You are a venue analytics AI. Respond with valid JSON only.' },
              { role: 'user', content: prompt }
            ],
          }),
        });

        if (response.ok) {
          const aiData = await response.json();
          const content = aiData.choices?.[0]?.message?.content || '{}';
          
          try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
            growthOpportunities = parsed.growthOpportunities || [];
            riskFactors = parsed.riskFactors || [];
            aiRecommendations = parsed.recommendations || [];
          } catch {
            console.error('Failed to parse AI response for venue', venue.id);
          }
        }
      } catch (e) {
        console.error('AI analysis failed for venue', venue.id, e);
      }
      
      // Fallback insights if AI fails
      if (growthOpportunities.length === 0) {
        if (avgCapacityUtilization < 50) {
          growthOpportunities.push({
            title: 'Increase weekday traffic',
            description: 'Run targeted promos for slow days',
            expectedImpact: 'high'
          });
        }
        if (repeatCustomerRate < 20) {
          growthOpportunities.push({
            title: 'Improve customer retention',
            description: 'Launch loyalty program to increase repeat visits',
            expectedImpact: 'medium'
          });
        }
      }
      
      if (riskFactors.length === 0) {
        if (avgShowUpRate < 70) {
          riskFactors.push({
            title: 'High no-show rate',
            description: 'Consider implementing deposit requirements',
            severity: 'high'
          });
        }
      }
      
      const profile = {
        venue_id: venue.id,
        avg_capacity_utilization: avgCapacityUtilization,
        avg_show_up_rate: avgShowUpRate,
        avg_customer_spend: avgCustomerSpend,
        total_revenue_30d: totalRevenue30d,
        total_bookings_30d: totalBookings30d,
        peak_days: peakDays,
        slow_days: slowDays,
        peak_hours: peakHours,
        top_customer_segments: topCustomerSegments,
        avg_party_size: avgPartySize,
        repeat_customer_rate: repeatCustomerRate,
        promo_effectiveness_score: promoEffectivenessScore,
        best_performing_promo_types: bestPerformingPromoTypes,
        avg_promo_redemption_rate: avgPromoRedemptionRate,
        growth_opportunities: growthOpportunities,
        risk_factors: riskFactors,
        ai_recommendations: aiRecommendations,
        last_calculated_at: new Date().toISOString(),
      };
      
      // Upsert profile
      const { error } = await supabase
        .from('venue_profiles')
        .upsert(profile, { onConflict: 'venue_id' });
      
      if (error) {
        console.error(`Failed to upsert profile for venue ${venue.id}:`, error);
      } else {
        profiles.push({ venueId: venue.id, venueName: venue.name, ...profile });
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: `Processed ${profiles.length} venue profiles`,
      profilesCreated: profiles.length,
      profiles: profiles.slice(0, 10), // Return first 10 for preview
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-venue-profiler:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
