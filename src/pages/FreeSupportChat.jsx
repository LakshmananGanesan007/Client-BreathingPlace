import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Clock, ShieldAlert } from "lucide-react";

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

  useEffect(() => {
    if (!sessionId || !user) return;
    
    // Fetch initial session and messages
    const init = async () => {
      try {
        const sess = await base44.entities.SupportSession.get(sessionId);
        setSession(sess);
        const msgs = await base44.entities.SupportMessage.filter({ session_id: sessionId }, "created_date", 100);
        setMessages(msgs.reverse());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();

    // Subscribe to messages
    const unsubMsgs = base44.entities.SupportMessage.subscribe((event) => {
      if (event.type === "create" && event.data.session_id === sessionId) {
        setMessages(prev => [...prev, event.data]);
      }
    });

    // Subscribe to session updates
    const unsubSession = base44.entities.SupportSession.subscribe((event) => {
      if (event.type === "update" && event.data.id === sessionId) {
        setSession(event.data);
      } else if (event.type === "delete" && event.id === sessionId) {
        setSession(null);
      }
    });

    return () => {
      unsubMsgs();
      unsubSession();
    };
  }, [sessionId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!session?.timer_end_at) return;
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(session.timer_end_at).getTime();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setTimeLeft(`${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
      
      if (diff === 0) clearInterval(interval);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [session?.timer_end_at]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !session || session.status === "completed" || timeLeft === "00:00") return;

    const msg = newMessage.trim();
    setNewMessage("");

    await base44.entities.SupportMessage.create({
      session_id: sessionId,
      sender_id: user.id,
      sender_type: "customer",
      message: msg
    });
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  if (!session) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 text-red-600 flex items-center justify-center rounded-full mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Session Unavailable</h2>
          <p className="text-gray-500 mb-6">
            This support request is no longer available.
          </p>
          <Button onClick={() => navigate("/dashboard")}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  const isPending = session.status === "pending" || session.status === "reviewing";
  const isEnded = session.status === "completed" || session.status === "cancelled" || timeLeft === "00:00";

  if (session.status === "cancelled") {
    return (
      <div className="flex flex-col h-screen bg-gray-50 items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 text-red-600 flex items-center justify-center rounded-full mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Request Cancelled</h2>
          <p className="text-gray-500 mb-6">
            Your support request has been cancelled. Please try again later.
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
              Super Admin is reviewing your information and will reconnect with you shortly. Please wait.
            </p>
          ) : (
            <p className="text-gray-500 mb-6">
              Your request has been sent successfully. Please wait while a Super Admin accepts your session.
            </p>
          )}
          <Button variant="outline" onClick={() => navigate("/dashboard")}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
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
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${isEnded ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'} font-medium text-sm`}>
          <Clock className="w-4 h-4" />
          {timeLeft || "--:--"}
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-center">
          <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">Session Started</span>
        </div>
        {messages.map((m) => {
          const isMe = m.sender_id === user.id;
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMe ? "bg-primary text-white rounded-br-none" : "bg-white border text-gray-800 rounded-bl-none shadow-sm"}`}>
                <p className="text-sm whitespace-pre-wrap">{m.message}</p>
              </div>
            </div>
          );
        })}
        {isEnded && (
          <div className="text-center mt-6">
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium px-4 py-2 rounded-full">
              <ShieldAlert className="w-4 h-4" />
              Your free support session has ended.
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <footer className="bg-white border-t p-4">
        <form onSubmit={handleSend} className="flex items-center gap-2 max-w-4xl mx-auto">
          <Input 
            className="flex-1 rounded-full bg-gray-50 border-gray-200"
            placeholder={isEnded ? "Session has ended" : "Type your message..."}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isEnded}
          />
          <Button type="submit" size="icon" className="rounded-full flex-shrink-0" disabled={!newMessage.trim() || isEnded}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </footer>
    </div>
  );
}