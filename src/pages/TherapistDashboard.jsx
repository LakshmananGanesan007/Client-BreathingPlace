import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import RoleGuard from "@/components/RoleGuard";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import { DashboardSkeleton } from "@/components/SkeletonLoader";
import TherapistApprovalCongrats from "@/components/TherapistApprovalCongrats";
import { Users, Calendar, Clock, AlertCircle, CheckCircle, FileText, ArrowRight, Bell, User, MessageSquare, Send, RefreshCw, Edit3, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import moment from "moment";
import { toast } from "sonner";

const CONGRATS_KEY = "therapist_congrats_shown";

function DashboardContent() {
  const { user, userProfile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showCongrats, setShowCongrats] = useState(false);

  // Pre-Approval Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [newChatMsg, setNewChatMsg] = useState("");
  const chatEndRef = useRef(null);

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["therapist-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('therapist_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    },
    enabled: !!user?.id,
  });

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ["therapist-sessions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('therapist_id', user.id)
        .order('session_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Realtime Booking Notifications
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel('therapist_sessions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `therapist_id=eq.${user.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          toast.success(`New session booked on ${moment(payload.new.session_date).format("MMM D")}.`, { duration: 5000 });
        }
        queryClient.invalidateQueries({ queryKey: ["therapist-sessions", user.id] });
      }).subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  // Pre-Approval Realtime Chat System
  useEffect(() => {
    if (!user?.id || profile?.approval_status === "approved") return;
    let isMounted = true;

    const fetchChat = async () => {
      const { data } = await supabase.from('application_chats').select('*').eq('therapist_id', user.id).order('created_at', { ascending: true });
      if (isMounted && data) setChatMessages(data);
    };

    fetchChat();

    const channel = supabase.channel(`app_chat_therapist_${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'application_chats', filter: `therapist_id=eq.${user.id}` }, (payload) => {
        setChatMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      }).subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id, profile?.approval_status]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!newChatMsg.trim() || !user) return;

    const msg = newChatMsg.trim();
    setNewChatMsg("");

    try {
      await supabase.from('application_chats').insert({
        therapist_id: user.id,
        sender_id: user.id,
        sender_type: "therapist",
        message: msg
      });
    } catch (err) {
      toast.error("Failed to send message.");
    }
  };

  useEffect(() => {
    if (profile?.approval_status === "approved") {
      const alreadyShown = localStorage.getItem(CONGRATS_KEY + "_" + user?.id);
      if (!alreadyShown) {
        setShowCongrats(true);
      }
    }
  }, [profile?.approval_status, user?.id]);

  const handleDismissCongrats = () => {
    setShowCongrats(false);
    localStorage.setItem(CONGRATS_KEY + "_" + user?.id, "true");
  };

  if (loadingProfile) {
    return <DashboardSkeleton />;
  }

  const approvalStatus = profile?.approval_status;
  // FIX: Include "reactivated" so it doesn't cause a blank screen
  const isPending = approvalStatus === "pending" || approvalStatus === "changes_requested" || approvalStatus === "reactivated";
  const isRejectedOrSuspended = approvalStatus === "rejected" || approvalStatus === "suspended";
  
  // Show the chat negotiation panel if pending, rejected, suspended, or reactivated
  const showNegotiationPanel = isPending || isRejectedOrSuspended;
  
  const upcomingSessions = sessions.filter(s =>
    s.status === "scheduled" && moment(s.session_date).isSameOrAfter(moment(), "day")
  );
  const completedSessions = sessions.filter(s => s.status === "completed");
  const uniqueClients = new Set(sessions.map(s => s.customer_id)).size;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      {showCongrats && <TherapistApprovalCongrats onDismiss={handleDismissCongrats} />}

      {/* Setup Profile Banner */}
      {(!profile && userProfile?.profile_status !== "completed") && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-5 flex items-start gap-3 shadow-sm">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900">Set up your therapist profile</p>
            <p className="text-xs text-blue-700 mt-0.5">Complete your credentials, pricing, and availability to get approved and start accepting clients.</p>
          </div>
          <Link to="/join-support">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">Set Up Profile</Button>
          </Link>
        </div>
      )}

      {/* Approved Banner */}
      {((profile && approvalStatus === "approved") || (!profile && userProfile?.approval_status === "approved")) && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-5 flex items-start gap-3 shadow-sm">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-900">Your application is approved</p>
            <p className="text-xs text-green-700 mt-0.5">Your profile is active and you can now be assigned to customers. Your requested base pricing is locked.</p>
          </div>
        </div>
      )}

      {/* Pending / Rejected / Suspended Layout */}
      {profile && showNegotiationPanel && (
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Status Panel */}
          <div className="w-full md:w-1/2 flex flex-col gap-4">
            <div className={`rounded-xl border p-6 shadow-sm ${
              (approvalStatus === "changes_requested" || approvalStatus === "reactivated") ? "bg-blue-50 border-blue-200" : 
              isRejectedOrSuspended ? "bg-red-50 border-red-200" :
              "bg-amber-50 border-amber-200"
            }`}>
              <div className="flex items-center gap-3 mb-3">
                {(approvalStatus === "changes_requested" || approvalStatus === "reactivated") ? <Edit3 className="w-6 h-6 text-blue-600" /> : 
                 isRejectedOrSuspended ? <AlertCircle className="w-6 h-6 text-red-600" /> :
                 <Clock className="w-6 h-6 text-amber-600" />}
                
                <h2 className={`font-display text-xl font-bold ${
                  (approvalStatus === "changes_requested" || approvalStatus === "reactivated") ? "text-blue-900" : 
                  isRejectedOrSuspended ? "text-red-900" :
                  "text-amber-900"
                }`}>
                  {approvalStatus === "changes_requested" ? "Changes Requested" : 
                   approvalStatus === "reactivated" ? "Account Reactivated" :
                   approvalStatus === "rejected" ? "Application Rejected" :
                   approvalStatus === "suspended" ? "Account Suspended" :
                   "Application Under Review"}
                </h2>
              </div>
              
              <p className={`text-sm mb-5 ${
                (approvalStatus === "changes_requested" || approvalStatus === "reactivated") ? "text-blue-800" : 
                isRejectedOrSuspended ? "text-red-800" :
                "text-amber-800"
              }`}>
                {(approvalStatus === "changes_requested" || approvalStatus === "reactivated") ? "The Super Admin has requested changes or reactivated your account. Please check the chat, update your details, and resubmit." : 
                 approvalStatus === "rejected" ? `Your application was not approved. Reason: ${profile.rejection_reason || "Check chat for details."}` :
                 approvalStatus === "suspended" ? "Your therapist account has been suspended by the administrator. Please use the chat to contact support." :
                 "Your application is currently being reviewed by our Super Admin team. You can discuss your requested base pricing using the chat panel."}
              </p>
              
              <Button 
                onClick={() => navigate("/join-support")} 
                className={`w-full gap-2 shadow-sm ${(approvalStatus === "changes_requested" || approvalStatus === "reactivated") ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"}`}
                variant={(approvalStatus === "changes_requested" || approvalStatus === "reactivated") ? "default" : "outline"}
              >
                {(approvalStatus === "changes_requested" || approvalStatus === "reactivated") ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {(approvalStatus === "changes_requested" || approvalStatus === "reactivated") ? "Edit Profile & Resubmit" : "View Submitted Application"}
              </Button>
            </div>

            {/* Requested Pricing Overview */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-semibold text-sm text-gray-800 mb-4 uppercase tracking-wider">Your Requested Pricing</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-primary/5 rounded-lg p-3 text-center border border-primary/10">
                  <p className="text-[10px] text-gray-500 uppercase font-medium">Chat</p>
                  <p className="font-bold text-gray-900 mt-1">{profile.currency || "₹"}{profile.chat_price || 0}</p>
                </div>
                <div className="bg-primary/5 rounded-lg p-3 text-center border border-primary/10">
                  <p className="text-[10px] text-gray-500 uppercase font-medium">Voice</p>
                  <p className="font-bold text-gray-900 mt-1">{profile.currency || "₹"}{profile.voice_price || 0}</p>
                </div>
                <div className="bg-primary/5 rounded-lg p-3 text-center border border-primary/10">
                  <p className="text-[10px] text-gray-500 uppercase font-medium">Video</p>
                  <p className="font-bold text-gray-900 mt-1">{profile.currency || "₹"}{profile.video_price || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pre-Approval Chat Panel */}
          <div className="w-full md:w-1/2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
            <div className="p-4 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-900">
                  <MessageSquare className="w-4 h-4 text-primary" /> Application Review Chat
                </h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Discuss your profile and negotiate pricing with the Super Admin.</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30 custom-scrollbar">
              {chatMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-70">
                  <MessageSquare className="w-8 h-8 mb-2" />
                  <p className="text-xs">Send a message to the Super Admin.</p>
                </div>
              )}
              {chatMessages.map(m => {
                const isMe = m.sender_type === "therapist";
                return (
                  <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-sm ${isMe ? "bg-primary text-white rounded-tr-sm" : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm"}`}>
                      <p className="text-xs whitespace-pre-wrap leading-relaxed">{m.message}</p>
                      <p className={`text-[8px] mt-1 text-right ${isMe ? "text-primary-foreground/70" : "text-gray-400"}`}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendChat} className="p-4 border-t border-gray-100 bg-white flex gap-2">
              <Input 
                className="flex-1 text-xs h-9 rounded-full bg-gray-50 focus-visible:ring-primary" 
                placeholder="Message Super Admin..." 
                value={newChatMsg} 
                onChange={e => setNewChatMsg(e.target.value)} 
              />
              <Button type="submit" size="icon" className="w-9 h-9 rounded-full bg-primary flex-shrink-0" disabled={!newChatMsg.trim()}>
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Main Dashboard (Only relevant if approved) */}
      {profile && approvalStatus === "approved" && (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold">
                Welcome, {profile?.full_name || user?.full_name || user?.email?.split("@")[0]}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">Your practice overview</p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2 bg-green-50 border border-green-300 text-green-800 rounded-full px-4 py-2 text-xs font-semibold shadow-sm">
              <CheckCircle className="w-3.5 h-3.5 text-green-600" />
              Approved & Active
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={Users} label="Total Clients" value={uniqueClients} />
            <StatCard icon={Calendar} label="Upcoming Sessions" value={upcomingSessions.length} />
            <StatCard icon={Clock} label="Completed Sessions" value={completedSessions.length} />
          </div>

          {(() => {
            const pending = sessions.filter(s => s.status === "scheduled" && !s.accepted_by_therapist);
            if (pending.length === 0) return null;
            return (
              <div className="bg-card rounded-xl border border-amber-200 bg-amber-50">
                <div className="flex items-center gap-2 p-5 border-b border-amber-200">
                  <Bell className="w-4 h-4 text-amber-600" />
                  <h2 className="font-heading text-base font-semibold text-amber-800">
                    Pending Session Requests ({pending.length})
                  </h2>
                </div>
                <div className="p-5 space-y-3">
                  {pending.map(session => (
                    <PendingSessionCard key={session.id} session={session} therapistId={user?.id} />
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="bg-card rounded-xl border border-border">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-heading text-base font-semibold flex items-center gap-2">
                Upcoming Sessions
                {upcomingSessions.length > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {upcomingSessions.length}
                  </span>
                )}
              </h2>
              <Link to="/therapist/sessions">
                <Button variant="ghost" size="sm" className="gap-1 text-primary text-xs">
                  View All <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            <div className="p-5">
              {upcomingSessions.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No upcoming sessions"
                  description="Sessions booked by clients will appear here."
                />
              ) : (
                <div className="space-y-3">
                  {upcomingSessions.slice(0, 5).map(session => (
                    <div key={session.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/40">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Users className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{session.customer_name || "Client"}</p>
                          <p className="text-xs text-muted-foreground">
                            {moment(session.session_date).format("ddd, MMM D YYYY")} · {session.start_time}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">{session.session_type?.replace("_", " ") || "Regular"}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PendingSessionCard({ session, therapistId }) {
  const queryClient = useQueryClient();
  const acceptSession = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('sessions')
        .update({ accepted_by_therapist: true, status: "scheduled" })
        .eq('id', session.id);
      
      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: session.customer_id,
        title: "Session Accepted",
        body: `${session.therapist_name || "Your therapist"} has accepted your session request for ${session.session_date} at ${session.start_time}.`,
        type: "session_accepted",
        related_id: session.id,
      }).catch(() => {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["therapist-sessions"] });
      toast.success(`Session with ${session.customer_name} accepted!`);
    },
  });

  return (
    <div className="bg-white rounded-xl border border-amber-200 p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{session.customer_name || "Client"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {moment(session.session_date).format("ddd, MMM D YYYY")} · {session.start_time}
          </p>
          {session.notes && (
            <p className="text-xs text-muted-foreground mt-1 bg-muted/40 rounded p-2">{session.notes}</p>
          )}
        </div>
        <Button size="sm" onClick={() => acceptSession.mutate()} disabled={acceptSession.isPending} className="bg-green-600 hover:bg-green-700 text-white text-xs">
          {acceptSession.isPending ? "..." : "Accept"}
        </Button>
      </div>
    </div>
  );
}

export default function TherapistDashboard() {
  return (
    <RoleGuard allowedRoles={["therapist", "admin", "super_admin"]}>
      <DashboardContent />
    </RoleGuard>
  );
}