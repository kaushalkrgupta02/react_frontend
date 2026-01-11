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

interface MatchRequest {
  matchType: 'venue_to_customer' | 'customer_to_venue' | 'promo_to_segment' | 'fill_tonight';
  venueId?: string;
  promoId?: string;
  customerId?: string;
  targetDay?: number; // 0-6
  targetHour?: number; // 0-23
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: MatchRequest = await req.json();
    const { matchType, venueId, promoId, customerId, targetDay, targetHour } = requestData;
    
    const LITELLM_API_URL = Deno.env.get('LITELLM_API_URL');
    const LITELLM_API_KEY = Deno.env.get('LITELLM_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!LITELLM_API_URL || !LITELLM_API_KEY) {
      throw new Error('LITELLM_API_URL or LITELLM_API_KEY is not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const apiEndpoint = getLiteLLMEndpoint(LITELLM_API_URL);
    
    // Fetch customer segments
    const { data: customerSegments } = await supabase
      .from('customer_segments')
      .select('*');
    
    // Fetch venue profiles
    const { data: venueProfiles } = await supabase
      .from('venue_profiles')
      .select('*, venues(name, status, line_skip_enabled)');
    
    // Fetch active promos
    const { data: activePromos } = await supabase
      .from('promos')
      .select('*')
      .eq('is_active', true)
      .gte('ends_at', new Date().toISOString());

    const recommendations: any[] = [];
    const today = new Date();
    const currentDay = targetDay !== undefined ? targetDay : today.getDay();
    const currentHour = targetHour !== undefined ? targetHour : today.getHours();
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDay];

    if (matchType === 'venue_to_customer' || matchType === 'fill_tonight') {
      // Find best customers to target for a venue
      if (!venueId) {
        throw new Error('venueId is required for venue_to_customer matching');
      }
      
      const venueProfile = venueProfiles?.find(v => v.venue_id === venueId);
      const venueName = (venueProfile?.venues as any)?.name || 'Unknown Venue';
      
      // Score each customer segment for this venue/time
      const segmentGroups: Record<string, any[]> = {};
      (customerSegments || []).forEach(seg => {
        if (!segmentGroups[seg.segment_name]) {
          segmentGroups[seg.segment_name] = [];
        }
        segmentGroups[seg.segment_name].push(seg);
      });
      
      const scoredSegments = Object.entries(segmentGroups).map(([segmentName, members]) => {
        let score = 50; // Base score
        const factors: Record<string, number> = {};
        
        // Check if segment prefers this day
        const avgPreferredDay = members.reduce((sum, m) => sum + (m.preferred_day_of_week || 5), 0) / members.length;
        const dayMatch = 1 - Math.abs(avgPreferredDay - currentDay) / 7;
        factors.day_match = dayMatch;
        score += dayMatch * 20;
        
        // Check arrival hour alignment
        const avgPreferredHour = members.reduce((sum, m) => sum + (m.preferred_arrival_hour || 22), 0) / members.length;
        const hourMatch = 1 - Math.abs(avgPreferredHour - currentHour) / 12;
        factors.hour_match = hourMatch;
        score += hourMatch * 15;
        
        // CLV score boost
        const avgCLV = members.reduce((sum, m) => sum + (m.clv_score || 0), 0) / members.length;
        const clvBoost = Math.min(15, avgCLV / 100000);
        factors.clv_boost = clvBoost;
        score += clvBoost;
        
        // No-show risk penalty
        const avgNoShowRisk = members.reduce((sum, m) => sum + (m.no_show_risk || 0.15), 0) / members.length;
        const noShowPenalty = avgNoShowRisk * 20;
        factors.no_show_penalty = -noShowPenalty;
        score -= noShowPenalty;
        
        // Promo responsiveness boost for slow nights
        const isSlowNight = venueProfile?.slow_days?.some((d: any) => d.day === currentDay);
        if (isSlowNight) {
          const avgPromoResp = members.reduce((sum, m) => sum + (m.promo_responsiveness || 0.3), 0) / members.length;
          factors.promo_responsiveness = avgPromoResp * 10;
          score += avgPromoResp * 10;
        }
        
        return {
          segmentName,
          memberCount: members.length,
          avgCLV,
          avgNoShowRisk,
          score: Math.min(100, Math.max(0, score)),
          matchFactors: factors,
        };
      });
      
      // Sort by score
      scoredSegments.sort((a, b) => b.score - a.score);
      
      // Use AI to generate reasoning
      const topSegments = scoredSegments.slice(0, 5);
      const prompt = `You are a venue marketing AI. Generate targeting recommendations for ${venueName} on ${dayName} at ${currentHour}:00.

TOP SEGMENT MATCHES:
${topSegments.map((s, i) => `
${i + 1}. ${s.segmentName}
   - Members: ${s.memberCount}
   - Avg CLV: Rp ${s.avgCLV.toLocaleString()}
   - No-Show Risk: ${(s.avgNoShowRisk * 100).toFixed(0)}%
   - Match Score: ${s.score.toFixed(0)}/100
`).join('')}

Generate a brief recommendation for each segment explaining why they're a good match and what offer might work. Return JSON:
{
  "recommendations": [
    {
      "segment": "segment name",
      "reasoning": "why this segment is a good match",
      "suggestedOffer": "what promo to offer",
      "estimatedConversion": 0.15
    }
  ]
}`;

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
              { role: 'system', content: 'You are a marketing AI. Respond with valid JSON only.' },
              { role: 'user', content: prompt }
            ],
          }),
        });

        let aiRecommendations: any[] = [];
        if (response.ok) {
          const aiData = await response.json();
          const content = aiData.choices?.[0]?.message?.content || '{}';
          try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
            aiRecommendations = parsed.recommendations || [];
          } catch {}
        }

        // Merge AI recommendations with scored segments
        topSegments.forEach((seg, idx) => {
          const aiRec = aiRecommendations.find(r => r.segment === seg.segmentName) || aiRecommendations[idx];
          recommendations.push({
            recommendationType: matchType,
            sourceId: venueId,
            sourceType: 'venue',
            targetSegment: seg.segmentName,
            matchScore: seg.score,
            matchReasoning: aiRec?.reasoning || `${seg.segmentName} shows strong alignment for ${dayName} visits`,
            matchFactors: seg.matchFactors,
            timingRecommendation: {
              bestDay: currentDay,
              bestHour: currentHour,
              suggestedOffer: aiRec?.suggestedOffer,
            },
            estimatedReach: seg.memberCount,
            estimatedConversion: aiRec?.estimatedConversion || 0.1,
          });
        });

      } catch (e) {
        console.error('AI recommendation failed:', e);
        // Use rule-based fallback
        topSegments.forEach(seg => {
          recommendations.push({
            recommendationType: matchType,
            sourceId: venueId,
            sourceType: 'venue',
            targetSegment: seg.segmentName,
            matchScore: seg.score,
            matchReasoning: `${seg.segmentName} matches venue profile`,
            matchFactors: seg.matchFactors,
            estimatedReach: seg.memberCount,
          });
        });
      }
    }
    
    if (matchType === 'promo_to_segment') {
      // Find best segments for a promo
      if (!promoId) {
        throw new Error('promoId is required for promo_to_segment matching');
      }
      
      const promo = activePromos?.find(p => p.id === promoId);
      if (!promo) {
        throw new Error('Promo not found or not active');
      }
      
      // Determine promo characteristics
      const isDiscountPromo = promo.discount_type === 'percentage' || promo.discount_type === 'fixed';
      const isHighValue = (promo.discount_value || 0) >= 30;
      
      // Score segments based on promo type
      const segmentGroups: Record<string, any[]> = {};
      (customerSegments || []).forEach(seg => {
        if (!segmentGroups[seg.segment_name]) {
          segmentGroups[seg.segment_name] = [];
        }
        segmentGroups[seg.segment_name].push(seg);
      });
      
      const scoredSegments = Object.entries(segmentGroups).map(([segmentName, members]) => {
        let score = 50;
        
        // High promo responsiveness = good for discount promos
        const avgPromoResp = members.reduce((sum, m) => sum + (m.promo_responsiveness || 0.3), 0) / members.length;
        if (isDiscountPromo) {
          score += avgPromoResp * 30;
        }
        
        // High CLV customers for VIP promos
        const avgCLV = members.reduce((sum, m) => sum + (m.clv_score || 0), 0) / members.length;
        if (!isDiscountPromo || isHighValue) {
          score += Math.min(20, avgCLV / 100000);
        }
        
        // Match party size if promo has min_party_size
        if (promo.min_party_size) {
          const avgPartySize = members.reduce((sum, m) => sum + (m.avg_party_size || 2), 0) / members.length;
          if (avgPartySize >= promo.min_party_size) {
            score += 15;
          } else {
            score -= 10;
          }
        }
        
        return {
          segmentName,
          memberCount: members.length,
          avgPromoResp,
          avgCLV,
          score: Math.min(100, Math.max(0, score)),
        };
      });
      
      scoredSegments.sort((a, b) => b.score - a.score);
      
      scoredSegments.slice(0, 5).forEach(seg => {
        recommendations.push({
          recommendationType: matchType,
          sourceId: promoId,
          sourceType: 'promo',
          targetSegment: seg.segmentName,
          matchScore: seg.score,
          matchReasoning: `${seg.segmentName} has ${(seg.avgPromoResp * 100).toFixed(0)}% promo responsiveness`,
          estimatedReach: seg.memberCount,
          estimatedConversion: seg.avgPromoResp,
        });
      });
    }
    
    if (matchType === 'customer_to_venue') {
      // Find best venues for a customer
      if (!customerId) {
        throw new Error('customerId is required for customer_to_venue matching');
      }
      
      const customerSegment = customerSegments?.find(s => s.user_id === customerId);
      if (!customerSegment) {
        return new Response(JSON.stringify({
          success: true,
          message: 'Customer segment not found, run segmentation first',
          recommendations: [],
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Score venues based on customer preferences
      (venueProfiles || []).forEach(venue => {
        let score = 50;
        
        // Check if venue's peak days match customer's preferred day
        const peakDays = venue.peak_days || [];
        const dayMatch = peakDays.some((d: any) => d.day === customerSegment.preferred_day_of_week);
        if (dayMatch) score += 20;
        
        // Check customer segment presence
        const topSegments = venue.top_customer_segments || [];
        const segmentMatch = topSegments.find((s: any) => s.segment === customerSegment.segment_name);
        if (segmentMatch) {
          score += (segmentMatch.percentage || 0) / 5;
        }
        
        // Active promos boost
        const venuePromos = activePromos?.filter(p => p.venue_id === venue.venue_id) || [];
        if (venuePromos.length > 0 && customerSegment.promo_responsiveness > 0.5) {
          score += 15;
        }
        
        recommendations.push({
          recommendationType: matchType,
          sourceId: customerId,
          sourceType: 'customer',
          targetVenueId: venue.venue_id,
          targetVenueName: (venue.venues as any)?.name,
          matchScore: Math.min(100, score),
          matchReasoning: dayMatch ? 'Peak day matches your preference' : 'Good fit based on customer profile',
          activePromos: venuePromos.length,
        });
      });
      
      recommendations.sort((a, b) => b.matchScore - a.matchScore);
    }
    
    // Store recommendations in database
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    
    for (const rec of recommendations.slice(0, 10)) {
      await supabase.from('ai_recommendations').insert({
        recommendation_type: rec.recommendationType,
        source_id: rec.sourceId,
        source_type: rec.sourceType,
        target_user_id: rec.targetUserId || null,
        target_segment: rec.targetSegment || null,
        match_score: rec.matchScore,
        match_reasoning: rec.matchReasoning,
        match_factors: rec.matchFactors || {},
        timing_recommendation: rec.timingRecommendation || {},
        expires_at: expiresAt.toISOString(),
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      matchType,
      recommendations: recommendations.slice(0, 10),
      totalMatches: recommendations.length,
      context: {
        targetDay: dayName,
        targetHour: currentHour,
        totalSegments: Object.keys(
          (customerSegments || []).reduce((acc: any, s) => { acc[s.segment_name] = true; return acc; }, {})
        ).length,
        totalVenues: venueProfiles?.length || 0,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-smart-matcher:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
