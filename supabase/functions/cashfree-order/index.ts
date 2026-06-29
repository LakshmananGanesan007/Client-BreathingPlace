import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, orderId, amount, customerName, customerEmail, customerPhone, appId, secretKey } = body;

    const cfAppId = appId || Deno.env.get("CASHFREE_APP_ID") || "";
    const cfSecretKey = secretKey || Deno.env.get("CASHFREE_SECRET_KEY") || "";

    if (!cfAppId || !cfSecretKey) {
      return new Response(JSON.stringify({ error: "Missing Cashfree credentials" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // action=verify — check order payment status
    if (action === "verify") {
      const response = await fetch(`https://api.cashfree.com/pg/orders/${orderId}`, {
        method: "GET",
        headers: {
          "x-api-version": "2023-08-01",
          "x-client-id": cfAppId,
          "x-client-secret": cfSecretKey,
        },
      });
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: response.ok ? 200 : 400,
      });
    }

    // Default action: create order
    const response = await fetch("https://api.cashfree.com/pg/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": cfAppId,
        "x-client-secret": cfSecretKey,
      },
      body: JSON.stringify({
        order_id: String(orderId).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50),
        order_amount: parseFloat(amount),
        order_currency: "INR",
        customer_details: {
          customer_id: String(orderId).slice(0, 50),
          customer_name: customerName || "Customer",
          customer_email: customerEmail || "customer@breathingplace.in",
          customer_phone: customerPhone || "9999999999",
        },
        order_meta: {
          return_url: `https://breathingplace.in/payment-return?order_id=${orderId}&cf_order_id={order_id}`,
          notify_url: `https://breathingplace.in/payment-webhook`,
        },
      }),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: response.ok ? 200 : 400,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
