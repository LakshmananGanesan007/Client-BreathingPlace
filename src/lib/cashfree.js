import { supabase } from "./supabaseClient";

const CF_APP_ID = import.meta.env.VITE_CASHFREE_APP_ID;
const CF_SECRET_KEY = import.meta.env.VITE_CASHFREE_SECRET_KEY;

function loadCashfreeSDK() {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) { resolve(window.Cashfree); return; }
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.onload = () => window.Cashfree ? resolve(window.Cashfree) : reject(new Error("Cashfree SDK not loaded"));
    script.onerror = () => reject(new Error("Failed to load Cashfree SDK"));
    document.head.appendChild(script);
  });
}

/**
 * Full Cashfree payment flow:
 * 1. Creates order via Supabase Edge Function (proxies to Cashfree API)
 * 2. Loads Cashfree JS SDK
 * 3. Opens Cashfree checkout (redirect to hosted page)
 */
export async function initiateCashfreePayment({
  orderId,
  amount,
  customerName,
  customerEmail,
  customerPhone,
}) {
  // Step 1: Create order via Supabase Edge Function
  const { data: orderData, error: fnError } = await supabase.functions.invoke("cashfree-order", {
    body: {
      orderId,
      amount: parseFloat(amount),
      customerName: customerName || "Customer",
      customerEmail: customerEmail || "customer@breathingplace.in",
      customerPhone: customerPhone || "9999999999",
      appId: CF_APP_ID,
      secretKey: CF_SECRET_KEY,
    },
  });

  if (fnError || !orderData?.payment_session_id) {
    const msg = orderData?.message || fnError?.message || "Failed to create payment order";
    throw new Error(msg);
  }

  // Step 2: Load Cashfree SDK
  const CashfreeSDK = await loadCashfreeSDK();
  const cashfree = CashfreeSDK({ mode: "production" });

  // Step 3: Open checkout (redirect mode — sends user to Cashfree hosted page)
  const result = await cashfree.checkout({
    paymentSessionId: orderData.payment_session_id,
    returnUrl: `${window.location.origin}/payment-return?order_id=${orderId}`,
  });

  if (result?.error) {
    throw new Error(result.error.message || "Payment failed");
  }

  return result;
}

/**
 * Verify Cashfree payment status via Edge Function (avoids CORS).
 */
export async function verifyCashfreePayment(orderId) {
  try {
    const { data } = await supabase.functions.invoke("cashfree-order", {
      body: { action: "verify", orderId, appId: CF_APP_ID, secretKey: CF_SECRET_KEY },
    });
    return data || null;
  } catch {
    return null;
  }
}
