import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import RoleGuard from "@/components/RoleGuard";
import EmptyState from "@/components/EmptyState";
import { TableRowSkeleton } from "@/components/SkeletonLoader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, X, Video, Radio, Download } from "lucide-react";

function downloadCSV(rows, filename) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = filename; a.click();
}
import { toast } from "sonner";
import moment from "moment";
import VideoCallModal from "@/components/VideoCallModal";
import AdminVideoMonitor from "@/components/AdminVideoMonitor";

const statusBadge = {
  scheduled: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  in_progress: "bg-amber-100 text-amber-800",
  no_show: "bg-gray-100 text-gray-800",
};

function SessionsContent() {
  const { user, userProfile } = useAuth();
  const queryClient = useQueryClient();
  const [cancelDialog, setCancelDialog] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [videoSession, setVideoSession] = useState(null);

  const metaRole = user?.user_metadata?.role || "";
  const isTherapist = userProfile?.selected_role === "therapist";
  const isAdmin = metaRole === "admin" || metaRole === "super_admin" || userProfile?.selected_role === "super_admin";
  const isCustomer = !isTherapist && !isAdmin;
  const filterField = isTherapist ? "therapist_id" : "customer_id";

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ["sessions", user?.id, userProfile?.selected_role],
    queryFn: async () => {
      let query = supabase.from("sessions").select("*").order("session_date", { ascending: false }).limit(100);
      if (!isAdmin) {
        query = query.eq(filterField, user?.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const cancelSession = useMutation({
    mutationFn: async ({ id, reason }) => {
      const { error } = await supabase.from("sessions").update({ status: "cancelled", cancellation_reason: reason }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setCancelDialog(null);
      setCancelReason("");
      toast.success("Session cancelled.");
    },
  });

  const liveNow = sessions.filter(s => s.status === "in_progress");
  const upcoming = sessions.filter(s => s.status === "scheduled" && moment(s.session_date).isSameOrAfter(moment(), "day"));
  const past = sessions.filter(s => (s.status !== "scheduled" && s.status !== "in_progress") || moment(s.session_date).isBefore(moment(), "day"));

  if (loadingSessions) return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="h-8 bg-muted rounded w-40 animate-pulse" />
      <TableRowSkeleton rows={5} />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Sessions</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isAdmin ? "All platform sessions" : isTherapist ? "Your client sessions" : "Your therapy sessions"}
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
          const rows = sessions.map(s => ({
            Date: s.session_date || "", Time: s.start_time || "", Customer: s.customer_name || "",
            Therapist: s.therapist_name || "", Type: s.session_type || "", Status: s.status || "",
          }));
          downloadCSV(rows, `sessions-${new Date().toISOString().slice(0,10)}.csv`);
        }}>
          <Download className="w-3.5 h-3.5" /> Download CSV
        </Button>
      </div>

      {isAdmin && <AdminVideoMonitor sessions={sessions} />}

      {/* Live Sessions — admin only */}
      {isAdmin && liveNow.length > 0 && (
        <div>
          <h2 className="font-heading text-base font-semibold mb-3 flex items-center gap-2">
            <Radio className="w-4 h-4 text-red-500 animate-pulse" />
            Live Now <span className="text-red-500 font-normal">({liveNow.length})</span>
          </h2>
          <div className="space-y-3">
            {liveNow.map(s => (
              <SessionRow
                key={s.id}
                session={s}
                isTherapist={false}
                isAdmin={true}
                onJoinVideo={() => setVideoSession(s)}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-heading text-base font-semibold mb-3">
          Upcoming <span className="text-muted-foreground font-normal">({upcoming.length})</span>
        </h2>
        {upcoming.length === 0 ? (
          <div className="bg-card rounded-xl border border-border">
            <EmptyState
              icon={Calendar}
              title="No upcoming sessions"
              description={isCustomer ? "Book a Premium session via Find Support to schedule a video session." : "Sessions scheduled for the future will appear here."}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(s => (
              <SessionRow
                key={s.id}
                session={s}
                isTherapist={isTherapist}
                isAdmin={isAdmin}
                onCancel={!isAdmin ? () => setCancelDialog(s) : undefined}
                onJoinVideo={() => setVideoSession(s)}
              />
            ))}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <div>
          <h2 className="font-heading text-base font-semibold mb-3">
            Past Sessions <span className="text-muted-foreground font-normal">({past.length})</span>
          </h2>
          <div className="space-y-3">
            {past.map(s => <SessionRow key={s.id} session={s} isTherapist={isTherapist} isAdmin={isAdmin} past />)}
          </div>
        </div>
      )}

      <VideoCallModal
        session={videoSession}
        open={!!videoSession}
        onClose={() => setVideoSession(null)}
      />

      {upcoming.length === 0 && past.length === 0 && (
        <div className="bg-card rounded-xl border border-border">
          <EmptyState icon={Clock} title="No sessions found" description="Your session history will appear here." />
        </div>
      )}

      <Dialog open={!!cancelDialog} onOpenChange={() => { setCancelDialog(null); setCancelReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Cancel Session</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Reason for cancellation (optional)</Label>
            <Textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Let your therapist know why you're cancelling..." rows={3} className="mt-1" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(null)}>Keep Session</Button>
            <Button variant="destructive" onClick={() => cancelSession.mutate({ id: cancelDialog.id, reason: cancelReason })} disabled={cancelSession.isPending}>
              {cancelSession.isPending ? "Cancelling..." : "Cancel Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SessionRow({ session, isTherapist, isAdmin, onCancel, onJoinVideo, past }) {
  const canJoin = !past && (session.status === "scheduled" || session.status === "in_progress");

  const displayName = isAdmin
    ? `${session.customer_name || "Customer"} ↔ ${session.therapist_name || "Therapist"}`
    : isTherapist
      ? (session.customer_name || "Client")
      : (session.therapist_name || "Therapist");

  return (
    <div className="bg-card rounded-xl border border-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Calendar className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">{displayName}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span>{moment(session.session_date).format("ddd, MMM D YYYY")}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {session.start_time}{session.end_time ? ` – ${session.end_time}` : ""}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={`${statusBadge[session.status] || "bg-gray-100 text-gray-800"} border-0 text-xs`}>
          {session.status}
        </Badge>
        {session.session_type && (
          <Badge variant="outline" className="text-xs">{session.session_type.replace("_", " ")}</Badge>
        )}
        {canJoin && onJoinVideo && (
          <Button
            size="sm"
            className={`h-7 text-xs gap-1 ${session.status === "in_progress" ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
            onClick={onJoinVideo}
          >
            <Video className="w-3 h-3" />
            {session.status === "in_progress" ? "Rejoin" : "Start Video"}
          </Button>
        )}
        {!past && session.status === "scheduled" && onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-destructive h-7 w-7 p-0">
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Sessions() {
  const allowedRoles = ["customer", "user", "therapist", "admin", "super_admin"];
  return (
    <RoleGuard allowedRoles={allowedRoles}>
      <SessionsContent />
    </RoleGuard>
  );
}