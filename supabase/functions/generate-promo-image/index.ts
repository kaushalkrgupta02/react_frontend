import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, promoTitle, promoDescription } = await req.json();
    
    if (!prompt && !promoTitle) {
      return new Response(
        JSON.stringify({ error: "Prompt or promo details required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LITELLM_API_URL = Deno.env.get("LITELLM_API_URL");
    const LITELLM_API_KEY = Deno.env.get("LITELLM_API_KEY");
    if (!LITELLM_API_URL || !LITELLM_API_KEY) {
      console.error("LITELLM_API_URL or LITELLM_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "LiteLLM API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build a comprehensive image generation prompt
    let enhancedPrompt = prompt || '';
    
    // Check if prompt is too short/vague - enhance it
    const isVaguePrompt = prompt && prompt.split(' ').length < 5;
    
    if (isVaguePrompt || !prompt) {
      const baseContext = `Create a professional promotional banner image for a nightclub/bar. Style: modern, vibrant, eye-catching with neon accents and a dark luxurious background. Aspect ratio 16:9. Ultra high resolution.`;
      
      if (promoTitle || promoDescription) {
        enhancedPrompt = `${baseContext} The promo is titled "${promoTitle || 'Special Offer'}". ${promoDescription ? `Description: ${promoDescription}.` : ''} ${prompt ? `Additional style request: ${prompt}.` : ''} Do NOT include any text in the image.`;
      } else if (prompt) {
        // User gave a short prompt without promo context - make it specific for image generation
        enhancedPrompt = `${baseContext} Style modification: ${prompt}. Do NOT include any text in the image. Generate the image directly.`;
      } else {
        enhancedPrompt = `${baseContext} Create a generic nightlife promo banner with cocktails, party atmosphere, and celebration vibes. Do NOT include any text in the image.`;
      }
    }

    console.log("Generating image with enhanced prompt:", enhancedPrompt.substring(0, 200) + "...");

    const litellmEndpoint = LITELLM_API_URL.endsWith('/') 
      ? `${LITELLM_API_URL}chat/completions` 
      : `${LITELLM_API_URL}/chat/completions`;

    const response = await fetch(litellmEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LITELLM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "azure_ai/gpt-5.2-chat",
        messages: [
          {
            role: "user",
            content: enhancedPrompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received, checking for image...");

    // Extract the image URL from the response
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      // Log the actual response for debugging
      const content = data.choices?.[0]?.message?.content || '';
      console.error("No image in response. AI said:", content.substring(0, 200));
      
      return new Response(
        JSON.stringify({ 
          error: "Image generation failed. Try a more specific prompt like 'nightclub party with neon lights'",
          aiResponse: content.substring(0, 100)
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Image generated successfully");
    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating image:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
