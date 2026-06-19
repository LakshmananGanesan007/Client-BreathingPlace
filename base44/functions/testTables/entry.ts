import { createClient } from 'npm:@supabase/supabase-js@2.39.8';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: d1, error: e1 } = await supabase.from('blogpost').select('id').limit(1);
    const { data: d2, error: e2 } = await supabase.from('blog_post').select('id').limit(1);
    const { data: d3, error: e3 } = await supabase.from('blogposts').select('id').limit(1);
    
    return Response.json({ d1: e1, d2: e2, d3: e3 });
  } catch (e) {
    return Response.json({ error: e.message });
  }
});