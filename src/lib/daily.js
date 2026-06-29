import { supabase } from "./supabaseClient";

const DAILY_API_KEY = import.meta.env.VITE_DAILY_CO_API_KEY;

/**
 * Creates a Daily.co video room via Supabase Edge Function.
 * Returns the room URL to embed as an iframe.
 */
export async function createDailyRoom(sessionId) {
  const { data, error } = await supabase.functions.invoke("daily-room", {
    body: {
      sessionId,
      apiKey: DAILY_API_KEY,
    },
  });

  if (error || !data?.roomUrl) {
    throw new Error(data?.error || error?.message || "Failed to create video room");
  }

  return data.roomUrl;
}
