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

  const { order_amount, order_currency = 'INR', customer_name, customer_email, customer_phone, order_note, session_id } = payload;

  if (!order_amount) return Response.json({ error: 'order_amount is required' }, { status: 400 });

  const appId = Deno.env.get('CASHFREE_APP_ID');
  const secretKey = Deno.env.get('CASHFREE_SECRET_KEY');
  const orderId = `order_${Date.now()}_${user.id.slice(0, 8)}`;

  // Create Cashfree order (production endpoint)
  const res = await fetch('https://api.cashfree.com/pg/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-version': '2023-08-01',
      'x-client-id': appId,
      'x-client-secret': secretKey,
    },
    body: JSON.stringify({
      order_id: orderId,
      order_amount: parseFloat(order_amount),
      order_currency,
      customer_details: {
        customer_id: user.id,
        customer_name: customer_name || user.full_name || 'Customer',
        customer_email: customer_email || user.email,
        customer_phone: customer_phone || '9999999999',
      },
      order_meta: {
        notify_url: '',
      },
      order_note: order_note || 'BreathingPlace Session',
    }),
  });

  const data = await res.json();
  if (!res.ok) return Response.json({ error: data.message || 'Failed to create order' }, { status: 400 });

  // First fetch therapist info to get the fee splits if it's for a therapist session
  let therapistFee = 0;
  let platformFee = 0;

  // We expect payload.therapist_id or we have to lookup the session
  let actualTherapistId = payload.therapist_id;
  if (!actualTherapistId && session_id) {
    const sess = await base44.asServiceRole.entities.Session.filter({ id: session_id });
    if (sess && sess.length > 0) {
      actualTherapistId = sess[0].therapist_id;
    }
  }

  if (actualTherapistId) {
    // Read from Supabase DB to get the latest therapist profile pricing
    const therRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/therapist_profiles?user_id=eq.${actualTherapistId}&select=*`, {
      headers: {
        'apikey': Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
        'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      }
    });
    if (therRes.ok) {
      const thers = await therRes.json();
      if (thers && thers.length > 0) {
        const t = thers[0];
        const baseFee = parseFloat(t.consultation_fee) || 0;
        const markup = parseFloat(t.platform_markup_percentage) || 0;
        therapistFee = baseFee;
        platformFee = baseFee * (markup / 100);
      }
    }
  }

  // Save payment record to entity
  await base44.asServiceRole.entities.Payment.create({
    customer_id: user.id,
    customer_name: customer_name || user.full_name || 'Customer',
    session_id: session_id || '',
    amount: parseFloat(order_amount),
    therapist_fee: therapistFee,
    platform_fee: platformFee,
    currency: order_currency,
    status: 'pending',
    transaction_id: orderId,
    cashfree_order_id: data.order_id,
    payment_date: new Date().toISOString().split('T')[0],
  });

  return Response.json({
    order_id: data.order_id,
    order_token: data.order_token,
    payment_session_id: data.payment_session_id,
    cashfree_order: data,
  });
});