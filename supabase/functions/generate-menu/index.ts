import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { venueId, menuName, cuisineType, menuType, itemCount } = await req.json();

    if (!venueId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing venueId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the AI prompt
    const prompt = `Generate a realistic restaurant/bar menu for a venue. 

Menu Details:
- Menu Name: ${menuName || 'Main Menu'}
- Cuisine Type: ${cuisineType || 'International'}
- Menu Type: ${menuType || 'Food & Drinks'}
- Number of Items: ${itemCount || 10}

Generate menu items with realistic prices in IDR (Indonesian Rupiah). Include a mix of categories appropriate for the cuisine and menu type.

You MUST respond with a JSON object in this exact format:
{
  "menuName": "string",
  "menuDescription": "brief description of the menu",
  "items": [
    {
      "name": "item name",
      "description": "appetizing description",
      "price": 75000,
      "category": "Appetizers/Mains/Desserts/Drinks/etc",
      "dietary_tags": ["Vegetarian", "Vegan", "Gluten-Free", "Halal", "Spicy", "Contains Nuts"]
    }
  ]
}

Only include dietary_tags that actually apply to each item. Be creative with names and descriptions. Prices should be realistic for the cuisine type (ranging from 25,000 to 500,000 IDR typically).`;

    console.log('Calling Lovable AI to generate menu...');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are a culinary expert who creates professional restaurant menus. Always respond with valid JSON only, no markdown formatting.' 
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI API error:', status, errorText);
      throw new Error(`AI service error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI response received, parsing...');

    // Parse the JSON response
    let menuData;
    try {
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      menuData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse menu data from AI');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create the menu
    const { data: newMenu, error: menuError } = await supabase
      .from('menus')
      .insert({
        venue_id: venueId,
        name: menuData.menuName || menuName || 'Generated Menu',
        description: menuData.menuDescription || null,
        is_active: true,
      })
      .select()
      .single();

    if (menuError) {
      console.error('Error creating menu:', menuError);
      throw new Error('Failed to create menu');
    }

    console.log('Menu created:', newMenu.id);

    // Insert menu items
    const items = menuData.items || [];
    if (items.length > 0) {
      const itemsToInsert = items.map((item: any, index: number) => ({
        menu_id: newMenu.id,
        name: item.name,
        description: item.description || null,
        price: item.price || null,
        category: item.category || null,
        dietary_tags: item.dietary_tags || [],
        is_available: true,
        sort_order: index,
      }));

      const { error: itemsError } = await supabase
        .from('menu_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error creating menu items:', itemsError);
        // Menu was created, just items failed
      }
    }

    console.log(`Generated menu with ${items.length} items`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        menuId: newMenu.id,
        menuName: newMenu.name,
        itemsCreated: items.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Generate menu error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate menu';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
