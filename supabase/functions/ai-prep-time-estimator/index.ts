import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderItem {
  id: string;
  item_name: string;
  quantity: number;
  destination: string;
  category?: string;
}

interface EstimateRequest {
  items: OrderItem[];
  queueDepth: number;
  destination: 'kitchen' | 'bar';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items, queueDepth, destination }: EstimateRequest = await req.json();

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ estimates: {} }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const itemsList = items.map(item => 
      `- ${item.item_name} (qty: ${item.quantity}, category: ${item.category || 'unknown'})`
    ).join('\n');

    const prompt = `You are a kitchen/bar prep time estimator. Estimate preparation time in minutes for each item.

Context:
- Destination: ${destination}
- Current queue depth: ${queueDepth} items pending
- Items to estimate:
${itemsList}

Rules:
- Bar drinks: 2-5 minutes base
- Food appetizers/starters: 5-10 minutes base
- Main courses: 12-20 minutes base
- Desserts: 5-8 minutes base
- Add 1-2 minutes per additional quantity
- Add 20% time if queue depth > 10
- Add 40% time if queue depth > 20

Respond ONLY with a JSON object mapping item names to estimated minutes. Example:
{"Mojito": 3, "Grilled Salmon": 15, "Caesar Salad": 7}`;

    const litellmUrl = Deno.env.get('LITELLM_API_URL');
    const litellmKey = Deno.env.get('LITELLM_API_KEY');

    if (!litellmUrl || !litellmKey) {
      console.error('Missing LITELLM credentials');
      // Return default estimates if AI not available
      const defaultEstimates: Record<string, number> = {};
      items.forEach(item => {
        const baseTime = destination === 'bar' ? 3 : 10;
        defaultEstimates[item.item_name] = baseTime + Math.floor(item.quantity * 0.5);
      });
      return new Response(
        JSON.stringify({ estimates: defaultEstimates }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(`${litellmUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${litellmKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      // Fallback to simple estimates
      const fallbackEstimates: Record<string, number> = {};
      items.forEach(item => {
        const baseTime = destination === 'bar' ? 3 : 10;
        fallbackEstimates[item.item_name] = baseTime + Math.floor(item.quantity * 0.5);
      });
      return new Response(
        JSON.stringify({ estimates: fallbackEstimates }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    
    // Parse the JSON from the response
    let estimates: Record<string, number> = {};
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        estimates = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback estimates
      items.forEach(item => {
        const baseTime = destination === 'bar' ? 3 : 10;
        estimates[item.item_name] = baseTime + Math.floor(item.quantity * 0.5);
      });
    }

    console.log('AI prep time estimates:', estimates);

    return new Response(
      JSON.stringify({ estimates }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-prep-time-estimator:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, estimates: {} }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
