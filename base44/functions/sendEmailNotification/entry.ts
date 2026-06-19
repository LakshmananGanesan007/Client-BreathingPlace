import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { createClient } = await import('npm:@supabase/supabase-js@2.39.8');
  const supabaseAuth = createClient(Deno.env.get("SUPABASE_URL")?.trim(), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim());
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
  
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const base44 = createClientFromRequest(req);

  const { type, to, data } = await req.json();
  if (!type || !to) return Response.json({ error: 'type and to are required' }, { status: 400 });

  const resendKey = Deno.env.get('RESEND_API_KEY');
  const FROM = 'BreathingPlace <noreply@breathingplace.in>';

  const templates = {
    session_booked: {
      subject: '✅ Session Confirmed – BreathingPlace',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px">
          <h2 style="color:#2E8B57">Your session is confirmed!</h2>
          <p>Hi <strong>${data?.customer_name || 'there'}</strong>,</p>
          <p>Your session with <strong>${data?.therapist_name || 'your therapist'}</strong> has been booked.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;color:#666">Date</td><td style="padding:8px;font-weight:bold">${data?.session_date || '—'}</td></tr>
            <tr><td style="padding:8px;color:#666">Time</td><td style="padding:8px;font-weight:bold">${data?.start_time || '—'}</td></tr>
            <tr><td style="padding:8px;color:#666">Type</td><td style="padding:8px;font-weight:bold">${data?.session_type || '—'}</td></tr>
            ${data?.meeting_url ? `<tr><td style="padding:8px;color:#666">Meeting Link</td><td style="padding:8px"><a href="${data.meeting_url}" style="color:#2E8B57">Join Session</a></td></tr>` : ''}
          </table>
          <p style="color:#888;font-size:13px">If you need to reschedule, please do so at least 2 hours before the session.</p>
          <p style="color:#2E8B57;font-weight:bold">BreathingPlace Team 💚</p>
        </div>
      `,
    },
    session_cancelled: {
      subject: '❌ Session Cancelled – BreathingPlace',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px">
          <h2 style="color:#dc2626">Session Cancelled</h2>
          <p>Hi <strong>${data?.customer_name || 'there'}</strong>,</p>
          <p>Your session scheduled on <strong>${data?.session_date || '—'}</strong> at <strong>${data?.start_time || '—'}</strong> has been cancelled.</p>
          ${data?.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
          <p>You can book a new session anytime from your dashboard.</p>
          <p style="color:#2E8B57;font-weight:bold">BreathingPlace Team 💚</p>
        </div>
      `,
    },
    therapist_approved: {
      subject: '🎉 Congratulations! Your Profile is Approved – BreathingPlace',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px">
          <h2 style="color:#2E8B57">Welcome to BreathingPlace!</h2>
          <p>Hi <strong>${data?.therapist_name || 'there'}</strong>,</p>
          <p>Your therapist profile has been <strong>approved</strong>. You can now start accepting sessions.</p>
          <p>Log in to your dashboard to set your availability and start helping people.</p>
          <a href="https://breathingplace.in/therapist" style="display:inline-block;margin-top:12px;padding:10px 24px;background:#2E8B57;color:#fff;border-radius:8px;text-decoration:none">Go to Dashboard</a>
          <p style="color:#2E8B57;font-weight:bold;margin-top:24px">BreathingPlace Team 💚</p>
        </div>
      `,
    },
    therapist_rejected: {
      subject: 'BreathingPlace – Application Update',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px">
          <h2 style="color:#dc2626">Application Not Approved</h2>
          <p>Hi <strong>${data?.therapist_name || 'there'}</strong>,</p>
          <p>Unfortunately, your therapist application was not approved at this time.</p>
          ${data?.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
          <p>You are welcome to re-apply after addressing the feedback.</p>
          <p style="color:#2E8B57;font-weight:bold">BreathingPlace Team 💚</p>
        </div>
      `,
    },
    payment_success: {
      subject: '💳 Payment Successful – BreathingPlace',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px">
          <h2 style="color:#2E8B57">Payment Confirmed!</h2>
          <p>Hi <strong>${data?.customer_name || 'there'}</strong>,</p>
          <p>Your payment of <strong>₹${data?.amount || '—'}</strong> has been received.</p>
          <p><strong>Transaction ID:</strong> ${data?.transaction_id || '—'}</p>
          <p style="color:#888;font-size:13px">Keep this for your records.</p>
          <p style="color:#2E8B57;font-weight:bold">BreathingPlace Team 💚</p>
        </div>
      `,
    },
  };

  const template = templates[type];
  if (!template) return Response.json({ error: `Unknown email type: ${type}` }, { status: 400 });

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      subject: template.subject,
      html: template.html,
    }),
  });

  const emailData = await emailRes.json();
  if (!emailRes.ok) return Response.json({ error: emailData.message || 'Email send failed' }, { status: 400 });

  return Response.json({ success: true, email_id: emailData.id });
});