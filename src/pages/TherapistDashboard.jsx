import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import RoleGuard from "@/components/RoleGuard";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import { DashboardSkeleton } from "@/components/SkeletonLoader";
import TherapistApprovalCongrats from "@/components/TherapistApprovalCongrats";
import { Users, Calendar, Clock, AlertCircle, CheckCircle, FileText, ArrowRight, Bell, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import moment from "moment";
import { toast } from "sonner";

const CONGRATS_KEY = "therapist_congrats_shown";

function DashboardContent() {
  const { user, userProfile } = useAuth();
  const queryClient = useQueryClient();
  const [showCongrats, setShowCongrats] = useState(false);

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

  // Real-time subscription — notify on new bookings using Supabase Realtime
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
  const upcomingSessions = sessions.filter(s =>
    s.status === "scheduled" && moment(s.session_date).isSameOrAfter(moment(), "day")
  );
  const completedSessions = sessions.filter(s => s.status === "completed");
  const uniqueClients = new Set(sessions.map(s => s.customer_id)).size;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {showCongrats && <TherapistApprovalCongrats onDismiss={handleDismissCongrats} />}

      {(!profile && userProfile?.profile_status !== "completed") && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-5 flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900">Set up your therapist profile</p>
            <p className="text-xs text-blue-700 mt-0.5">Complete your credentials and availability to get approved and start accepting clients.</p>
          </div>
          <Link to="/join-support">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">Set Up Profile</Button>
          </Link>
        </div>
      )}

      {((profile && approvalStatus === "pending") || (!profile && userProfile?.profile_status === "completed" && userProfile?.approval_status !== "approved")) && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">Application Under Review</p>
            <p className="text-xs text-amber-700 mt-0.5">Your application is under super admin review. Once super admin approved, customers will be assigned.</p>
          </div>
        </div>
      )}

      {((profile && approvalStatus === "approved") || (!profile && userProfile?.approval_status === "approved")) && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-5 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-900">Your application approved</p>
            <p className="text-xs text-green-700 mt-0.5">Your profile is active and you can now be assigned to customers.</p>
          </div>
        </div>
      )}

      {profile && approvalStatus === "rejected" && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-900">Application Not Approved</p>
            <p className="text-xs text-red-700 mt-0.5">{profile?.rejection_reason || "Please contact support for more information."}</p>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">
            Welcome, {profile?.full_name || user?.full_name || user?.email?.split("@")[0]}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Your practice overview</p>
        </div>
        {profile && approvalStatus === "pending" && (
          <div className="flex-shrink-0 flex items-center gap-2 bg-amber-50 border border-amber-300 text-amber-800 rounded-full px-4 py-2 text-xs font-semibold shadow-sm">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            Application Under Review
          </div>
        )}
        {profile && approvalStatus === "approved" && (
          <div className="flex-shrink-0 flex items-center gap-2 bg-green-50 border border-green-300 text-green-800 rounded-full px-4 py-2 text-xs font-semibold shadow-sm">
            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
            Approved & Active
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Clients" value={uniqueClients} />
        <StatCard icon={Calendar} label="Upcoming Sessions" value={upcomingSessions.length} />
        <StatCard icon={Clock} label="Completed Sessions" value={completedSessions.length} />
        <StatCard
          icon={AlertCircle}
          label="Status"
          value={
            <Badge className={`border-0 text-xs ${approvalStatus === "approved" ? "bg-green-100 text-green-800" : approvalStatus === "rejected" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
              {approvalStatus ? approvalStatus.charAt(0).toUpperCase() + approvalStatus.slice(1) : "Not Submitted"}
            </Badge>
          }
        />
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
              description={approvalStatus === "approved" ? "Sessions booked by clients will appear here." : "You'll see client sessions here once your profile is approved."}
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

      // Fire and forget notification
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