import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { sessionId, apiKey } = await req.json();

    const dailyApiKey = apiKey || Deno.env.get("DAILY_CO_API_KEY") || "";

    if (!dailyApiKey) {
      return new Response(JSON.stringify({ error: "Missing Daily.co API key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const roomName = `bp-${sessionId}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 60);
    const exp = Math.floor(Date.now() / 1000) + 3 * 60 * 60; // 3 hours

    const response = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${dailyApiKey}`,
      },
      body: JSON.stringify({
        name: roomName,
        privacy: "public",
        properties: {
          exp,
          max_participants: 2,
          enable_chat: true,
          enable_screenshare: false,
          enable_knocking: false,
          autojoin: true,
          lang: "en",
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error || "Failed to create room" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: response.status,
      });
    }

    return new Response(JSON.stringify({ roomUrl: data.url, roomName: data.name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
