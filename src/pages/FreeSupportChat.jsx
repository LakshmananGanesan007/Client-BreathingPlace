import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Clock, ShieldAlert, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function FreeSupportChat() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState(null);
  const messagesEndRef = useRef(null);
  const previousStatus = useRef(null);

  useEffect(() => {
    if (!sessionId || !user) return;
    
    let isMounted = true;
    
    const fetchSessionData = async () => {
      try {
        const { data: sessData } = await supabase.from('support_sessions').select('*').eq('id', sessionId).single();
        if (sessData && isMounted) {
          setSession(sessData);
          previousStatus.current = sessData.status;
        }

        const { data: msgsData } = await supabase.from('support_messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true }).limit(200);
        if (msgsData && isMounted) setMessages(msgsData);
      } catch (err) {
        toast.error("❌ Failed to connect to chat database.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSessionData();

    // 1. Bulletproof Realtime Channel for Messages
    const msgChannel = supabase.channel(`chat_messages_${sessionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `session_id=eq.${sessionId}` }, (payload) => {
        setMessages(prev => {
          // Prevent duplicates (especially from optimistic updates)
          if (prev.find(m => m.id === payload.new.id)) return prev;
          
          // Prevent duplicate if we already optimistically added it locally before DB assigned an ID
          const isOptimisticDuplicate = payload.new.sender_id === user.id && 
            prev.find(m => m.message === payload.new.message && String(m.id).startsWith('temp-'));
            
          if (isOptimisticDuplicate) return prev;
          
          return [...prev, payload.new];
        });
      }).subscribe();

    // 2. Realtime Channel for Session Status
    const sessionChannel = supabase.channel(`chat_session_${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_sessions', filter: `id=eq.${sessionId}` }, (payload) => {
        setSession(payload.new);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'support_sessions', filter: `id=eq.${sessionId}` }, () => {
        setSession(null);
      }).subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(sessionChannel);
    };
  }, [sessionId, user]);

  // Status Transition Notifications
  useEffect(() => {
    if (!session) return;
    if (previousStatus.current !== session.status) {
      if ((previousStatus.current === 'pending' || previousStatus.current === 'reviewing') && session.status === 'active') {
         toast.success("✅ Your Talk Freely request has been accepted. Your chat session is now live.");
      } else if (previousStatus.current === 'pending' && session.status === 'reviewing') {
         toast.info("ℹ The Super Admin is reviewing your request. Please wait while your details are being reviewed.");
      } else if (session.status === 'cancelled' && previousStatus.current !== 'cancelled') {
         toast.error("❌ Your Talk Freely request was not approved at this time. Please explore our Find Support options for professional assistance.");
      } else if (session.status === 'completed' && previousStatus.current === 'active') {
         toast.warning("⚠ Super Admin ended the chat. Session completed.");
      }
      previousStatus.current = session.status;
    }
  }, [session?.status]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Soft Timer Logic (No longer forces chat closure)
  useEffect(() => {
    if (!session?.timer_end_at || session.status !== "active") return;
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(session.timer_end_at).getTime();
      const diff = Math.floor((end - now) / 1000);
      
      if (diff <= 0) {
        setTimeLeft("00:00");
        clearInterval(interval);
      } else {
        const m = Math.floor(diff / 60);
        const s = diff % 60;
        setTimeLeft(`${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [session?.timer_end_at, session?.status]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !session || session.status !== "active") return;

    const msgText = newMessage.trim();
    setNewMessage("");

    // Optimistic UI Update: Instant WhatsApp-like feel
    const tempId = `temp-${Date.now()}`;
    const tempMsg = {
      id: tempId,
      session_id: sessionId,
      sender_id: user.id,
      sender_type: "customer",
      message: msgText,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, tempMsg]);

    try {
      const { data, error } = await supabase.from('support_messages').insert({
        session_id: sessionId,
        sender_id: user.id,
        sender_type: "customer",
        message: msgText
      }).select().single();
      
      if (error) throw error;
      
      // Swap temp ID with real database ID
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));
    } catch (err) {
      // Revert optimistic update on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast.error("❌ Failed to send message. Connection lost.");
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

  if (!session) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 text-red-600 flex items-center justify-center rounded-full mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Session Unavailable</h2>
          <p className="text-gray-500 mb-6">This support request is no longer available.</p>
          <Button onClick={() => navigate("/dashboard")}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  const isPending = session.status === "pending" || session.status === "reviewing";
  const isCancelled = session.status === "cancelled";
  const isCompleted = session.status === "completed";
  const isActive = session.status === "active";

  if (isCancelled) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 text-red-600 flex items-center justify-center rounded-full mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Request Declined</h2>
          <p className="text-gray-500 mb-6">
            ❌ Your Talk Freely request was not approved at this time. Please explore our Find Support options for professional assistance.
          </p>
          <Button onClick={() => navigate("/dashboard")}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full">
          <div className="w-16 h-16 bg-primary/10 text-primary flex items-center justify-center rounded-full mx-auto mb-4">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Waiting for Support</h2>
          {session.status === "reviewing" ? (
            <p className="text-gray-500 mb-6 font-medium text-primary">
              ℹ The Super Admin is reviewing your request. Please wait while your details are being reviewed.
            </p>
          ) : (
            <p className="text-gray-500 mb-6">
              ✅ Request submitted successfully. Please wait while a Super Admin accepts your session.
            </p>
          )}
          <Button variant="outline" onClick={() => navigate("/dashboard")}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-gray-900">Free Emotional Support</h1>
            <p className="text-xs text-gray-500">Supported by Super Admin</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${isCompleted ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'} font-medium text-sm`}>
          <Clock className="w-4 h-4" />
          {isCompleted ? "Ended" : (timeLeft || "--:--")}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-center">
          <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">Session Started</span>
        </div>
        
        {messages.length === 0 && isCompleted && (
          <div className="text-center text-gray-400 text-sm mt-10">Chat messages have been permanently deleted by the administrator.</div>
        )}

        {messages.map((m) => {
          const isMe = m.sender_id === user.id;
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMe ? "bg-primary text-white rounded-br-none" : "bg-white border text-gray-800 rounded-bl-none shadow-sm"}`}>
                <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                <p className={`text-[9px] mt-1 text-right ${isMe ? "text-primary-foreground/70" : "text-gray-400"}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

      {isActive && (
        <footer className="bg-white border-t p-4">
          <form onSubmit={handleSend} className="flex items-center gap-2 max-w-4xl mx-auto">
            <Input 
              className="flex-1 rounded-full bg-gray-50 border-gray-200 focus-visible:ring-primary"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={!isActive}
            />
            <Button type="submit" size="icon" className="rounded-full flex-shrink-0 bg-primary hover:bg-primary/90" disabled={!newMessage.trim() || !isActive}>
              <Send className="w-4 h-4 text-white" />
            </Button>
          </form>
        </footer>
      )}
    </div>
  );
}