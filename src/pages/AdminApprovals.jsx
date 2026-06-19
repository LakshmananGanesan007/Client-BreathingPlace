import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminData, updateTherapistStatus, ADMIN_DATA_KEY } from "@/hooks/useAdminData";
import EmptyState from "@/components/EmptyState";
import { TableRowSkeleton } from "@/components/SkeletonLoader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Eye, User, Briefcase, Clock, FileText, ExternalLink, PauseCircle, PlayCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const statusColors = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  suspended: "bg-red-100 text-red-800",
};

export default function AdminApprovals() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useAdminData();
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [rejectDialog, setRejectDialog] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [updating, setUpdating] = useState(false);

  const therapists = data?.therapists || [];
  const userProfiles = data?.userProfiles || [];
  const emailMap = Object.fromEntries(userProfiles.map(p => [p.user_id, p.email]));

  const pendingTherapists = therapists.filter(t => t.approval_status === "pending");
  const reviewedTherapists = therapists.filter(t => t.approval_status !== "pending");

  const handleStatus = async (userId, status, reason) => {
    setUpdating(true);
    const result = await updateTherapistStatus(userId, status, reason);
    setUpdating(false);
    if (result?.success) {
      queryClient.invalidateQueries({ queryKey: ADMIN_DATA_KEY });
      const msgs = { approved: "Therapist approved!", rejected: "Application rejected.", suspended: "Therapist suspended.", reactivated: "Therapist reactivated!" };
      toast.success(msgs[status] || "Status updated.");
      setRejectDialog(null);
      setRejectReason("");
      setSelectedTherapist(null);
    } else {
      toast.error("Failed to update status.");
    }
  };

  if (isLoading) return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="h-8 bg-muted rounded w-48 animate-pulse" />
      <TableRowSkeleton rows={4} />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Therapist Approvals</h1>
          <p className="text-muted-foreground mt-1 text-sm">Review credentials and approve or reject applications</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => queryClient.invalidateQueries({ queryKey: ADMIN_DATA_KEY })}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Pending */}
      <div>
        <h2 className="font-heading text-base font-semibold mb-3">
          Pending Review
          {pendingTherapists.length > 0 && <Badge className="ml-2 bg-amber-100 text-amber-800 border-0 text-xs">{pendingTherapists.length}</Badge>}
        </h2>
        {pendingTherapists.length === 0 ? (
          <div className="bg-card rounded-xl border border-border">
            <EmptyState icon={CheckCircle} title="All applications reviewed" description="No pending therapist applications at this time." />
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTherapists.map(t => (
              <TherapistCard
                key={t.user_id}
                therapist={t}
                email={emailMap[t.user_id]}
                onView={() => setSelectedTherapist(t)}
                onApprove={() => handleStatus(t.user_id, "approved")}
                onReject={() => setRejectDialog(t)}
                loading={updating}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reviewed */}
      {reviewedTherapists.length > 0 && (
        <div>
          <h2 className="font-heading text-base font-semibold mb-3">Previously Reviewed ({reviewedTherapists.length})</h2>
          <div className="space-y-3">
            {reviewedTherapists.map(t => (
              <TherapistCard
                key={t.user_id}
                therapist={t}
                email={emailMap[t.user_id]}
                onView={() => setSelectedTherapist(t)}
                onSuspend={() => handleStatus(t.user_id, "suspended")}
                onReactivate={() => handleStatus(t.user_id, "reactivated")}
                loading={updating}
                reviewed
              />
            ))}
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedTherapist} onOpenChange={() => setSelectedTherapist(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Therapist Profile</DialogTitle>
          </DialogHeader>
          {selectedTherapist && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                {selectedTherapist.profile_photo_url
                  ? <img src={selectedTherapist.profile_photo_url} alt={selectedTherapist.full_name} className="w-14 h-14 rounded-full object-cover" />
                  : <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-6 h-6 text-primary" /></div>
                }
                <div>
                  <p className="font-semibold">{selectedTherapist.full_name}</p>
                  <p className="text-xs text-muted-foreground">{emailMap[selectedTherapist.user_id] || "—"}</p>
                  <Badge className={`${statusColors[selectedTherapist.approval_status]} border-0 text-xs mt-1`}>{selectedTherapist.approval_status}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {[
                  ["Phone", selectedTherapist.phone || "—"],
                  ["Qualification", selectedTherapist.qualification || "—"],
                  ["Experience", `${selectedTherapist.experience_years || 0} years`],
                  ["Fee/Session", selectedTherapist.consultation_fee ? `₹${selectedTherapist.consultation_fee}` : "—"],
                  ["Languages", (selectedTherapist.languages || []).join(", ") || "—"],
                  ["Available Days", (selectedTherapist.available_days || []).join(", ") || "—"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-muted-foreground text-xs">{label}</p>
                    <p className="font-medium">{value}</p>
                  </div>
                ))}
                {selectedTherapist.specializations?.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Specializations</p>
                    <p className="font-medium">{selectedTherapist.specializations.join(", ")}</p>
                  </div>
                )}
                {selectedTherapist.bio && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Bio</p>
                    <p className="font-medium">{selectedTherapist.bio}</p>
                  </div>
                )}
                {selectedTherapist.rejection_reason && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Rejection Reason</p>
                    <p className="font-medium text-destructive">{selectedTherapist.rejection_reason}</p>
                  </div>
                )}
              </div>
              {(selectedTherapist.gov_id_url || selectedTherapist.certificates_url || selectedTherapist.license_url) && (
                <div className="pt-3 border-t border-border">
                  <p className="text-muted-foreground text-xs mb-2">Submitted Documents</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTherapist.gov_id_url && (
                      <a href={selectedTherapist.gov_id_url} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs"><FileText className="w-3 h-3" /> Govt ID <ExternalLink className="w-3 h-3" /></Button>
                      </a>
                    )}
                    {selectedTherapist.certificates_url && (
                      <a href={selectedTherapist.certificates_url} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs"><FileText className="w-3 h-3" /> Certificates <ExternalLink className="w-3 h-3" /></Button>
                      </a>
                    )}
                    {selectedTherapist.license_url && (
                      <a href={selectedTherapist.license_url} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs"><FileText className="w-3 h-3" /> License <ExternalLink className="w-3 h-3" /></Button>
                      </a>
                    )}
                  </div>
                </div>
              )}
              {selectedTherapist.approval_status === "pending" && (
                <div className="flex gap-2 pt-3 border-t border-border">
                  <Button className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm" onClick={() => handleStatus(selectedTherapist.user_id, "approved")} disabled={updating}>
                    <CheckCircle className="w-4 h-4" /> Approve
                  </Button>
                  <Button variant="destructive" className="flex-1 gap-1.5 text-sm" onClick={() => { setRejectDialog(selectedTherapist); setSelectedTherapist(null); }}>
                    <XCircle className="w-4 h-4" /> Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => { setRejectDialog(null); setRejectReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Reject Application</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Reason for Rejection <span className="text-destructive">*</span></Label>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Provide a clear reason shown to the therapist..." rows={3} className="mt-1" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialog(null); setRejectReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={() => handleStatus(rejectDialog.user_id, "rejected", rejectReason)} disabled={!rejectReason.trim() || updating}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TherapistCard({ therapist: t, email, onView, onApprove, onReject, onSuspend, onReactivate, loading, reviewed }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {t.profile_photo_url
            ? <img src={t.profile_photo_url} alt={t.full_name} className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
            : <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><User className="w-5 h-5 text-primary" /></div>
          }
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium text-sm">{t.full_name}</h3>
              <Badge className={`${statusColors[t.approval_status] || "bg-gray-100 text-gray-800"} border-0 text-xs`}>{t.approval_status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{email || "—"}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {t.qualification || "—"}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {t.experience_years || 0} yrs</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onView} className="gap-1 text-xs"><Eye className="w-3 h-3" /> View</Button>
          {!reviewed && (
            <>
              <Button size="sm" onClick={onApprove} disabled={loading} className="gap-1 text-xs bg-green-600 hover:bg-green-700"><CheckCircle className="w-3 h-3" /> Approve</Button>
              <Button size="sm" variant="destructive" onClick={onReject} disabled={loading} className="gap-1 text-xs"><XCircle className="w-3 h-3" /> Reject</Button>
            </>
          )}
          {reviewed && t.approval_status === "approved" && (
            <Button size="sm" variant="outline" onClick={onSuspend} disabled={loading} className="gap-1 text-xs text-amber-700 border-amber-300"><PauseCircle className="w-3 h-3" /> Suspend</Button>
          )}
          {reviewed && (t.approval_status === "rejected" || t.approval_status === "suspended") && (
            <Button size="sm" onClick={onReactivate} disabled={loading} className="gap-1 text-xs bg-blue-600 hover:bg-blue-700"><PlayCircle className="w-3 h-3" /> Reactivate</Button>
          )}
        </div>
      </div>
    </div>
  );
}