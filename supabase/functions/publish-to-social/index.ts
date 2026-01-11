import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PublishRequest {
  promo_id: string;
  venue_id: string;
  platforms: string[];
  title: string;
  subtitle?: string;
  image_url?: string;
  deep_link?: string;
}

interface SocialCredential {
  platform: string;
  access_token: string | null;
  refresh_token: string | null;
  account_id: string | null;
}

interface PublishResult {
  platform: string;
  success: boolean;
  error?: string;
  post_id?: string;
}

// Twitter OAuth signature generation
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const signatureBaseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(
    Object.entries(params)
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join("&")
  )}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  const hmacSha1 = createHmac("sha1", signingKey);
  return hmacSha1.update(signatureBaseString).digest("base64");
}

function generateTwitterOAuthHeader(
  method: string,
  url: string,
  apiKey: string,
  apiSecret: string,
  accessToken: string,
  accessTokenSecret: string
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: Math.random().toString(36).substring(2),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  const signature = generateOAuthSignature(method, url, oauthParams, apiSecret, accessTokenSecret);
  const signedParams = { ...oauthParams, oauth_signature: signature };

  return "OAuth " + Object.entries(signedParams)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(", ");
}

async function publishToTwitter(
  credential: SocialCredential,
  title: string,
  subtitle: string | undefined,
  deepLink: string | undefined
): Promise<PublishResult> {
  try {
    // For Twitter, we store: access_token = API Key, refresh_token = API Secret, account_id = Bearer Token
    // But we also need user access tokens which should be stored differently
    // For now, we'll use the stored credentials as-is
    const apiKey = credential.access_token;
    const apiSecret = credential.refresh_token;
    const bearerToken = credential.account_id;

    if (!apiKey || !apiSecret) {
      return { platform: "twitter", success: false, error: "Missing Twitter API credentials" };
    }

    const tweetText = `${title}${subtitle ? `\n\n${subtitle}` : ""}${deepLink ? `\n\n🔗 ${deepLink}` : ""}`;
    
    // Using Twitter API v2 with OAuth 2.0 Bearer Token for app-only auth
    // Note: For user context (posting tweets), OAuth 1.0a User Context is needed
    // This is a simplified version - full implementation would need user OAuth tokens
    
    const url = "https://api.twitter.com/2/tweets";
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: tweetText.substring(0, 280) }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("Twitter API error:", data);
      return { platform: "twitter", success: false, error: data.detail || "Failed to post tweet" };
    }

    console.log("Twitter post successful:", data);
    return { platform: "twitter", success: true, post_id: data.data?.id };
  } catch (error) {
    console.error("Twitter publish error:", error);
    return { platform: "twitter", success: false, error: String(error) };
  }
}

async function publishToFacebook(
  credential: SocialCredential,
  title: string,
  subtitle: string | undefined,
  imageUrl: string | undefined,
  deepLink: string | undefined
): Promise<PublishResult> {
  try {
    const accessToken = credential.access_token;
    const pageId = credential.account_id;

    if (!accessToken || !pageId) {
      return { platform: "facebook", success: false, error: "Missing Facebook credentials" };
    }

    const message = `${title}${subtitle ? `\n\n${subtitle}` : ""}${deepLink ? `\n\n🔗 Book now: ${deepLink}` : ""}`;
    
    // Post to Facebook Page
    const url = `https://graph.facebook.com/v18.0/${pageId}/feed`;
    
    const params = new URLSearchParams({
      message,
      access_token: accessToken,
    });

    if (deepLink) {
      params.append("link", deepLink);
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error("Facebook API error:", data);
      return { platform: "facebook", success: false, error: data.error?.message || "Failed to post" };
    }

    console.log("Facebook post successful:", data);
    return { platform: "facebook", success: true, post_id: data.id };
  } catch (error) {
    console.error("Facebook publish error:", error);
    return { platform: "facebook", success: false, error: String(error) };
  }
}

async function publishToInstagram(
  credential: SocialCredential,
  title: string,
  subtitle: string | undefined,
  imageUrl: string | undefined,
  deepLink: string | undefined
): Promise<PublishResult> {
  try {
    const accessToken = credential.access_token;
    const accountId = credential.account_id;

    if (!accessToken || !accountId) {
      return { platform: "instagram", success: false, error: "Missing Instagram credentials" };
    }

    if (!imageUrl) {
      return { platform: "instagram", success: false, error: "Instagram requires an image" };
    }

    const caption = `${title}${subtitle ? `\n\n${subtitle}` : ""}${deepLink ? `\n\n🔗 Link in bio or visit: ${deepLink}` : ""}`;

    // Step 1: Create media container
    const containerUrl = `https://graph.facebook.com/v18.0/${accountId}/media`;
    const containerParams = new URLSearchParams({
      image_url: imageUrl,
      caption,
      access_token: accessToken,
    });

    const containerResponse = await fetch(containerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: containerParams.toString(),
    });

    const containerData = await containerResponse.json();

    if (!containerResponse.ok || containerData.error) {
      console.error("Instagram container error:", containerData);
      return { platform: "instagram", success: false, error: containerData.error?.message || "Failed to create media" };
    }

    const containerId = containerData.id;

    // Step 2: Publish the container
    const publishUrl = `https://graph.facebook.com/v18.0/${accountId}/media_publish`;
    const publishParams = new URLSearchParams({
      creation_id: containerId,
      access_token: accessToken,
    });

    const publishResponse = await fetch(publishUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: publishParams.toString(),
    });

    const publishData = await publishResponse.json();

    if (!publishResponse.ok || publishData.error) {
      console.error("Instagram publish error:", publishData);
      return { platform: "instagram", success: false, error: publishData.error?.message || "Failed to publish" };
    }

    console.log("Instagram post successful:", publishData);
    return { platform: "instagram", success: true, post_id: publishData.id };
  } catch (error) {
    console.error("Instagram publish error:", error);
    return { platform: "instagram", success: false, error: String(error) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: PublishRequest = await req.json();
    const { promo_id, venue_id, platforms, title, subtitle, image_url, deep_link } = body;

    console.log("Publishing promo to social media:", { promo_id, venue_id, platforms });

    if (!venue_id || !platforms || platforms.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing venue_id or platforms" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter out 'app' from platforms - it's not a social network
    const socialPlatforms = platforms.filter(p => p !== "app");
    
    if (socialPlatforms.length === 0) {
      return new Response(
        JSON.stringify({ success: true, results: [], message: "No social platforms to publish to" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch credentials for the venue
    const { data: credentials, error: credError } = await supabase
      .from("venue_social_credentials")
      .select("platform, access_token, refresh_token, account_id")
      .eq("venue_id", venue_id)
      .eq("is_active", true)
      .in("platform", socialPlatforms);

    if (credError) {
      console.error("Error fetching credentials:", credError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Found credentials for platforms:", credentials?.map(c => c.platform));

    const results: PublishResult[] = [];

    for (const platform of socialPlatforms) {
      const credential = credentials?.find(c => c.platform === platform);
      
      if (!credential) {
        results.push({ platform, success: false, error: "Platform not configured" });
        continue;
      }

      let result: PublishResult;

      switch (platform) {
        case "twitter":
          result = await publishToTwitter(credential, title, subtitle, deep_link);
          break;
        case "facebook":
          result = await publishToFacebook(credential, title, subtitle, image_url, deep_link);
          break;
        case "instagram":
          result = await publishToInstagram(credential, title, subtitle, image_url, deep_link);
          break;
        case "tiktok":
          // TikTok API is more complex and requires video content
          result = { platform: "tiktok", success: false, error: "TikTok publishing requires video content - coming soon" };
          break;
        case "whatsapp":
          // WhatsApp Business API requires template messages for broadcast
          result = { platform: "whatsapp", success: false, error: "WhatsApp broadcast requires approved templates - coming soon" };
          break;
        default:
          result = { platform, success: false, error: "Unknown platform" };
      }

      results.push(result);
    }

    // Log results
    const successCount = results.filter(r => r.success).length;
    console.log(`Published to ${successCount}/${results.length} platforms`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        summary: `Published to ${successCount}/${results.length} platforms`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in publish-to-social:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
