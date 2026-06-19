import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  const formData = await req.formData().catch(() => null);
  if (!formData) return Response.json({ error: "Invalid form data" }, { status: 400 });
  
  const token = formData.get('supabaseToken');
  if (!token) return Response.json({ error: "Unauthorized: Missing token" }, { status: 401 });

  const { createClient } = await import('npm:@supabase/supabase-js@2.39.8');
  const supabaseAuth = createClient(Deno.env.get("SUPABASE_URL")?.trim(), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim());
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
  
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const base44 = createClientFromRequest(req);

  const file = formData.get('file');
  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 });

  const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
  const uploadPreset = Deno.env.get('CLOUDINARY_UPLOAD_PRESET');

  const uploadForm = new FormData();
  uploadForm.append('file', file);
  uploadForm.append('upload_preset', uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body: uploadForm,
  });

  const data = await res.json();
  if (!res.ok) return Response.json({ error: data.error?.message || 'Upload failed' }, { status: 400 });

  return Response.json({
    url: data.secure_url,
    public_id: data.public_id,
    resource_type: data.resource_type,
    format: data.format,
    bytes: data.bytes,
  });
});