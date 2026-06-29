import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Clock, ShieldAlert, CheckCircle2, User, X } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

// ─── Payment Popup (shown ONLY to customer when free time ends) ──────────────
function PaymentPopup({ config, onPay, onReject }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-7 h-7 text-amber-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Free Session Ended</h2>
        <p className="text-sm text-gray-600 mb-6">
          Your free session has ended. Continue chatting for{" "}
          <strong>{config?.paid_duration_minutes ?? 20} minutes</strong> by paying{" "}
          <strong>₹{config?.paid_amount ?? 149}</strong>.
        </p>
        <div className="space-y-3">
          <Button
            className="w-full bg-primary text-white font-semibold rounded-full"
            onClick={onPay}
          >
            Pay ₹{config?.paid_amount ?? 149} (Cashfree)
          </Button>
          <Button
            variant="outline"
            className="w-full rounded-full text-gray-600 border-gray-300"
            onClick={onReject}
          >
            Reject — End Session
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function FreeSupportChat() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const roleParam = searchParams.get("role");
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const isTherapist = roleParam === "therapist" || userProfile?.selected_role === "therapist";
  const senderType = isTherapist ? "therapist" : "customer";

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState(null);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const messagesEndRef = useRef(null);
  const previousStatus = useRef(null);
  const popupShownRef = useRef(false); // prevent double-trigger

  // ─── Fetch chat config dynamically from platform_settings ─────────────────
  const { data: chatConfig } = useQuery({
    queryKey: ["platform-chat-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_type", "chat_config")
        .maybeSingle();
      return {
        free_minutes_new: 15,
        free_minutes_returning: 10,
        paid_duration_minutes: 20,
        paid_amount: 149,
        ...(data?.setting_value || {}),
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  // ─── Initial data fetch + realtime subscriptions ──────────────────────────
  useEffect(() => {
    if (!sessionId || !user) return;
    let isMounted = true;

    const fetchSessionData = async () => {
      try {
        const { data: sessData } = await supabase
          .from("support_sessions")
          .select("*")
          .eq("id", sessionId)
          .single();
        if (sessData && isMounted) {
          setSession(sessData);
          previousStatus.current = sessData.status;
          // If page reloaded while already paused, show popup immediately for customer
          if (sessData.status === "paused" && !isTherapist) {
            setShowPaymentPopup(true);
            popupShownRef.current = true;
          }
        }

        const { data: msgsData } = await supabase
          .from("support_messages")
          .select("*")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true })
          .limit(200);
        if (msgsData && isMounted) setMessages(msgsData);
      } catch (err) {
        toast.error("❌ Failed to connect to chat database.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSessionData();

    const msgChannel = supabase
      .channel(`chat_messages_${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.find((m) => m.id === payload.new.id)) return prev;
            const isOptimisticDuplicate =
              payload.new.sender_id === user.id &&
              prev.find(
                (m) =>
                  m.message === payload.new.message &&
                  String(m.id).startsWith("temp-")
              );
            if (isOptimisticDuplicate) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    const sessionChannel = supabase
      .channel(`chat_session_${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "support_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          setSession(payload.new);
          // When session becomes paused, show popup to customer only
          if (
            payload.new.status === "paused" &&
            !isTherapist &&
            !popupShownRef.current
          ) {
            setShowPaymentPopup(true);
            popupShownRef.current = true;
          }
          // When session resumes (paid), hide popup and reset flag
          if (payload.new.status === "active" && popupShownRef.current) {
            setShowPaymentPopup(false);
            popupShownRef.current = false;
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "support_sessions",
          filter: `id=eq.${sessionId}`,
        },
        () => setSession(null)
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(sessionChannel);
    };
  }, [sessionId, user, isTherapist]);

  // ─── Status transition notifications ──────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    if (previousStatus.current !== session.status) {
      if (
        (previousStatus.current === "pending" ||
          previousStatus.current === "reviewing") &&
        session.status === "active"
      ) {
        toast.success(
          "✅ Your Talk Freely request has been accepted. Your chat session is now live."
        );
      } else if (
        previousStatus.current === "pending" &&
        session.status === "reviewing"
      ) {
        toast.info(
          "ℹ The therapist is reviewing your request. Please wait while your details are being reviewed."
        );
      } else if (
        session.status === "cancelled" &&
        previousStatus.current !== "cancelled"
      ) {
        toast.error(
          "❌ Your Talk Freely request was not approved at this time."
        );
      } else if (
        session.status === "completed" &&
        previousStatus.current === "active"
      ) {
        toast.warning("⚠ Session completed.");
      }
      previousStatus.current = session.status;
    }
  }, [session?.status]);

  // ─── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Timer with auto-pause — reads duration from DB config ────────────────
  useEffect(() => {
    if (!session?.timer_end_at || session.status !== "active" || session.is_paused)
      return;

    const interval = setInterval(async () => {
      const now = new Date().getTime();
      const end = new Date(session.timer_end_at).getTime();
      const diff = end - now;

      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeft("00:00");

        // Pause session in DB — both sides stop sending
        const { error } = await supabase
          .from("support_sessions")
          .update({ is_paused: true, status: "paused" })
          .eq("id", sessionId);

        if (!error && !isTherapist && !popupShownRef.current) {
          setShowPaymentPopup(true);
          popupShownRef.current = true;
        }
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(
          `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.timer_end_at, session?.status, session?.is_paused, isTherapist, sessionId]);

  // ─── Payment handler ───────────────────────────────────────────────────────
  const handlePayment = async () => {
    // TODO: Integrate Cashfree SDK here.
    // On successful payment callback, call resumeAfterPayment().
    // For now, simulating success immediately:
    toast.info("Redirecting to Cashfree payment...");
    await resumeAfterPayment();
  };

  const resumeAfterPayment = async () => {
    const paidMinutes =
      chatConfig?.paid_duration_minutes ?? 20;
    const newTimerEnd = new Date();
    newTimerEnd.setMinutes(newTimerEnd.getMinutes() + paidMinutes);

    const { error } = await supabase
      .from("support_sessions")
      .update({
        status: "active",
        is_paused: false,
        timer_end_at: newTimerEnd.toISOString(),
        session_phase: "paid", // track that this is now a paid extension
      })
      .eq("id", sessionId);

    if (!error) {
      setShowPaymentPopup(false);
      popupShownRef.current = false;
      toast.success("✅ Payment successful! Chat resumed.");

      // Notify therapist via a system message
      await supabase.from("support_messages").insert({
        session_id: sessionId,
        sender_id: user.id,
        sender_type: "system",
        message: `ℹ️ The customer has paid ₹${chatConfig?.paid_amount ?? 149} and resumed the session for ${paidMinutes} more minutes.`,
      });
    } else {
      toast.error("Payment update failed. Please try again.");
    }
  };

  // ─── Reject handler — ends session, notifies therapist ────────────────────
  const handleReject = async () => {
    setShowPaymentPopup(false);

    const { error } = await supabase
      .from("support_sessions")
      .update({ status: "completed", is_paused: false })
      .eq("id", sessionId);

    if (!error) {
      // Notify therapist via system message
      await supabase.from("support_messages").insert({
        session_id: sessionId,
        sender_id: user.id,
        sender_type: "system",
        message:
          "ℹ️ The customer has ended the session. Please continue with the next customer.",
      });
      toast.info("Session ended.");
      navigate("/dashboard");
    } else {
      toast.error("Failed to end session. Please try again.");
    }
  };

  // ─── Send message (blocked when paused or not active) ─────────────────────
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !session) return;
    // Block both customer and therapist from sending when paused/not active
    if (session.status !== "active" || session.is_paused) return;

    const msgText = newMessage.trim();
    setNewMessage("");

    const tempId = `temp-${Date.now()}`;
    const tempMsg = {
      id: tempId,
      session_id: sessionId,
      sender_id: user.id,
      sender_type: senderType,
      message: msgText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const { data, error } = await supabase
        .from("support_messages")
        .insert({
          session_id: sessionId,
          sender_id: user.id,
          sender_type: senderType,
          message: msgText,
        })
        .select()
        .single();

      if (error) throw error;
      setMessages((prev) => prev.map((m) => (m.id === tempId ? data : m)));
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error("❌ Failed to send message. Connection lost.");
    }
  };

  // ─── Derived state ────────────────────────────────────────────────────────
  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  if (!session) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 text-red-600 flex items-center justify-center rounded-full mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Session Unavailable</h2>
          <p className="text-gray-500 mb-6">This support request is no longer available.</p>
          <Button onClick={() => navigate(isTherapist ? "/therapist" : "/dashboard")}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isPending = session.status === "pending" || session.status === "reviewing";
  const isCancelled = session.status === "cancelled";
  const isCompleted = session.status === "completed";
  const isActive = session.status === "active";
  const isPaused = session.status === "paused" || session.is_paused;
  // Message input is enabled only when active AND not paused
  const canSend = isActive && !isPaused;

  if (isCancelled) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 text-red-600 flex items-center justify-center rounded-full mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Request Declined</h2>
          <p className="text-gray-500 mb-6">
            ❌ Your Talk Freely request was not approved at this time.
          </p>
          <Button onClick={() => navigate("/dashboard")}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  if (isPending) {
    if (isTherapist) {
      return (
        <div className="flex flex-col h-screen bg-gray-50 items-center justify-center p-6 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full">
            <div className="w-16 h-16 bg-primary/10 text-primary flex items-center justify-center rounded-full mx-auto mb-4">
              <User className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Session Waiting for Approval</h2>
            <p className="text-gray-500 mb-2">Customer: <strong>{session.customer_name || "—"}</strong></p>
            <p className="text-gray-500 mb-6">Session Type: <strong>{session.session_type}</strong></p>
            <Button onClick={() => navigate("/therapist")} variant="outline">Return to Dashboard</Button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col h-screen bg-gray-50 items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full">
          <div className="w-16 h-16 bg-primary/10 text-primary flex items-center justify-center rounded-full mx-auto mb-4">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Waiting for Support</h2>
          {session.status === "reviewing" ? (
            <p className="text-gray-500 mb-6 font-medium text-primary">
              ℹ The therapist is reviewing your request. Please be ready.
            </p>
          ) : (
            <p className="text-gray-500 mb-6">
              ✅ Request submitted. Your assigned therapist will accept your session shortly.
            </p>
          )}
          <Button variant="outline" onClick={() => navigate("/dashboard")}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Payment popup — customer only, when session is paused */}
      {showPaymentPopup && !isTherapist && (
        <PaymentPopup
          config={chatConfig}
          onPay={handlePayment}
          onReject={handleReject}
        />
      )}

      <div className="flex flex-col h-screen bg-gray-50">
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(isTherapist ? "/therapist" : "/dashboard")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-gray-900">Free Emotional Support</h1>
              <p className="text-xs text-gray-500">
                {isTherapist
                  ? `Customer: ${session?.customer_name || "—"}`
                  : "Supported by your therapist"}
              </p>
            </div>
          </div>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium text-sm ${
              isCompleted
                ? "bg-gray-100 text-gray-700"
                : isPaused
                ? "bg-amber-100 text-amber-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            <Clock className="w-4 h-4" />
            {isCompleted ? "Ended" : isPaused ? "Paused" : timeLeft || "--:--"}
          </div>
        </header>

        {/* Paused banner — visible to BOTH sides */}
        {isPaused && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs font-medium text-amber-800">
            {isTherapist
              ? "⏸ Session is paused. Waiting for customer to complete payment."
              : "⏸ Session paused. Please complete payment to continue."}
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="text-center">
            <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
              Session Started
            </span>
          </div>

          {messages.length === 0 && isCompleted && (
            <div className="text-center text-gray-400 text-sm mt-10">
              Chat messages have been permanently deleted by the administrator.
            </div>
          )}

          {messages.map((m) => {
            // System messages rendered as centred banners
            if (m.sender_type === "system") {
              return (
                <div key={m.id} className="text-center">
                  <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-3 py-1.5 rounded-full inline-block">
                    {m.message}
                  </span>
                </div>
              );
            }
            const isMe = m.sender_id === user.id;
            return (
              <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    isMe
                      ? "bg-primary text-white rounded-br-none"
                      : "bg-white border text-gray-800 rounded-bl-none shadow-sm"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                  <p
                    className={`text-[9px] mt-1 text-right ${
                      isMe ? "text-primary-foreground/70" : "text-gray-400"
                    }`}
                  >
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}

          {isCompleted && (
            <div className="text-center mt-6 pb-4">
              <div className="inline-flex items-center gap-2 bg-gray-100 border border-gray-200 text-gray-700 text-xs font-medium px-4 py-2 rounded-full">
                <CheckCircle2 className="w-4 h-4" />
                Chat session completed. Read-only mode.
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>

        {/* Footer — hidden when completed or paused */}
        {canSend && (
          <footer className="bg-white border-t p-4">
            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 max-w-4xl mx-auto"
            >
              <Input
                className="flex-1 rounded-full bg-gray-50 border-gray-200 focus-visible:ring-primary"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <Button
                type="submit"
                size="icon"
                className="rounded-full flex-shrink-0 bg-primary hover:bg-primary/90"
                disabled={!newMessage.trim()}
              >
                <Send className="w-4 h-4 text-white" />
              </Button>
            </form>
          </footer>
        )}
      </div>
    </>
  );
}