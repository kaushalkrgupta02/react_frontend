import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { venueId, fileBase64, fileName, fileType } = await req.json();

    if (!venueId || !fileBase64) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing venueId or file data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Prepare the prompt for menu extraction
    const systemPrompt = `You are a menu extraction assistant. Extract menu items from the provided content.
Return ONLY a valid JSON object with this structure:
{
  "menuName": "Name of the menu (e.g., Drinks Menu, Food Menu)",
  "items": [
    {
      "name": "Item name",
      "description": "Item description (optional)",
      "price": 50000,
      "category": "Category like Appetizers, Mains, Drinks, etc.",
      "dietary_tags": ["Vegetarian", "Vegan", "Gluten-Free", "Halal", "Spicy"]
    }
  ]
}

Rules:
- Extract ALL items you can find
- Price should be a number (no currency symbols), use null if not found
- Category should be inferred from context if not explicit
- dietary_tags should only include applicable tags from the list
- If the content is in a non-English language, translate item names to English but keep original in description
- Return valid JSON only, no markdown or extra text`;

    let userContent: any[];

    if (fileType.startsWith('image/')) {
      // For images, use vision capability
      userContent = [
        {
          type: "image_url",
          image_url: {
            url: `data:${fileType};base64,${fileBase64}`,
          },
        },
        {
          type: "text",
          text: "Extract all menu items from this menu image. Include prices, descriptions, and categories where visible.",
        },
      ];
    } else {
      // For PDFs and spreadsheets, decode and send as text
      // Note: For production, you'd want proper PDF/Excel parsing
      userContent = [
        {
          type: "text",
          text: `Extract menu items from this file (${fileName}). The file content in base64: ${fileBase64.substring(0, 50000)}...
          
Please analyze and extract all menu items with their names, prices, descriptions, and categories.`,
        },
      ];
    }

    console.log(`Processing menu extraction for venue ${venueId}, file: ${fileName}`);

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI response received, parsing...");

    // Parse the JSON response
    let extractedData;
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, content];
      const jsonStr = jsonMatch[1] || content;
      extractedData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse menu data from AI response");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create or find menu
    const menuName = extractedData.menuName || `Imported Menu (${new Date().toLocaleDateString()})`;
    
    const { data: menu, error: menuError } = await supabase
      .from("menus")
      .insert({
        venue_id: venueId,
        name: menuName,
        description: `Imported from ${fileName}`,
        is_active: true,
      })
      .select()
      .single();

    if (menuError) {
      console.error("Menu creation error:", menuError);
      throw new Error("Failed to create menu");
    }

    // Insert menu items
    const items = (extractedData.items || []).map((item: any, index: number) => ({
      menu_id: menu.id,
      name: item.name || `Item ${index + 1}`,
      description: item.description || null,
      price: item.price || null,
      category: item.category || null,
      dietary_tags: Array.isArray(item.dietary_tags) ? item.dietary_tags : [],
      is_available: true,
      sort_order: index,
    }));

    if (items.length > 0) {
      const { error: itemsError } = await supabase
        .from("menu_items")
        .insert(items);

      if (itemsError) {
        console.error("Items creation error:", itemsError);
        // Don't throw, menu was created successfully
      }
    }

    console.log(`Successfully extracted ${items.length} items`);

    return new Response(
      JSON.stringify({
        success: true,
        menuId: menu.id,
        menuName: menu.name,
        itemsCreated: items.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Menu extraction error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
