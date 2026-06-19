import { createClient } from 'npm:@supabase/supabase-js@2.39.8';

Deno.serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")?.trim();
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")?.trim();

    const payload = await req.json();
    const { therapistData, userProfileData, customerData, supabaseToken } = payload;

    if (!supabaseToken) {
      return Response.json({ error: "Unauthorized: Missing supabaseToken in payload" }, { status: 401 });
    }

    // Verify the token using the service key client because the anon key in env might be invalid
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(supabaseToken);

    if (authError || !user) {
      console.error("Supabase auth error:", authError?.message);
      return Response.json({ error: "Unauthorized: " + (authError?.message || "Invalid token") }, { status: 401 });
    }

    // Use service role client for all DB writes (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false }
    });

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

    // Upsert therapist profile
    if (therapistData) {
      const { error: tError } = await supabase
        .from('therapist_profiles')
        .upsert({ ...therapistData, user_id: userUuid, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (tError) {
        console.error("therapist_profiles upsert error:", tError);
        return Response.json({ error: "Failed to save therapist_profiles: " + tError.message }, { status: 500 });
      }
    }

    // Upsert customer profile
    if (customerData) {
      const { error: cError } = await supabase
        .from('customer_profiles')
        .upsert({ ...customerData, user_id: userUuid, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (cError) {
        console.error("customer_profiles upsert error:", cError);
        return Response.json({ error: "Failed to save customer_profiles: " + cError.message }, { status: 500 });
      }
    }

    // Upsert user profile
    if (userProfileData) {
      const { data: existing } = await supabase
        .from('user_profiles')
        .select('id, step_data, last_completed_step')
        .eq('user_id', userUuid)
        .maybeSingle();

      let mergedData = { ...userProfileData, user_id: userUuid, updated_at: new Date().toISOString() };

      // Merge step_data if both exist
      if (userProfileData.step_data && existing?.step_data) {
        mergedData.step_data = { ...existing.step_data, ...userProfileData.step_data };
      }

      // Never go backwards on last_completed_step
      if (userProfileData.last_completed_step && existing?.last_completed_step) {
        mergedData.last_completed_step = Math.max(existing.last_completed_step, userProfileData.last_completed_step);
      }

      const { error: uError } = await supabase
        .from('user_profiles')
        .upsert(mergedData, { onConflict: 'user_id' });
      if (uError) {
        console.error("user_profiles upsert error:", uError);
        return Response.json({ error: "Failed to save user_profiles: " + uError.message }, { status: 500 });
      }
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("saveProfileData unexpected error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});