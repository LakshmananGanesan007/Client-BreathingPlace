import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Send, User, Clock, Loader2, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import RoleGuard from "@/components/RoleGuard";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { initiateCashfreePayment } from "@/lib/cashfree";
import SessionFeedbackDialog from "@/components/SessionFeedbackDialog";

function ChatContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("session");
  
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const bottomRef = useRef(null);

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
        paid_amount: 150,
        therapist_revenue_percent: 73,
        ...((data?.setting_value) || {}),
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: session } = useQuery({
    queryKey: ["premium-chat-session", sessionId],
    queryFn: async () => {
      const { data } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();
      return data || null;
    },
    enabled: !!sessionId,
  });

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["chat-messages", sessionId],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(200);
      return data || [];
    },
    enabled: !!sessionId,
    refetchInterval: 2000,
  });

  // Calculate if returning customer
  const { data: previousSessions } = useQuery({
    queryKey: ["previous-therapist-sessions", session?.customer_id, session?.therapist_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('sessions')
        .select('id')
        .eq('customer_id', session.customer_id)
        .eq('therapist_id', session.therapist_id)
        .neq('id', session.id);
      return data || [];
    },
    enabled: !!session,
  });

  // Fetch Paid Extensions for this session
  const { data: paidExtensions = [] } = useQuery({
    queryKey: ["session-chat-payments", sessionId],
    queryFn: async () => {
      const { data } = await supabase.from('payments').select('*').eq('session_id', sessionId).eq('payment_method', 'CHAT_EXTENSION');
      return data || [];
    },
    enabled: !!sessionId,
    refetchInterval: 5000,
  });

  const isCustomer = user?.role === "customer";
  const isFirstTime = previousSessions?.length === 0;

  // Dynamic config from platform_settings (fallback to safe defaults)
  const freeMinutes = isFirstTime
    ? (chatConfig?.free_minutes_new ?? 15)
    : (chatConfig?.free_minutes_returning ?? 10);
  const paidDurationMinutes = chatConfig?.paid_duration_minutes ?? 20;
  const paidAmount = chatConfig?.paid_amount ?? 150;

  // Base Free Time (from admin config)
  const baseFreeTimeSeconds = freeMinutes * 60;
  // Extra Time: paid_duration per extension
  const extraPaidTimeSeconds = (paidExtensions.length || 0) * (paidDurationMinutes * 60);
  const totalAllowedTimeSeconds = baseFreeTimeSeconds + extraPaidTimeSeconds;

  useEffect(() => {
    if (!session?.created_date) return;
    
    const interval = setInterval(() => {
      const elapsed = moment().diff(moment(session.created_date), "seconds");
      const remaining = totalAllowedTimeSeconds - elapsed;
      
      if (remaining <= 0) {
        setTimeLeft(0);
        clearInterval(interval);
        // Only trigger popup automatically for the customer
        if (isCustomer && !showPaymentPopup) {
           setShowPaymentPopup(true);
        }
      } else {
        setTimeLeft(remaining);
        if (showPaymentPopup && remaining > 0) setShowPaymentPopup(false); // Hide if payment went through
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [totalAllowedTimeSeconds, session?.created_date, isCustomer, showPaymentPopup]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleExtensionPayment = async () => {
    setIsProcessingPayment(true);
    const orderId = `CHAT_EXT_${user.id.slice(0, 8)}_${Date.now()}`;
    try {
      // Real Cashfree payment for chat extension
      await initiateCashfreePayment({
        orderId,
        amount: paidAmount,
        customerName: user.user_metadata?.full_name || "Customer",
        customerEmail: user.email || "customer@breathingplace.in",
        customerPhone: "9999999999",
      });

      // Record payment after successful checkout
      await supabase.from("payments").insert({
        session_id: session.id,
        customer_id: user.id,
        customer_name: user.user_metadata?.full_name || user.email,
        therapist_id: session.therapist_id,
        therapist_name: session.therapist_name,
        amount: paidAmount,
        status: "completed",
        payment_method: "CHAT_EXTENSION",
        transaction_id: orderId,
        payment_date: new Date().toISOString(),
      });

      queryClient.invalidateQueries({ queryKey: ["session-chat-payments"] });
      setShowPaymentPopup(false);
      toast.success(`Payment successful! ${paidDurationMinutes} minutes added.`);
    } catch (err) {
      toast.error(err.message || "Payment failed. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleEndSession = () => {
    setShowPaymentPopup(false);
    if (isCustomer) setShowFeedback(true);
    else navigate(-1);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || sending) return;
    if (timeLeft === 0) {
       if (isCustomer) setShowPaymentPopup(true);
       return;
    }

    setSending(true);
    await supabase.from("chat_messages").insert({
      session_id: sessionId,
      sender_id: user.id,
      sender_name: user.user_metadata?.full_name || user.email,
      content: message.trim(),
      message_type: "text",
      created_at: new Date().toISOString(),
    });
    setMessage("");
    queryClient.invalidateQueries({ queryKey: ["chat-messages", sessionId] });
    setSending(false);
  };

  const formatTime = (secs) => {
    if (secs === null) return "--:--";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const isClosed = timeLeft === 0;

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm z-10">
        <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <User className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm text-slate-900">
            {user?.role === "therapist" ? session?.customer_name : session?.therapist_name}
          </p>
          <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">
            Premium Chat
          </p>
        </div>
        {timeLeft !== null && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${timeLeft < 300 ? "bg-red-50 text-red-700 border-red-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
            <Clock className="w-4 h-4" /> {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center text-slate-500 text-sm pt-10">
            <p className="font-semibold text-slate-700 mb-1">Your secure chat is ready.</p>
            <p className="text-xs">Messages are end-to-end encrypted.</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] lg:max-w-md rounded-2xl px-4 py-3 shadow-sm ${isMe ? "bg-blue-600 text-white rounded-br-sm" : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"}`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-[10px] mt-1.5 font-medium ${isMe ? "text-blue-200 text-right" : "text-slate-400"}`}>
                    {moment(msg.created_at || msg.created_date).format("h:mm A")}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input / Closed State */}
      {isClosed ? (
        <div className="bg-red-50 border-t border-red-100 p-5 text-center">
          <p className="text-sm font-bold text-red-900 mb-1">Session Time Ended</p>
          {isCustomer ? (
            <>
              <p className="text-xs text-red-700 mb-3">Your free session period has concluded.</p>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white font-bold shadow-md" onClick={() => setShowPaymentPopup(true)}>Pay to Continue Chatting</Button>
            </>
          ) : (
            <p className="text-xs text-red-700">Waiting for the customer to extend the session.</p>
          )}
        </div>
      ) : (
        <form onSubmit={sendMessage} className="bg-white border-t border-slate-200 p-3 sm:p-4 flex items-center gap-3">
          <Input
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Write your message safely here..."
            className="flex-1 rounded-xl h-12 bg-slate-50 border-slate-200 focus:ring-blue-600 text-sm"
            disabled={sending}
          />
          <Button type="submit" size="icon" disabled={!message.trim() || sending} className="rounded-xl w-12 h-12 flex-shrink-0 bg-blue-600 hover:bg-blue-700 shadow-md">
            {sending ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Send className="w-5 h-5 text-white" />}
          </Button>
        </form>
      )}

      {/* Extension Payment Modal */}
      <Dialog open={showPaymentPopup} onOpenChange={setShowPaymentPopup}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-center">
              {paidExtensions.length === 0 ? "Continue Your Session" : "Extend for Another Block"}
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              {paidExtensions.length === 0
                ? <>Your free {freeMinutes}-minute chat session has ended. To continue chatting for the next <strong>{paidDurationMinutes} minutes</strong>, please complete payment.</>
                : <>Your {paidDurationMinutes}-minute session has ended. Would you like to continue for another <strong>{paidDurationMinutes} minutes</strong>?</>
              }
            </DialogDescription>
          </DialogHeader>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center my-4">
            <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">Session Fee</p>
            <p className="text-3xl font-black text-blue-900">₹{paidAmount}</p>
            <p className="text-xs text-blue-600 mt-1">{paidDurationMinutes} minutes of chat time</p>
          </div>
          <Button className="w-full h-12 rounded-xl bg-blue-600 text-white font-bold text-base shadow-lg gap-2" onClick={handleExtensionPayment} disabled={isProcessingPayment}>
            {isProcessingPayment ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : <><CreditCard className="w-5 h-5" /> Pay ₹{paidAmount} via Cashfree</>}
          </Button>
          <Button variant="ghost" className="w-full mt-2 text-slate-500 font-semibold" onClick={handleEndSession}>End Session & Leave Feedback</Button>
        </DialogContent>
      </Dialog>

      {/* Feedback after session ends */}
      <SessionFeedbackDialog
        open={showFeedback}
        onClose={() => { setShowFeedback(false); navigate(-1); }}
        session={session}
        customerId={user?.id}
        therapistId={session?.therapist_id}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <RoleGuard allowedRoles={["customer", "therapist", "admin", "super_admin"]}>
      <ChatContent />
    </RoleGuard>
  );
}