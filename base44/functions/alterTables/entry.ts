import { createClient } from 'npm:@supabase/supabase-js@2.39.8';

Deno.serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")?.trim();
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return Response.json({ error: 'Missing credentials' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false }
    });

    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.therapist_profiles ADD COLUMN IF NOT EXISTS platform_markup_percentage numeric DEFAULT 0;
        ALTER TABLE public.therapist_profiles ADD COLUMN IF NOT EXISTS final_customer_price numeric DEFAULT 0;
        UPDATE public.therapist_profiles SET final_customer_price = consultation_fee WHERE final_customer_price = 0 OR final_customer_price IS NULL;
      `
    });

    if (error) {
       return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});