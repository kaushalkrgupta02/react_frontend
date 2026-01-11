import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { venueId, venueName, goal } = await req.json();
    
    const LITELLM_API_KEY = Deno.env.get('LITELLM_API_KEY');
    const LITELLM_API_URL = Deno.env.get('LITELLM_API_URL');
    
    if (!LITELLM_API_KEY || !LITELLM_API_URL) {
      throw new Error('LiteLLM API credentials are not configured');
    }

    // Pure GenAI promo generation - no customer data used
    const goalDescriptions: Record<string, string> = {
      fill_slow_nights: 'increase footfall on slow nights (Monday-Wednesday)',
      boost_revenue: 'maximize revenue and average spend per guest',
      attract_new: 'attract first-time visitors to the venue',
      reward_loyalty: 'reward and retain regular customers',
      special_event: 'promote a special event or occasion',
    };

    const prompt = `You are a nightlife marketing expert for Jakarta's bar and club scene.

Generate 3 creative promo ideas for this venue.

Venue: ${venueName || 'A trendy venue in Jakarta'}
Goal: ${goalDescriptions[goal] || goal || 'increase overall engagement'}

For each promo, provide:
1. A catchy, memorable title
2. Short description (1-2 sentences)
3. Promo type: percentage, bogo (buy one get one), happy_hour, fixed, or bundle
4. Discount value (percentage number or fixed amount in IDR)
5. Best timing (specific days/hours)
6. Instagram caption with emojis and Jakarta nightlife hashtags
7. WhatsApp message (friendly, conversational)

Return ONLY a JSON array:
[{
  "id": "1",
  "title": "...",
  "description": "...",
  "promoType": "percentage|bogo|happy_hour|fixed|bundle",
  "discountValue": 20,
  "bestTiming": "Friday-Saturday, 9PM-11PM",
  "instagramCaption": "...",
  "whatsappMessage": "..."
}]`;

    console.log('Calling LiteLLM for promo suggestions...');

    const litellmEndpoint = LITELLM_API_URL.endsWith('/') 
      ? `${LITELLM_API_URL}chat/completions` 
      : `${LITELLM_API_URL}/chat/completions`;

    const response = await fetch(litellmEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LITELLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a nightlife marketing expert. Generate creative, actionable promo ideas. Always respond with valid JSON array only, no markdown.' 
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LiteLLM error:', response.status, errorText);
      throw new Error('AI service error');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    
    // Parse JSON from response
    let suggestions = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e, content);
      suggestions = [
        {
          id: "1",
          title: "Happy Hour Special",
          description: "50% off all cocktails during happy hour",
          promoType: "percentage",
          discountValue: 50,
          bestTiming: "Monday-Thursday, 5PM-8PM",
          instagramCaption: "🍹 Happy Hour just got happier! 50% OFF all cocktails 5-8PM ✨ #JakartaNightlife #HappyHour #Cocktails",
          whatsappMessage: "Hey! 🎉 Don't miss our Happy Hour special - 50% off all cocktails from 5-8PM tonight!"
        }
      ];
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-promo-designer:', error);
    return new Response(JSON.stringify({ 
      error: 'server_error',
      message: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
