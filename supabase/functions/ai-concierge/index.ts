import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LITELLM_API_URL = Deno.env.get("LITELLM_API_URL");
const LITELLM_API_KEY = Deno.env.get("LITELLM_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Helper to construct proper LiteLLM endpoint
function getLiteLLMEndpoint(baseUrl: string): string {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  if (cleanUrl.endsWith('/v1')) {
    return `${cleanUrl}/chat/completions`;
  } else if (cleanUrl.includes('/v1/')) {
    return `${cleanUrl}/chat/completions`;
  } else {
    return `${cleanUrl}/v1/chat/completions`;
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Tool definitions for the AI
const tools = [
  {
    type: "function",
    function: {
      name: "search_venues",
      description: "Search for venues/bars/clubs with optional filters. Use this to find venues matching user criteria like busiest, cheapest, by area, with promos/deals, etc.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["quiet", "perfect", "ideal", "busy", "too_busy"],
            description: "Filter by crowd status. Use 'busy' or 'too_busy' for popular/popping venues"
          },
          has_line_skip: {
            type: "boolean",
            description: "Filter venues that offer line skip passes"
          },
          supports_booking: {
            type: "boolean",
            description: "Filter venues that support table bookings/reservations"
          },
          has_promo: {
            type: "boolean",
            description: "Filter venues that have active promotions, deals, BOGO, happy hour, ladies night, drink specials, etc."
          },
          promo_type: {
            type: "string",
            enum: ["bogo", "happy_hour", "ladies_night", "drink_special", "entry_deal", "package_deal"],
            description: "Filter by specific promo type: bogo (buy one get one), happy_hour, ladies_night, drink_special, entry_deal, package_deal"
          },
          area_search: {
            type: "string",
            description: "Search by area name (e.g., 'senopati', 'kemang', 'scbd')"
          },
          name_search: {
            type: "string",
            description: "Search by venue name"
          },
          limit: {
            type: "number",
            description: "Maximum number of results to return"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_venue_packages",
      description: "Get available packages (bottle service, tables) for a specific venue or all venues. Use to find pricing and availability.",
      parameters: {
        type: "object",
        properties: {
          venue_id: {
            type: "string",
            description: "Specific venue ID to get packages for"
          },
          min_price: {
            type: "number",
            description: "Minimum price filter"
          },
          max_price: {
            type: "number",
            description: "Maximum price filter"
          },
          sort_by_price: {
            type: "string",
            enum: ["asc", "desc"],
            description: "Sort packages by price"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_line_skip_info",
      description: "Get line skip pass availability and pricing for venues",
      parameters: {
        type: "object",
        properties: {
          venue_id: {
            type: "string",
            description: "Specific venue ID"
          },
          available_only: {
            type: "boolean",
            description: "Only show venues with available line skip passes"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_nearby_quiet_venues",
      description: "Find venues with low crowd levels near the user. Great for finding less busy spots.",
      parameters: {
        type: "object",
        properties: {
          location_type: {
            type: "string",
            enum: ["home", "office", "current"],
            description: "Which user location to search near"
          },
          max_crowd_level: {
            type: "string",
            enum: ["quiet", "moderate"],
            description: "Maximum crowd level to include"
          },
          limit: {
            type: "number",
            description: "Maximum results"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_crowd_forecast",
      description: "Predict when a venue will be less busy or busier based on historical patterns",
      parameters: {
        type: "object",
        properties: {
          venue_id: {
            type: "string",
            description: "Venue to forecast"
          },
          day_of_week: {
            type: "number",
            description: "Day of week (0=Sunday, 6=Saturday)"
          }
        },
        required: ["venue_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_booking",
      description: "Create a table/venue booking. Requires user confirmation before executing.",
      parameters: {
        type: "object",
        properties: {
          venue_id: {
            type: "string",
            description: "Venue ID to book"
          },
          venue_name: {
            type: "string",
            description: "Venue name for confirmation"
          },
          booking_date: {
            type: "string",
            description: "Date in YYYY-MM-DD format"
          },
          party_size: {
            type: "number",
            description: "Number of guests"
          },
          special_requests: {
            type: "string",
            description: "Any special requests"
          }
        },
        required: ["venue_id", "venue_name", "booking_date", "party_size"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "purchase_line_skip",
      description: "Purchase a line skip pass for a venue. Requires user confirmation.",
      parameters: {
        type: "object",
        properties: {
          venue_id: {
            type: "string",
            description: "Venue ID"
          },
          venue_name: {
            type: "string",
            description: "Venue name for confirmation"
          },
          price: {
            type: "number",
            description: "Price of the line skip pass"
          }
        },
        required: ["venue_id", "venue_name", "price"]
      }
    }
  }
];

// Execute tool calls
async function executeTool(name: string, args: any, userId?: string): Promise<any> {
  console.log(`Executing tool: ${name}`, args);
  
  switch (name) {
    case "search_venues": {
      let query = supabase
        .from("venues")
        .select(`
          id, name, address, status, description, 
          has_cover, min_spend, supports_booking, 
          line_skip_enabled, line_skip_price, line_skip_sold_count, line_skip_daily_limit,
          has_promo, promo_type, promo_description, promo_valid_until,
          venue_type:venue_types(name)
        `);
      
      if (args.status) {
        query = query.eq("status", args.status);
      }
      if (args.has_line_skip) {
        query = query.eq("line_skip_enabled", true);
      }
      if (args.supports_booking) {
        query = query.eq("supports_booking", true);
      }
      if (args.has_promo) {
        query = query.eq("has_promo", true);
      }
      if (args.promo_type) {
        query = query.eq("promo_type", args.promo_type);
      }
      if (args.area_search) {
        query = query.ilike("address", `%${args.area_search}%`);
      }
      if (args.name_search) {
        query = query.ilike("name", `%${args.name_search}%`);
      }
      if (args.limit) {
        query = query.limit(args.limit);
      } else {
        query = query.limit(10);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
    
    case "get_venue_packages": {
      let query = supabase
        .from("venue_packages")
        .select(`
          id, name, description, price, 
          venue:venues(id, name, address)
        `)
        .eq("is_active", true);
      
      if (args.venue_id) {
        query = query.eq("venue_id", args.venue_id);
      }
      if (args.min_price) {
        query = query.gte("price", args.min_price);
      }
      if (args.max_price) {
        query = query.lte("price", args.max_price);
      }
      if (args.sort_by_price === "asc") {
        query = query.order("price", { ascending: true });
      } else if (args.sort_by_price === "desc") {
        query = query.order("price", { ascending: false });
      }
      
      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data;
    }
    
    case "get_line_skip_info": {
      let query = supabase
        .from("venues")
        .select("id, name, address, line_skip_enabled, line_skip_price, line_skip_sold_count, line_skip_daily_limit, line_skip_valid_until")
        .eq("line_skip_enabled", true);
      
      if (args.venue_id) {
        query = query.eq("id", args.venue_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Calculate availability and filter in JavaScript (PostgREST doesn't support column-to-column comparisons)
      let results = data?.map(v => ({
        ...v,
        available: v.line_skip_daily_limit === null || v.line_skip_sold_count < v.line_skip_daily_limit,
        remaining: v.line_skip_daily_limit ? v.line_skip_daily_limit - v.line_skip_sold_count : "unlimited"
      }));
      
      // Apply available_only filter in JavaScript
      if (args.available_only) {
        results = results?.filter(v => v.available);
      }
      
      return results;
    }
    
    case "get_nearby_quiet_venues": {
      // Get venues with low crowd based on recent snapshots
      const { data: crowdData, error: crowdError } = await supabase
        .from("venue_crowd_snapshots")
        .select(`
          venue_id,
          crowd_level,
          population_density,
          venue:venues(id, name, address, status)
        `)
        .in("crowd_level", [args.max_crowd_level || "quiet", "moderate"])
        .order("snapshot_at", { ascending: false })
        .limit(args.limit || 5);
      
      if (crowdError) throw crowdError;
      
      // Deduplicate by venue
      const uniqueVenues = new Map();
      crowdData?.forEach(v => {
        if (!uniqueVenues.has(v.venue_id)) {
          uniqueVenues.set(v.venue_id, v);
        }
      });
      
      return Array.from(uniqueVenues.values());
    }
    
    case "get_crowd_forecast": {
      // Return mock forecast data based on typical patterns
      const dayOfWeek = args.day_of_week ?? new Date().getDay();
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
      
      return {
        venue_id: args.venue_id,
        forecast: [
          { hour: 18, level: "quiet", typical: true },
          { hour: 19, level: "moderate", typical: true },
          { hour: 20, level: isWeekend ? "busy" : "moderate", typical: true },
          { hour: 21, level: isWeekend ? "busy" : "moderate", typical: true },
          { hour: 22, level: isWeekend ? "very_busy" : "busy", typical: true },
          { hour: 23, level: isWeekend ? "packed" : "busy", typical: true },
          { hour: 0, level: isWeekend ? "packed" : "very_busy", typical: true },
          { hour: 1, level: isWeekend ? "very_busy" : "busy", typical: true },
          { hour: 2, level: "busy", typical: true },
        ],
        best_time: isWeekend ? "6-8 PM for quieter experience" : "6-9 PM",
        warning: isWeekend ? "Peak crowd expected 11 PM - 1 AM" : null
      };
    }
    
    case "create_booking": {
      // Return booking details for confirmation - actual booking happens client-side
      return {
        action: "confirm_booking",
        details: {
          venue_id: args.venue_id,
          venue_name: args.venue_name,
          booking_date: args.booking_date,
          party_size: args.party_size,
          special_requests: args.special_requests || null
        },
        message: `Please confirm your booking at ${args.venue_name} for ${args.party_size} guests on ${args.booking_date}`
      };
    }
    
    case "purchase_line_skip": {
      // Return line skip details for confirmation - actual purchase happens client-side
      return {
        action: "confirm_line_skip",
        details: {
          venue_id: args.venue_id,
          venue_name: args.venue_name,
          price: args.price
        },
        message: `Please confirm your line skip pass purchase for ${args.venue_name} at IDR ${args.price?.toLocaleString()}`
      };
    }
    
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId } = await req.json();
    
    if (!LITELLM_API_URL || !LITELLM_API_KEY) {
      throw new Error("LITELLM_API_URL or LITELLM_API_KEY is not configured");
    }

    const systemPrompt = `You are a friendly and knowledgeable nightlife concierge assistant for Jakarta. You help users:
- Find bars, clubs, and venues based on their preferences
- Get information about prices, covers, packages, and table bookings
- Find venues with promotions, deals, BOGO offers, happy hours, ladies nights
- Compare venues and make recommendations
- Book tables and purchase line skip passes
- Find quiet venues near their home or office
- Get crowd forecasts to know when venues are less busy

Key behaviors:
- Be conversational and helpful
- When users ask about "popping" or "busy" venues, search for busy/too_busy status
- When users ask about promos, deals, BOGO, happy hour, ladies night, specials, or discounts - use has_promo=true or the specific promo_type filter
- When asking about prices, use the packages tool to get actual pricing
- For bookings, always confirm details before creating
- Mention specific venue names, prices, and promo details when available
- If you need to create a booking or purchase, return the confirmation action so the user can confirm
- Always include promo information (promo_description) when showing venues that have active promos
- When users ask "what's not crowded near my office?" or similar, use get_nearby_quiet_venues with appropriate location_type
- For questions like "when is X venue less busy?", use get_crowd_forecast

Promo types available: bogo (buy one get one), happy_hour, ladies_night, drink_special, entry_deal, package_deal

Current date: ${new Date().toISOString().split('T')[0]}
Currency: IDR (Indonesian Rupiah)`;

    // First API call - may include tool calls
    const apiEndpoint = getLiteLLMEndpoint(LITELLM_API_URL!);
    console.log('Calling AI endpoint:', apiEndpoint);
    
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LITELLM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "azure_ai/gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        tools,
        tool_choice: "auto",
        stream: false
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded. Please try again in a moment.",
          type: "rate_limit"
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Service temporarily unavailable. Please try again later.",
          type: "payment_required"
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    let data = await response.json();
    let assistantMessage = data.choices?.[0]?.message;
    
    // Handle tool calls
    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log("Processing tool calls:", assistantMessage.tool_calls);
      
      const toolResults = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await executeTool(toolCall.function.name, args, userId);
        
        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });
      }
      
      // Second API call with tool results
      const followUpResponse = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LITELLM_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "azure_ai/gpt-5-mini",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            assistantMessage,
            ...toolResults
          ],
          stream: false
        }),
      });

      if (!followUpResponse.ok) {
        throw new Error("Failed to process tool results");
      }

      data = await followUpResponse.json();
      assistantMessage = data.choices?.[0]?.message;
    }

    // Check if the response contains an action for client-side handling
    const content = assistantMessage?.content || "";
    let action = null;
    
    // Parse any JSON action embedded in the response
    try {
      const actionMatch = content.match(/\{[\s\S]*"action"[\s\S]*\}/);
      if (actionMatch) {
        action = JSON.parse(actionMatch[0]);
      }
    } catch (e) {
      // No action in response, that's fine
    }

    return new Response(JSON.stringify({
      message: content,
      action
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (error) {
    console.error("AI concierge error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "An error occurred",
      type: "error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
