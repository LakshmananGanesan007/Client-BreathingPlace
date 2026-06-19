import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import RoleGuard from "@/components/RoleGuard";
import EmptyState from "@/components/EmptyState";
import { TableRowSkeleton } from "@/components/SkeletonLoader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, Plus, X, Video } from "lucide-react";
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [videoSession, setVideoSession] = useState(null);
  const [newSession, setNewSession] = useState({ session_date: "", start_time: "", end_time: "", session_type: "regular" });

  const isTherapist = user?.role === "therapist";
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const filterField = isTherapist ? "therapist_id" : "customer_id";

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ["sessions", user?.id, user?.role],
    queryFn: () => {
      if (isAdmin) return base44.entities.Session.list("-session_date", 100);
      return base44.entities.Session.filter({ [filterField]: user?.id }, "-session_date", 50);
    },
    enabled: !!user?.id,
  });

  const { data: therapists = [], isLoading: loadingTherapists } = useQuery({
    queryKey: ["approved-therapists"],
    queryFn: () => base44.entities.TherapistProfile.filter({ approval_status: "approved" }),
    enabled: !isTherapist && !isAdmin,
  });

  const createSession = useMutation({
    mutationFn: (data) => base44.entities.Session.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setCreateOpen(false);
      setNewSession({ session_date: "", start_time: "", end_time: "", session_type: "regular" });
      toast.success("Session booked successfully!");
    },
  });

  const cancelSession = useMutation({
    mutationFn: ({ id, reason }) => base44.entities.Session.update(id, { status: "cancelled", cancellation_reason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setCancelDialog(null);
      setCancelReason("");
      toast.success("Session cancelled.");
    },
  });

  const upcoming = sessions.filter(s => s.status === "scheduled" && moment(s.session_date).isSameOrAfter(moment(), "day"));
  const past = sessions.filter(s => s.status !== "scheduled" || moment(s.session_date).isBefore(moment(), "day"));

  if (loadingSessions) return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="h-8 bg-muted rounded w-40 animate-pulse" />
      <TableRowSkeleton rows={5} />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Sessions</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isAdmin ? "All platform sessions" : isTherapist ? "Your client sessions" : "Your therapy sessions"}
          </p>
        </div>
        {!isTherapist && !isAdmin && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2" disabled={loadingTherapists}>
            <Plus className="w-4 h-4" /> Book Session
          </Button>
        )}
      </div>

      {/* Admin Live Monitor */}
      {isAdmin && <AdminVideoMonitor sessions={sessions} />}

      {/* Upcoming */}
      <div>
        <h2 className="font-heading text-base font-semibold mb-3">
          Upcoming <span className="text-muted-foreground font-normal">({upcoming.length})</span>
        </h2>
        {upcoming.length === 0 ? (
          <div className="bg-card rounded-xl border border-border">
            <EmptyState
              icon={Calendar}
              title="No upcoming sessions"
              description={!isTherapist && !isAdmin ? "Book a session with an approved therapist to get started." : "Sessions scheduled for the future will appear here."}
              action={!isTherapist && !isAdmin ? (
                <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
                  <Plus className="w-3 h-3" /> Book a Session
                </Button>
              ) : null}
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

      {/* Past */}
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

      {/* Video Call Modal */}
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

      {/* Book Session Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Book a Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Therapist <span className="text-destructive">*</span></Label>
              {therapists.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted rounded-lg">
                  No approved therapists available at this time. Please check back later.
                </p>
              ) : (
                <Select value={newSession.therapist_id || ""} onValueChange={v => {
                  const t = therapists.find(th => th.id === v);
                  setNewSession(prev => ({ ...prev, therapist_id: t?.user_id, therapist_profile_id: v, therapist_name: t?.full_name }));
                }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a therapist" /></SelectTrigger>
                  <SelectContent>
                    {therapists.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name} — {t.qualification}{t.consultation_fee ? ` · ₹${t.consultation_fee}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date <span className="text-destructive">*</span></Label>
                <Input type="date" className="mt-1" min={moment().format("YYYY-MM-DD")} value={newSession.session_date} onChange={e => setNewSession(prev => ({ ...prev, session_date: e.target.value }))} />
              </div>
              <div>
                <Label>Session Type</Label>
                <Select value={newSession.session_type} onValueChange={v => setNewSession(prev => ({ ...prev, session_type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initial_consultation">Initial Consultation</SelectItem>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                    <SelectItem value="regular">Regular Session</SelectItem>
                    <SelectItem value="crisis">Crisis Session</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time <span className="text-destructive">*</span></Label>
                <Input type="time" className="mt-1" value={newSession.start_time} onChange={e => setNewSession(prev => ({ ...prev, start_time: e.target.value }))} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" className="mt-1" value={newSession.end_time} onChange={e => setNewSession(prev => ({ ...prev, end_time: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createSession.mutate({
                ...newSession,
                customer_id: user.id,
                customer_name: user.full_name || user.email,
                status: "scheduled",
              })}
              disabled={!newSession.therapist_id || !newSession.therapist_id || !newSession.session_date || !newSession.start_time || createSession.isPending}
            >
              {createSession.isPending ? "Booking..." : "Confirm Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
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
  const { user } = useAuth();
  const allowedRoles = ["customer", "user", "therapist", "admin", "super_admin"];
  return (
    <RoleGuard allowedRoles={allowedRoles}>
      <SessionsContent />
    </RoleGuard>
  );
}