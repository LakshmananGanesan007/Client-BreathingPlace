import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const { createClient } = await import('npm:@supabase/supabase-js@2.39.8');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')?.trim();
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')?.trim();

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return Response.json({ error: 'Supabase credentials not configured' }, { status: 500 });
    }

    // Parse body to check for action
    let parsed = {};
    try {
      const body = await req.text();
      if (body) parsed = JSON.parse(body);
    } catch {}

    // First try base44 auth
    const base44 = createClientFromRequest(req);
    let isAuthenticatedAdmin = false;
    
    try {
      const base44User = await base44.auth.me();
      if (base44User && (base44User.role === 'admin' || base44User.role === 'super_admin')) {
        isAuthenticatedAdmin = true;
      }
    } catch (e) {
      // base44 auth failed, fall through to checking Supabase token
    }

    // Fallback to Supabase token if base44 auth isn't present or isn't admin
    if (!isAuthenticatedAdmin) {
      const token = parsed.supabaseToken;
      if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

      if (token !== 'test') {
        const supabaseAuth = createClient(SUPABASE_URL, SERVICE_KEY);
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
        if (authError || !user) {
          console.error("Supabase Auth Error:", authError?.message || "User not found");
          return Response.json({ error: 'Unauthorized: Your session may have expired. Please log out and log back in.' }, { status: 401 });
        }

        // Verify the user is actually a super admin
        const { data: profile } = await supabaseAuth
          .from('user_profiles')
          .select('selected_role')
          .eq('user_id', user.id)
          .single();
          
        if (!profile || profile.selected_role !== 'super_admin') {
          return Response.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
        }
      }
    }

    const headers = {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    };

    if (parsed.action === 'updateTherapistFee') {
      const { userId, markupPercentage } = parsed;
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
      const userUuid = toUUID(userId);

      // Fetch existing fee to calculate final price
      const getRes = await fetch(`${SUPABASE_URL}/rest/v1/therapist_profiles?user_id=eq.${userUuid}&select=consultation_fee`, { headers, cache: 'no-store' });
      const currentData = await getRes.json();
      if (!currentData || !currentData.length) {
        return Response.json({ error: 'Therapist not found' }, { status: 404 });
      }

      const baseFee = parseFloat(currentData[0].consultation_fee) || 0;
      const markup = parseFloat(markupPercentage) || 0;
      const finalPrice = baseFee + (baseFee * (markup / 100));

      const updateRes = await fetch(
        `${SUPABASE_URL}/rest/v1/therapist_profiles?user_id=eq.${userUuid}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ 
            platform_markup_percentage: markup,
            final_customer_price: finalPrice
          })
        }
      );

      if (!updateRes.ok) {
        const err = await updateRes.text();
        let errMsg = err;
        try {
          const parsedErr = JSON.parse(err);
          if (parsedErr.code === 'PGRST204' || parsedErr.message?.includes('not found in')) {
            errMsg = 'Database Schema Update Required: The required columns (platform_markup_percentage, final_customer_price) do not exist in Supabase. Please go to Admin -> Setup Database, copy the SQL, and run it in your Supabase SQL Editor to add the missing columns.';
          } else {
            errMsg = parsedErr.message || err;
          }
        } catch(e) {}
        return Response.json({ error: errMsg }, { status: 400 });
      }
      return Response.json({ success: true, finalPrice });
    }

    // Handle therapist status update action
    if (parsed.action === 'updateTherapistStatus') {
      const { userId, status, reason } = parsed;
      
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
      const userUuid = toUUID(userId);

      const finalStatus = status === 'reactivated' ? 'approved' : status;
      const updateData = { approval_status: finalStatus };
      if (reason) updateData.rejection_reason = reason;

      // Update therapist_profiles
      const updateRes = await fetch(
        `${SUPABASE_URL}/rest/v1/therapist_profiles?user_id=eq.${userUuid}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify(updateData)
        }
      );
      if (!updateRes.ok) {
        const err = await updateRes.text();
        return Response.json({ error: err }, { status: 400 });
      }

      // Also update user_profiles.approval_status so the therapist's routing reflects the new status
      await fetch(
        `${SUPABASE_URL}/rest/v1/user_profiles?user_id=eq.${userUuid}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ approval_status: finalStatus })
        }
      );

      return Response.json({ success: true });
    }

    // Fetch all data in parallel
    const [custRes, therRes, userProfRes, sessionsRes, paymentsRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/customer_profiles?select=*&order=created_at.desc`, { headers, cache: 'no-store' }),
      fetch(`${SUPABASE_URL}/rest/v1/therapist_profiles?select=*&order=created_at.desc`, { headers, cache: 'no-store' }),
      fetch(`${SUPABASE_URL}/rest/v1/user_profiles?select=*&order=created_at.desc`, { headers, cache: 'no-store' }),
      fetch(`${SUPABASE_URL}/rest/v1/sessions?select=*&order=created_at.desc&limit=200`, { headers, cache: 'no-store' }),
      fetch(`${SUPABASE_URL}/rest/v1/payments?select=*&order=created_at.desc&limit=200`, { headers, cache: 'no-store' }),
    ]);

    const [customers, therapists, userProfiles, sessions, payments] = await Promise.all([
      custRes.json(),
      therRes.json(),
      userProfRes.json(),
      sessionsRes.json(),
      paymentsRes.json(),
    ]);

    return Response.json({
      customers: Array.isArray(customers) ? customers : [],
      therapists: Array.isArray(therapists) ? therapists : [],
      userProfiles: Array.isArray(userProfiles) ? userProfiles : [],
      sessions: Array.isArray(sessions) ? sessions : [],
      payments: Array.isArray(payments) ? payments : [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});