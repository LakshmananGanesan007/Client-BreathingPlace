/**
 * Backend function: verifyProfileStatus
 * Checks profile_status from Supabase for the authenticated user.
 * Used for server-side route protection.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createClient } from 'npm:@supabase/supabase-js@2.39.8';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")?.trim();
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();

Deno.serve(async (req) => {
  try {
    const payload = await req.json().catch(() => ({}));
    const token = payload.supabaseToken;
    if (!token) return Response.json({ error: "Unauthorized: Missing token" }, { status: 401 });

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    function toUUID(id) {
      if (!id) return id;
      if (id.includes('-')) return id;
      const hex = id.replace(/[^a-fA-F0-9]/g, '');
      if (hex.length === 24) {
        const p = hex.padEnd(32, '0');
        return `${p.slice(0,8)}-${p.slice(8,12)}-${p.slice(12,16)}-${p.slice(16,20)}-${p.slice(20)}`;
      }
      return id;
    }
    const userUuid = toUUID(user.id);

    // Query Supabase user_profiles directly using the anon key + user's JWT
    const supabaseRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_profiles?user_id=eq.${userUuid}&select=*&limit=1`,
      {
        headers: {
          "apikey": SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!supabaseRes.ok) {
      return Response.json({ profile: null, profile_status: null });
    }

    const rows = await supabaseRes.json();
    const profile = rows[0] || null;

    return Response.json({
      profile,
      profile_status: profile?.profile_status || null,
      selected_role: profile?.selected_role || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});