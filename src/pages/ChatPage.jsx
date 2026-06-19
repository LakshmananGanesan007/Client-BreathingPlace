import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, User, Clock, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import RoleGuard from "@/components/RoleGuard";

function ChatContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("session");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const bottomRef = useRef(null);

  const { data: session } = useQuery({
    queryKey: ["chat-session", sessionId],
    queryFn: async () => {
      const sessions = await base44.entities.Session.filter({ id: sessionId });
      return sessions[0] || null;
    },
    enabled: !!sessionId,
  });

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["chat-messages", sessionId],
    queryFn: () => base44.entities.ChatMessage.filter({ session_id: sessionId }, "created_date", 100),
    enabled: !!sessionId,
    refetchInterval: 3000,
  });

  // Talk Freely 10-min timer
  const isTalkFreely = session?.session_type === "talk_freely";
  useEffect(() => {
    if (!isTalkFreely || !session?.created_date) return;
    const interval = setInterval(() => {
      const elapsed = moment().diff(moment(session.created_date), "seconds");
      const remaining = 600 - elapsed; // 10 minutes
      setTimeLeft(remaining > 0 ? remaining : 0);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTalkFreely, session?.created_date]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || sending) return;
    if (isTalkFreely && timeLeft === 0) return;
    setSending(true);
    await base44.entities.ChatMessage.create({
      session_id: sessionId,
      sender_id: user.id,
      sender_name: user.user_metadata?.full_name || user.email,
      content: message.trim(),
      message_type: "text",
    });
    setMessage("");
    queryClient.invalidateQueries({ queryKey: ["chat-messages", sessionId] });
    setSending(false);
  };

  const formatTime = (secs) => {
    if (secs === null) return "";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const isClosed = isTalkFreely && timeLeft === 0;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">
            {user?.role === "therapist" ? (session?.customer_name || "Client") : (session?.therapist_name || "Therapist")}
          </p>
          <p className="text-xs text-muted-foreground">
            {isTalkFreely ? "Talk Freely Session" : "Premium Session"}
          </p>
        </div>
        {isTalkFreely && timeLeft !== null && (
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${timeLeft < 60 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
            <Clock className="w-3 h-3" /> {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm pt-10">
            <p>No messages yet.</p>
            <p className="text-xs mt-1">Say hello to get started!</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-xs lg:max-w-md rounded-2xl px-4 py-2.5 ${isMe ? "bg-primary text-white rounded-br-sm" : "bg-card border border-border rounded-bl-sm"}`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? "text-white/70 text-right" : "text-muted-foreground"}`}>
                    {moment(msg.created_date).format("h:mm A")}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {isClosed ? (
        <div className="bg-amber-50 border-t border-amber-200 p-4 text-center">
          <p className="text-sm font-semibold text-amber-800">Talk Freely session has ended (10 minutes)</p>
          <p className="text-xs text-amber-600 mt-1">Upgrade to Find Support Premium for unlimited sessions.</p>
          <Button size="sm" className="mt-2" onClick={() => navigate("/find-support")}>Find Support Premium</Button>
        </div>
      ) : (
        <form onSubmit={sendMessage} className="bg-card border-t border-border p-3 flex items-center gap-2">
          <Input
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-full"
            disabled={sending}
          />
          <Button type="submit" size="icon" disabled={!message.trim() || sending} className="rounded-full w-9 h-9 flex-shrink-0">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      )}
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