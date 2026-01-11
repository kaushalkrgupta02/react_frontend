import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to construct the correct LiteLLM endpoint
function getLiteLLMEndpoint(baseUrl: string): string {
  const url = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
  if (url.endsWith('/chat/completions')) return url;
  if (url.endsWith('/v1')) return `${url}/chat/completions`;
  return `${url}/v1/chat/completions`;
}

interface PackageItem {
  item_type: 'entry' | 'drink' | 'food' | 'experience' | 'other';
  item_name: string;
  quantity: number;
  redemption_rule: 'once' | 'multiple' | 'unlimited';
}

interface GeneratedPackage {
  name: string;
  description: string;
  price: number;
  package_type: 'entry' | 'bottle' | 'food' | 'experience' | 'event' | 'custom';
  items: PackageItem[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, venueType, venueName } = await req.json();

    const litellmApiKey = Deno.env.get('LITELLM_API_KEY');
    const litellmApiUrl = Deno.env.get('LITELLM_API_URL') || 'https://api.litellm.ai';

    if (!litellmApiKey) {
      throw new Error('LITELLM_API_KEY not configured');
    }

    const systemPrompt = `You are a hospitality package designer for bars, restaurants, and nightclubs. 
Create attractive packages that customers would want to purchase.

For venue: ${venueName || 'A venue'}
Venue type: ${venueType || 'bar/nightclub'}

Generate a package based on the user's request. Return a JSON object with this exact structure:
{
  "name": "Package name (catchy and marketable)",
  "description": "Compelling description (1-2 sentences)",
  "price": number in IDR (Indonesian Rupiah, typical range 100000-10000000),
  "package_type": "entry" | "bottle" | "food" | "experience" | "event" | "custom",
  "items": [
    {
      "item_type": "entry" | "drink" | "food" | "experience" | "other",
      "item_name": "Item name",
      "quantity": number,
      "redemption_rule": "once" | "multiple" | "unlimited"
    }
  ]
}

Guidelines:
- Prices should be in IDR (1 USD ≈ 15000 IDR)
- Include 2-6 items per package
- Make items specific (e.g., "Premium Vodka Bottle" not just "Bottle")
- Use "unlimited" for services like "Dedicated Server" or "VIP Table Access"
- Use "once" for consumables
- Be creative but realistic for the venue type`;

    console.log('Calling LiteLLM API for package generation...');

    const endpoint = getLiteLLMEndpoint(litellmApiUrl);
    console.log('Calling LiteLLM API at:', endpoint);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${litellmApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt || 'Create a popular VIP package for tonight' }
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LiteLLM API error:', errorText);
      throw new Error(`LiteLLM API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in response');
    }

    console.log('AI response:', content);

    let packageData: GeneratedPackage;
    try {
      packageData = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate the structure
    if (!packageData.name || !packageData.items || !Array.isArray(packageData.items)) {
      throw new Error('Invalid package structure from AI');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      package: packageData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in ai-package-designer:', errorMessage);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
