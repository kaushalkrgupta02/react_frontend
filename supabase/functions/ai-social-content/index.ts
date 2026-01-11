import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      platform, 
      currentContent, 
      editPrompt, 
      promoTitle, 
      promoDescription, 
      venueName, 
      deepLink,
      regenerate 
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const platformGuides: Record<string, string> = {
      instagram: `
        - Use emojis liberally
        - Include relevant hashtags (5-10)
        - Use line breaks for readability
        - Include a call-to-action
        - Mention "link in bio" for links
        - Max ~2200 characters
      `,
      whatsapp: `
        - Personal and direct tone
        - Use emojis sparingly
        - Include the direct booking link
        - Keep it conversational
        - Add urgency if appropriate
      `,
      tiktok: `
        - Very casual and trendy tone
        - Use trending hashtags (#fyp is essential)
        - Keep it short and punchy
        - Use emojis
        - Reference TikTok culture if relevant
      `,
      facebook: `
        - Slightly more formal than Instagram
        - Can be longer-form
        - Include the direct link
        - Use 2-3 relevant hashtags
        - Add a clear call-to-action
      `,
      twitter: `
        - Keep it under 280 characters
        - Be punchy and direct
        - Use 1-2 hashtags max
        - Include shortened link
        - Create urgency
      `,
    };

    let systemPrompt = `You are a social media marketing expert specializing in nightlife, venues, and promotions. You create engaging, platform-specific content that drives conversions.`;

    let userPrompt: string;

    if (regenerate) {
      userPrompt = `Generate fresh social media content for ${platform.toUpperCase()}.

Promo Details:
- Title: ${promoTitle}
- Description: ${promoDescription}
- Venue: ${venueName}
- Booking Link: ${deepLink}

Platform Guidelines for ${platform}:
${platformGuides[platform] || 'Create engaging content'}

Return ONLY the social media post content, nothing else. No explanations.`;
    } else if (editPrompt) {
      userPrompt = `Edit this ${platform.toUpperCase()} post according to the user's request.

Current Content:
${currentContent}

User's Edit Request: "${editPrompt}"

Promo Context:
- Title: ${promoTitle}
- Description: ${promoDescription}
- Venue: ${venueName}
- Booking Link: ${deepLink}

Platform Guidelines for ${platform}:
${platformGuides[platform] || 'Create engaging content'}

Return ONLY the edited social media post content, nothing else. No explanations.`;
    } else {
      return new Response(
        JSON.stringify({ error: "Either regenerate or editPrompt is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("Generating social content for:", platform);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 402 }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const generatedContent = data.choices?.[0]?.message?.content?.trim();

    if (!generatedContent) {
      throw new Error("No content generated");
    }

    console.log("Generated content length:", generatedContent.length);

    return new Response(
      JSON.stringify({ content: generatedContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-social-content:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
