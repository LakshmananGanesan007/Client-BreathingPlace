import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  const payload = await req.json().catch(() => ({}));
  const token = payload.supabaseToken;
  if (!token) return Response.json({ error: "Unauthorized: Missing token" }, { status: 401 });

  const { createClient } = await import('npm:@supabase/supabase-js@2.39.8');
  const supabaseAuth = createClient(Deno.env.get("SUPABASE_URL")?.trim(), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim());
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
  
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const base44 = createClientFromRequest(req);

  const { session_id } = await req.json();
  if (!session_id) return Response.json({ error: 'session_id is required' }, { status: 400 });

  const apiKey = Deno.env.get('DAILY_CO_API_KEY');
  const roomName = `bp-session-${session_id}`;

  // Try to fetch an existing room first (idempotent)
  let room = null;
  const getRes = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });

  if (getRes.ok) {
    room = await getRes.json();
  } else {
    // Create room if it doesn't exist
    const createRes = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          exp: Math.floor(Date.now() / 1000) + 7200, // 2 hour expiry
          enable_chat: true,
          enable_screenshare: true,
          start_video_off: false,
          start_audio_off: false,
          max_participants: 10, // allows admin observers
        },
      }),
    });
    if (!createRes.ok) {
      const err = await createRes.json();
      return Response.json({ error: err.error || 'Failed to create room' }, { status: 400 });
    }
    room = await createRes.json();
  }

  // Generate a meeting token for this user
  const isOwner = user.role === 'therapist' || user.role === 'admin' || user.role === 'super_admin';
  const tokenRes = await fetch('https://api.daily.co/v1/meeting-tokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_name: user.full_name || user.email,
        exp: Math.floor(Date.now() / 1000) + 7200,
        is_owner: isOwner,
      },
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) return Response.json({ error: tokenData.error || 'Failed to create token' }, { status: 400 });

  // Save the meeting_url to the Session entity (best-effort)
  try {
    await base44.asServiceRole.entities.Session.update(session_id, {
      meeting_url: room.url,
      status: 'in_progress',
    });
  } catch (_) {
    // Session may not exist in test — ignore
  }

  return Response.json({
    room_url: room.url,
    room_name: roomName,
    token: tokenData.token,
    meeting_url: `${room.url}?t=${tokenData.token}`,
  });
});