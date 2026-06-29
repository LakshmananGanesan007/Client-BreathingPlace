import { supabase } from "./supabaseClient";

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;

/**
 * Send email via Resend through Supabase Edge Function.
 * Never throws — email failure should not break the main flow.
 */
export async function sendEmail({ to, subject, html }) {
  try {
    await supabase.functions.invoke("send-email", {
      body: {
        to,
        subject,
        html,
        from: "BreathingPlace <noreply@breathingplace.in>",
        apiKey: RESEND_API_KEY,
      },
    });
  } catch (err) {
    console.warn("Email send failed (non-critical):", err?.message);
  }
}

// ── Email Templates ──────────────────────────────────────────────────────────

export function bookingConfirmedEmail({ customerName, therapistName, sessionDate, sessionTime, sessionType, amount }) {
  return {
    subject: `✅ Session Confirmed — ${sessionType} with ${therapistName}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:32px;border-radius:12px;">
        <h2 style="color:#1a4e3a;margin-bottom:8px;">Session Confirmed!</h2>
        <p style="color:#555;margin-bottom:24px;">Hi ${customerName},</p>
        <div style="background:#fff;border-radius:10px;padding:20px;border:1px solid #e5e7eb;margin-bottom:20px;">
          <p style="margin:0 0 8px 0;"><strong>Therapist:</strong> ${therapistName}</p>
          <p style="margin:0 0 8px 0;"><strong>Session Type:</strong> ${sessionType}</p>
          <p style="margin:0 0 8px 0;"><strong>Date:</strong> ${sessionDate}</p>
          <p style="margin:0 0 8px 0;"><strong>Time:</strong> ${sessionTime}</p>
          <p style="margin:0;"><strong>Amount Paid:</strong> ₹${amount}</p>
        </div>
        <p style="color:#555;">Your therapist will join you at the scheduled time. Please be ready a few minutes early.</p>
        <p style="color:#888;font-size:12px;margin-top:24px;">BreathingPlace · Your mental wellness companion</p>
      </div>
    `,
  };
}

export function sessionReminderEmail({ customerName, therapistName, sessionDate, sessionTime }) {
  return {
    subject: `⏰ Reminder: Session with ${therapistName} starts soon`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:32px;border-radius:12px;">
        <h2 style="color:#1a4e3a;">Session Reminder</h2>
        <p>Hi ${customerName}, your session with <strong>${therapistName}</strong> is scheduled for <strong>${sessionDate} at ${sessionTime}</strong>.</p>
        <p style="color:#555;">Please log in to BreathingPlace a few minutes before the session.</p>
        <p style="color:#888;font-size:12px;margin-top:24px;">BreathingPlace</p>
      </div>
    `,
  };
}
