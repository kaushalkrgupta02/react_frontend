import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CustomerData {
  userId: string;
  bookings: any[];
  outcomes: any[];
  feedback: any[];
  lineSkipPasses: any[];
}

interface CustomerSegment {
  userId: string;
  segmentName: string;
  segmentScore: number;
  rfmRecencyDays: number;
  rfmFrequency: number;
  rfmMonetary: number;
  rfmTier: string;
  avgPartySize: number;
  preferredDayOfWeek: number;
  preferredArrivalHour: number;
  preferredVenueTypes: string[];
  promoResponsiveness: number;
  noShowRisk: number;
  clvScore: number;
  rawMetrics: Record<string, any>;
}

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
    const { userId, venueId, recalculateAll } = await req.json();
    
    const LITELLM_API_URL = Deno.env.get('LITELLM_API_URL');
    const LITELLM_API_KEY = Deno.env.get('LITELLM_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!LITELLM_API_URL || !LITELLM_API_KEY) {
      throw new Error('LITELLM_API_URL or LITELLM_API_KEY is not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const apiEndpoint = getLiteLLMEndpoint(LITELLM_API_URL);
    
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0];
    
    // Fetch all users with activity (or specific user)
    let usersQuery = supabase
      .from('bookings')
      .select('user_id')
      .gte('booking_date', ninetyDaysAgoStr);
    
    if (userId) {
      usersQuery = usersQuery.eq('user_id', userId);
    }
    if (venueId) {
      usersQuery = usersQuery.eq('venue_id', venueId);
    }
    
    const { data: userBookings } = await usersQuery;
    const uniqueUserIds = [...new Set((userBookings || []).map(b => b.user_id))];
    
    if (uniqueUserIds.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No users with recent activity found',
        segmentsCreated: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${uniqueUserIds.length} users for segmentation`);
    
    const segments: CustomerSegment[] = [];
    
    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < uniqueUserIds.length; i += batchSize) {
      const batchUserIds = uniqueUserIds.slice(i, i + batchSize);
      
      // Fetch all data for batch
      const [bookingsResult, outcomesResult, feedbackResult, passesResult] = await Promise.all([
        supabase.from('bookings').select('*').in('user_id', batchUserIds),
        supabase.from('booking_outcomes').select('*').in('booking_id', 
          (await supabase.from('bookings').select('id').in('user_id', batchUserIds)).data?.map(b => b.id) || []
        ),
        supabase.from('visit_feedback').select('*').in('user_id', batchUserIds),
        supabase.from('line_skip_passes').select('*').in('user_id', batchUserIds),
      ]);
      
      for (const uid of batchUserIds) {
        const userBookings = (bookingsResult.data || []).filter(b => b.user_id === uid);
        const userOutcomes = (outcomesResult.data || []).filter(o => 
          userBookings.some(b => b.id === o.booking_id)
        );
        const userFeedback = (feedbackResult.data || []).filter(f => f.user_id === uid);
        const userPasses = (passesResult.data || []).filter(p => p.user_id === uid);
        
        // Calculate RFM metrics
        const recentBookings = userBookings.filter(b => 
          new Date(b.booking_date) >= ninetyDaysAgo
        );
        
        // Recency: days since last booking
        const lastBookingDate = userBookings.length > 0 
          ? new Date(Math.max(...userBookings.map(b => new Date(b.booking_date).getTime())))
          : null;
        const rfmRecencyDays = lastBookingDate 
          ? Math.floor((Date.now() - lastBookingDate.getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        
        // Frequency: bookings in last 90 days
        const rfmFrequency = recentBookings.length;
        
        // Monetary: total spend from outcomes
        const rfmMonetary = userOutcomes
          .filter(o => o.spend_amount)
          .reduce((sum, o) => sum + Number(o.spend_amount), 0);
        
        // Calculate RFM tier
        let rfmTier = 'Hibernating';
        if (rfmRecencyDays <= 14 && rfmFrequency >= 3 && rfmMonetary >= 1000000) {
          rfmTier = 'Champion';
        } else if (rfmRecencyDays <= 30 && rfmFrequency >= 2) {
          rfmTier = 'Loyal';
        } else if (rfmRecencyDays <= 60 && rfmFrequency >= 1) {
          rfmTier = 'Potential';
        } else if (rfmRecencyDays > 60 && rfmFrequency >= 2) {
          rfmTier = 'At Risk';
        }
        
        // Behavioral patterns
        const avgPartySize = userBookings.length > 0
          ? userBookings.reduce((sum, b) => sum + (b.party_size || 2), 0) / userBookings.length
          : 2;
        
        // Preferred day of week (mode)
        const dayFrequency: Record<number, number> = {};
        userBookings.forEach(b => {
          const day = new Date(b.booking_date).getDay();
          dayFrequency[day] = (dayFrequency[day] || 0) + 1;
        });
        const preferredDayOfWeek = Object.entries(dayFrequency).length > 0
          ? Number(Object.entries(dayFrequency).sort((a, b) => b[1] - a[1])[0][0])
          : 5; // Default to Friday
        
        // Preferred arrival hour (parse from arrival_window)
        const hourFrequency: Record<number, number> = {};
        userBookings.forEach(b => {
          if (b.arrival_window) {
            const match = b.arrival_window.match(/(\d+)/);
            if (match) {
              const hour = parseInt(match[1]);
              hourFrequency[hour] = (hourFrequency[hour] || 0) + 1;
            }
          }
        });
        const preferredArrivalHour = Object.entries(hourFrequency).length > 0
          ? Number(Object.entries(hourFrequency).sort((a, b) => b[1] - a[1])[0][0])
          : 22; // Default to 10 PM
        
        // No-show risk
        const totalBookingsWithOutcome = userOutcomes.length;
        const noShows = userOutcomes.filter(o => o.outcome === 'no_show').length;
        const noShowRisk = totalBookingsWithOutcome > 0 
          ? noShows / totalBookingsWithOutcome 
          : 0.15; // Default 15% baseline
        
        // Promo responsiveness (estimate based on behavior patterns)
        const hasMultipleBookings = rfmFrequency >= 2;
        const hasHighSpend = rfmMonetary >= 500000;
        const promoResponsiveness = hasMultipleBookings ? 0.6 : hasHighSpend ? 0.4 : 0.3;
        
        // CLV score
        const avgSpend = rfmMonetary / Math.max(rfmFrequency, 1);
        const predictedVisitsPerYear = Math.min(rfmFrequency * 4, 52);
        const clvScore = avgSpend * predictedVisitsPerYear;
        
        // Build raw metrics for AI
        const rawMetrics = {
          totalBookings: userBookings.length,
          recentBookings: rfmFrequency,
          totalSpend: rfmMonetary,
          avgSpendPerVisit: avgSpend,
          noShowCount: noShows,
          feedbackCount: userFeedback.length,
          avgFeedbackRating: userFeedback.length > 0 
            ? userFeedback.reduce((sum, f) => sum + f.overall_rating, 0) / userFeedback.length 
            : null,
          lineSkipPurchases: userPasses.length,
          preferredDays: Object.entries(dayFrequency).sort((a, b) => b[1] - a[1]).slice(0, 3),
        };
        
        segments.push({
          userId: uid,
          segmentName: '', // Will be filled by AI
          segmentScore: 0,
          rfmRecencyDays,
          rfmFrequency,
          rfmMonetary,
          rfmTier,
          avgPartySize,
          preferredDayOfWeek,
          preferredArrivalHour,
          preferredVenueTypes: [],
          promoResponsiveness,
          noShowRisk,
          clvScore,
          rawMetrics,
        });
      }
    }
    
    // Use AI to classify segments in batches
    const classifiedSegments: CustomerSegment[] = [];
    const classifyBatchSize = 5;
    
    for (let i = 0; i < segments.length; i += classifyBatchSize) {
      const batch = segments.slice(i, i + classifyBatchSize);
      
      const prompt = `You are a customer segmentation AI for nightlife venues. Analyze these customer profiles and assign appropriate segment labels.

SEGMENT DEFINITIONS:
- "VIP Champion" - High spend (>1M IDR), frequent visits (3+), very recent activity
- "High Spender" - High monetary value (>500K IDR avg), any frequency
- "Weekend Warrior" - Prefers Friday/Saturday (day 5 or 6), regular visitor
- "Promo Hunter" - High promo responsiveness, price-sensitive behavior
- "Casual Explorer" - Low frequency (1-2 visits), moderate spend
- "Night Owl" - Prefers late arrival (11PM+)
- "Social Host" - Large party sizes (5+), regular booker
- "At Risk" - Was active but declining engagement
- "Hibernating" - No recent activity despite history

CUSTOMER DATA:
${batch.map((s, idx) => `
Customer ${idx + 1}:
- RFM Tier: ${s.rfmTier}
- Recency: ${s.rfmRecencyDays} days since last visit
- Frequency: ${s.rfmFrequency} visits in 90 days
- Monetary: Rp ${s.rfmMonetary.toLocaleString()}
- Avg Party Size: ${s.avgPartySize.toFixed(1)}
- Preferred Day: ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][s.preferredDayOfWeek]}
- Preferred Hour: ${s.preferredArrivalHour}:00
- No-Show Risk: ${(s.noShowRisk * 100).toFixed(0)}%
- CLV Score: Rp ${s.clvScore.toLocaleString()}
`).join('\n')}

Return a JSON array with segment assignments:
[
  {"index": 0, "segment": "VIP Champion", "confidence": 92},
  {"index": 1, "segment": "Weekend Warrior", "confidence": 85}
]`;

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
              { role: 'system', content: 'You are a customer analytics AI. Respond with valid JSON only.' },
              { role: 'user', content: prompt }
            ],
          }),
        });

        if (!response.ok) {
          console.error('AI classification failed, using fallback');
          // Fallback to rule-based classification
          batch.forEach(s => {
            s.segmentName = s.rfmTier === 'Champion' ? 'VIP Champion' 
              : s.rfmMonetary >= 500000 ? 'High Spender'
              : s.preferredDayOfWeek >= 5 ? 'Weekend Warrior'
              : 'Casual Explorer';
            s.segmentScore = 70;
            classifiedSegments.push(s);
          });
          continue;
        }

        const aiData = await response.json();
        const content = aiData.choices?.[0]?.message?.content || '[]';
        
        let classifications;
        try {
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          classifications = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        } catch {
          classifications = [];
        }

        batch.forEach((s, idx) => {
          const classification = classifications.find((c: any) => c.index === idx);
          s.segmentName = classification?.segment || s.rfmTier;
          s.segmentScore = classification?.confidence || 70;
          classifiedSegments.push(s);
        });
        
      } catch (e) {
        console.error('AI batch classification error:', e);
        batch.forEach(s => {
          s.segmentName = s.rfmTier;
          s.segmentScore = 60;
          classifiedSegments.push(s);
        });
      }
    }
    
    // Upsert segments to database
    for (const seg of classifiedSegments) {
      const { error } = await supabase
        .from('customer_segments')
        .upsert({
          user_id: seg.userId,
          segment_name: seg.segmentName,
          segment_score: seg.segmentScore,
          rfm_recency_days: seg.rfmRecencyDays,
          rfm_frequency: seg.rfmFrequency,
          rfm_monetary: seg.rfmMonetary,
          rfm_tier: seg.rfmTier,
          avg_party_size: seg.avgPartySize,
          preferred_day_of_week: seg.preferredDayOfWeek,
          preferred_arrival_hour: seg.preferredArrivalHour,
          preferred_venue_types: seg.preferredVenueTypes,
          promo_responsiveness: seg.promoResponsiveness,
          no_show_risk: seg.noShowRisk,
          clv_score: seg.clvScore,
          raw_metrics: seg.rawMetrics,
          last_calculated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });
      
      if (error) {
        console.error(`Failed to upsert segment for user ${seg.userId}:`, error);
      }
    }

    // Get segment distribution summary
    const segmentCounts: Record<string, number> = {};
    classifiedSegments.forEach(s => {
      segmentCounts[s.segmentName] = (segmentCounts[s.segmentName] || 0) + 1;
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: `Processed ${classifiedSegments.length} customer segments`,
      segmentsCreated: classifiedSegments.length,
      segmentDistribution: segmentCounts,
      segments: classifiedSegments.slice(0, 20), // Return first 20 for preview
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-customer-segmentation:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
