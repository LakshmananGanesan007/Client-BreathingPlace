import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createClient } from 'npm:@supabase/supabase-js@2.39.8';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    const { data, error } = await supabase.from('BlogPost').insert([{
      title: "Test Blog",
      slug: "test-blog",
      excerpt: "excerpt",
      content: "content",
      cover_image_url: "url",
      tag: "tag",
      read_time: "5 min",
      published: true,
      author_name: "Author"
    }]).select();

    return Response.json({ success: true, data, error });
  } catch (e) {
    return Response.json({ error: e.message });
  }
});