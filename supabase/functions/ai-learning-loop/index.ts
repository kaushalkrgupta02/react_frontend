import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { venueId } = await req.json();
    const LITELLM_API_URL = Deno.env.get('LITELLM_API_URL');
    const LITELLM_API_KEY = Deno.env.get('LITELLM_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LITELLM_API_URL || !LITELLM_API_KEY) {
      throw new Error('LITELLM_API_URL or LITELLM_API_KEY is not configured');
    }

    // Helper to construct proper LiteLLM endpoint
    const getLiteLLMEndpoint = (baseUrl: string): string => {
      const cleanUrl = baseUrl.replace(/\/+$/, '');
      if (cleanUrl.endsWith('/v1')) {
        return `${cleanUrl}/chat/completions`;
      } else if (cleanUrl.includes('/v1/')) {
        return `${cleanUrl}/chat/completions`;
      } else {
        return `${cleanUrl}/v1/chat/completions`;
      }
    };
    
    const apiEndpoint = getLiteLLMEndpoint(LITELLM_API_URL);
    console.log('Using AI endpoint:', apiEndpoint);

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // 1. Get unevaluated predictions from past dates
    const today = new Date().toISOString().split('T')[0];
    const { data: pendingPredictions } = await supabase
      .from('ai_prediction_logs')
      .select('*')
      .eq('venue_id', venueId)
      .lt('prediction_date', today)
      .is('accuracy_score', null)
      .order('prediction_date', { ascending: false })
      .limit(50);

    console.log(`Found ${pendingPredictions?.length || 0} unevaluated predictions`);

    // 2. Evaluate each prediction against actual outcomes
    const evaluatedPredictions = [];
    
    for (const prediction of (pendingPredictions || [])) {
      const predDate = prediction.prediction_date;
      let actualValue: Record<string, unknown> = {};
      let accuracyScore = 0;

      if (prediction.prediction_type === 'demand' || prediction.prediction_type === 'staffing') {
        // Get actual footfall/bookings for that date
        const { data: analytics } = await supabase
          .from('venue_analytics')
          .select('footfall_count, capacity_percentage')
          .eq('venue_id', venueId)
          .gte('recorded_at', `${predDate}T00:00:00`)
          .lt('recorded_at', `${predDate}T23:59:59`);

        const { data: bookings } = await supabase
          .from('bookings')
          .select('party_size')
          .eq('venue_id', venueId)
          .eq('booking_date', predDate);

        if (analytics && analytics.length > 0) {
          const avgFootfall = analytics.reduce((sum, a) => sum + (a.footfall_count || 0), 0) / analytics.length;
          const avgCapacity = analytics.reduce((sum, a) => sum + (a.capacity_percentage || 0), 0) / analytics.length;
          const totalGuests = bookings?.reduce((sum, b) => sum + (b.party_size || 2), 0) || 0;

          actualValue = {
            footfall: avgFootfall,
            capacity: avgCapacity,
            totalGuests,
          };

          // Calculate accuracy for demand predictions
          const predicted = prediction.predicted_value as Record<string, unknown>;
          const predictedFootfall = (predicted.expectedFootfall as number) || 0;
          
          if (predictedFootfall > 0 && avgFootfall > 0) {
            const percentError = Math.abs(predictedFootfall - avgFootfall) / avgFootfall;
            accuracyScore = Math.max(0, Math.min(100, 100 - (percentError * 100)));
          } else {
            accuracyScore = 50; // Neutral if no data
          }
        }
      } else if (prediction.prediction_type === 'noShow') {
        // Get actual no-show outcomes
        const { data: outcomes } = await supabase
          .from('booking_outcomes')
          .select('outcome')
          .eq('venue_id', venueId)
          .gte('created_at', `${predDate}T00:00:00`)
          .lt('created_at', `${predDate}T23:59:59`);

        if (outcomes && outcomes.length > 0) {
          const noShowCount = outcomes.filter(o => o.outcome === 'no_show').length;
          const actualNoShowRate = (noShowCount / outcomes.length) * 100;

          actualValue = {
            noShowCount,
            totalOutcomes: outcomes.length,
            noShowRate: actualNoShowRate,
          };

          const predicted = prediction.predicted_value as Record<string, unknown>;
          const predictedRisk = (predicted.riskPercent as number) || 15;
          
          const percentError = Math.abs(predictedRisk - actualNoShowRate);
          accuracyScore = Math.max(0, Math.min(100, 100 - (percentError * 2)));
        }
      } else if (prediction.prediction_type === 'revenue') {
        // Get actual revenue
        const { data: analytics } = await supabase
          .from('venue_analytics')
          .select('revenue_estimate')
          .eq('venue_id', venueId)
          .gte('recorded_at', `${predDate}T00:00:00`)
          .lt('recorded_at', `${predDate}T23:59:59`);

        if (analytics && analytics.length > 0) {
          const totalRevenue = analytics.reduce((sum, a) => sum + (a.revenue_estimate || 0), 0);
          actualValue = { revenue: totalRevenue };

          const predicted = prediction.predicted_value as Record<string, unknown>;
          const predictedMin = (predicted.min as number) || 0;
          const predictedMax = (predicted.max as number) || 0;
          const predictedMid = (predictedMin + predictedMax) / 2;

          if (predictedMid > 0 && totalRevenue > 0) {
            const percentError = Math.abs(predictedMid - totalRevenue) / totalRevenue;
            accuracyScore = Math.max(0, Math.min(100, 100 - (percentError * 50)));
          }
        }
      }

      // Update the prediction with actual values and accuracy
      if (Object.keys(actualValue).length > 0) {
        await supabase
          .from('ai_prediction_logs')
          .update({
            actual_value: actualValue,
            accuracy_score: Math.round(accuracyScore),
            evaluated_at: new Date().toISOString(),
          })
          .eq('id', prediction.id);

        evaluatedPredictions.push({
          id: prediction.id,
          type: prediction.prediction_type,
          accuracyScore: Math.round(accuracyScore),
        });
      }
    }

    // 3. Analyze patterns and generate learning insights
    const { data: allPredictions } = await supabase
      .from('ai_prediction_logs')
      .select('*')
      .eq('venue_id', venueId)
      .not('accuracy_score', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    // Get feedback data for correlation
    const { data: feedback } = await supabase
      .from('visit_feedback')
      .select('*')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false })
      .limit(100);

    // Prepare analysis context
    const analysisContext = {
      predictions: (allPredictions || []).map(p => ({
        type: p.prediction_type,
        date: p.prediction_date,
        predicted: p.predicted_value,
        actual: p.actual_value,
        accuracy: p.accuracy_score,
        confidence: p.confidence_score,
      })),
      feedback: (feedback || []).map(f => ({
        overallRating: f.overall_rating,
        serviceRating: f.service_rating,
        atmosphereRating: f.atmosphere_rating,
        valueRating: f.value_rating,
        waitTime: f.wait_time_minutes,
        wouldRecommend: f.would_recommend,
        date: f.visited_at,
      })),
    };

    // Use AI to generate insights
    const prompt = `Analyze this venue's AI prediction performance and guest feedback to generate learning insights.

PREDICTION DATA (${analysisContext.predictions.length} evaluated predictions):
${JSON.stringify(analysisContext.predictions.slice(0, 20), null, 2)}

GUEST FEEDBACK (${analysisContext.feedback.length} reviews):
${JSON.stringify(analysisContext.feedback.slice(0, 20), null, 2)}

Generate 2-4 insights in this JSON format:
{
  "insights": [
    {
      "type": "pattern|anomaly|improvement|correlation",
      "title": "Short title",
      "description": "Detailed actionable insight",
      "confidence": 75,
      "dataPoints": { "relevant": "metrics" }
    }
  ]
}

Focus on:
1. Patterns in prediction accuracy (e.g., "Demand predictions are 20% more accurate on weekends")
2. Correlations between predictions and feedback (e.g., "High predicted demand nights have lower service ratings")
3. Anomalies that might indicate issues (e.g., "No-show predictions consistently overestimate by 10%")
4. Improvement suggestions (e.g., "Consider weather data - accuracy drops on rainy days")`;

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LITELLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'azure_ai/gpt-5-mini',
        messages: [
          { role: 'system', content: 'You are an AI analytics expert. Respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    let generatedInsights: Array<{
      type: string;
      title: string;
      description: string;
      confidence: number;
      dataPoints: Record<string, unknown>;
    }> = [];

    if (response.ok) {
      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content || '{}';
      
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { insights: [] };
        generatedInsights = parsed.insights || [];
      } catch (e) {
        console.error('Failed to parse AI insights:', e);
      }
    }

    // Save new insights
    for (const insight of generatedInsights) {
      await supabase.from('ai_learning_insights').insert({
        venue_id: venueId,
        insight_type: insight.type,
        title: insight.title,
        description: insight.description,
        confidence: insight.confidence,
        data_points: insight.dataPoints || {},
      });
    }

    return new Response(JSON.stringify({
      success: true,
      evaluated: evaluatedPredictions.length,
      insightsGenerated: generatedInsights.length,
      insights: generatedInsights,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-learning-loop:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
