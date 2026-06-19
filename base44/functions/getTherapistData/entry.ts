import { createClient } from 'npm:@supabase/supabase-js@2.39.8';

Deno.serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")?.trim();
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return Response.json({ error: 'Missing Supabase credentials' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false }
    });

    const payload = await req.json().catch(() => ({}));

    if (payload.action === 'get_approved') {
      const { data, error } = await supabase
        .from('therapist_profiles')
        .select('*')
        .eq('approval_status', 'approved');
      if (error) throw error;
      return Response.json({ data: data || [] });
    } 
    
    if (payload.action === 'get_profile' && payload.user_id) {
      function toUUID(id) {
        if (!id) return id;
        if (id.includes('-')) return id;
        const hex = id.replace(/[^a-f0-9]/gi, '');
        if (hex.length === 24) {
          const p = hex.padEnd(32, '0');
          return `${p.slice(0,8)}-${p.slice(8,12)}-${p.slice(12,16)}-${p.slice(16,20)}-${p.slice(20)}`;
        }
        return id;
      }
      const userUuid = toUUID(payload.user_id);

      const { data, error } = await supabase
        .from('therapist_profiles')
        .select('*')
        .eq('user_id', userUuid)
        .maybeSingle();
      if (error) throw error;
      return Response.json({ data: data || null });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});