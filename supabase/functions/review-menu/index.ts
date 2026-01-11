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
    const { venueId, menuId } = await req.json();

    if (!venueId) {
      return new Response(
        JSON.stringify({ error: 'venueId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch venue info
    const { data: venue } = await supabase
      .from('venues')
      .select('name, description, venue_type_id')
      .eq('id', venueId)
      .single();

    // Fetch menus and items
    let menusQuery = supabase
      .from('menus')
      .select('id, name, description, is_active')
      .eq('venue_id', venueId);
    
    if (menuId) {
      menusQuery = menusQuery.eq('id', menuId);
    }

    const { data: menus, error: menusError } = await menusQuery;

    if (menusError) {
      console.error('Error fetching menus:', menusError);
      throw new Error('Failed to fetch menus');
    }

    if (!menus || menus.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No menus found to review' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all items for these menus
    const menuIds = menus.map(m => m.id);
    const { data: items, error: itemsError } = await supabase
      .from('menu_items')
      .select('*')
      .in('menu_id', menuIds)
      .order('sort_order');

    if (itemsError) {
      console.error('Error fetching menu items:', itemsError);
      throw new Error('Failed to fetch menu items');
    }

    // Build menu data for AI analysis
    const menuData = menus.map(menu => ({
      name: menu.name,
      description: menu.description,
      is_active: menu.is_active,
      items: (items || [])
        .filter(item => item.menu_id === menu.id)
        .map(item => ({
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category,
          dietary_tags: item.dietary_tags,
          is_available: item.is_available,
        }))
    }));

    const totalItems = items?.length || 0;

    // Call Lovable AI for analysis
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an expert F&B consultant and menu strategist. Analyze menus and provide actionable suggestions to improve:
- Menu structure and organization
- Pricing strategy and value perception
- Item descriptions and appeal
- Menu variety and balance
- Missing opportunities or trends
- Dietary accommodations
- Upselling opportunities

Be specific, practical, and constructive. Consider the venue type when making suggestions.`;

    const userPrompt = `Analyze this menu for "${venue?.name || 'the venue'}" and provide improvement suggestions.

Venue Description: ${venue?.description || 'Not specified'}

Current Menu Data:
${JSON.stringify(menuData, null, 2)}

Total Items: ${totalItems}

Please provide:
1. Overall assessment (2-3 sentences)
2. Top 3-5 specific improvement suggestions with priority (high/medium/low)
3. Any items that could be improved (descriptions, pricing, categorization)
4. Missing items or categories you'd recommend adding
5. Quick wins that can be implemented immediately

Format your response as JSON with this structure:
{
  "overallAssessment": "string",
  "suggestions": [
    {
      "title": "string",
      "description": "string",
      "priority": "high" | "medium" | "low",
      "category": "pricing" | "descriptions" | "structure" | "variety" | "dietary" | "upselling" | "branding"
    }
  ],
  "itemImprovements": [
    {
      "itemName": "string",
      "currentIssue": "string",
      "suggestedChange": "string"
    }
  ],
  "missingOpportunities": ["string"],
  "quickWins": ["string"]
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error('AI analysis failed');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    let review;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1].trim();
      review = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Return raw content if parsing fails
      review = {
        overallAssessment: content,
        suggestions: [],
        itemImprovements: [],
        missingOpportunities: [],
        quickWins: []
      };
    }

    console.log('Menu review completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        review,
        menuCount: menus.length,
        itemCount: totalItems
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Menu review error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to review menu';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});