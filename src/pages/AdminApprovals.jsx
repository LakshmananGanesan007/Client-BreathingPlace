import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useAdminData, updateTherapistStatus, ADMIN_DATA_KEY } from "@/hooks/useAdminData";
import EmptyState from "@/components/EmptyState";
import { TableRowSkeleton } from "@/components/SkeletonLoader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Eye, User, Briefcase, Clock, FileText, ExternalLink, PauseCircle, PlayCircle, RefreshCw, MessageSquare, Send, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const statusColors = {
  pending: "bg-amber-100 text-amber-800",
  changes_requested: "bg-blue-100 text-blue-800",
  reactivated: "bg-blue-100 text-blue-800", // Fix: Map reactivated to blue
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  suspended: "bg-red-100 text-red-800",
};

export default function AdminApprovals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useAdminData();
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [rejectDialog, setRejectDialog] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [updating, setUpdating] = useState(false);

  // Pre-Approval Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [newChatMsg, setNewChatMsg] = useState("");
  const chatEndRef = useRef(null);

  const therapists = data?.therapists || [];
  const userProfiles = data?.userProfiles || [];
  const emailMap = Object.fromEntries(userProfiles.map(p => [p.user_id, p.email]));

  // Fix: Treat reactivated exactly like a pending/changes_requested app
  const pendingStatuses = ["pending", "changes_requested", "reactivated"];
  const pendingTherapists = therapists.filter(t => pendingStatuses.includes(t.approval_status));
  const reviewedTherapists = therapists.filter(t => !pendingStatuses.includes(t.approval_status));

  useEffect(() => {
    if (!selectedTherapist) return;
    let isMounted = true;

    const fetchChat = async () => {
      const { data } = await supabase.from('application_chats').select('*').eq('therapist_id', selectedTherapist.user_id).order('created_at', { ascending: true });
      if (isMounted && data) setChatMessages(data);
    };

    fetchChat();

    const channel = supabase.channel(`app_chat_${selectedTherapist.user_id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'application_chats', filter: `therapist_id=eq.${selectedTherapist.user_id}` }, (payload) => {
        setChatMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      }).subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [selectedTherapist]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!newChatMsg.trim() || !selectedTherapist) return;

    const msg = newChatMsg.trim();
    setNewChatMsg("");

    try {
      await supabase.from('application_chats').insert({
        therapist_id: selectedTherapist.user_id,
        sender_id: user.id,
        sender_type: "super_admin",
        message: msg
      });
    } catch (err) {
      toast.error("Failed to send message.");
    }
  };

  const handleStatus = async (userId, status, reason = "") => {
    setUpdating(true);
    const result = await updateTherapistStatus(userId, status, reason);
    setUpdating(false);
    if (result?.success) {
      queryClient.invalidateQueries({ queryKey: ADMIN_DATA_KEY });
      const msgs = { 
        approved: "✅ Therapist approved!", 
        rejected: "❌ Application rejected.", 
        suspended: "⚠ Therapist suspended.", 
        reactivated: "✅ Therapist reactivated!",
        changes_requested: "ℹ Changes requested successfully."
      };
      toast.success(msgs[status] || "Status updated.");
      setRejectDialog(null);
      setRejectReason("");
      
      // Instantly update UI dialog if open
      if (selectedTherapist && selectedTherapist.user_id === userId) {
        setSelectedTherapist({ ...selectedTherapist, approval_status: status, rejection_reason: reason });
      }
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
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Therapist Approvals</h1>
          <p className="text-muted-foreground mt-1 text-sm">Review credentials, negotiate pricing, and approve applications.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => queryClient.invalidateQueries({ queryKey: ADMIN_DATA_KEY })}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Pending */}
      <div>
        <h2 className="font-heading text-base font-semibold mb-3 flex items-center gap-2">
          Pending Review
          {pendingTherapists.length > 0 && <Badge className="bg-amber-100 text-amber-800 border-0 text-xs">{pendingTherapists.length}</Badge>}
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
                onReactivate={() => handleStatus(t.user_id, "changes_requested", "Reactivated by Admin. Please update your profile.")}
                loading={updating}
                reviewed
              />
            ))}
          </div>
        </div>
      )}

      {/* Detail Dialog with Split Panel for Chat */}
      <Dialog open={!!selectedTherapist} onOpenChange={() => setSelectedTherapist(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0 flex flex-col md:flex-row bg-gray-50">
          {selectedTherapist && (
            <>
              {/* Left Panel: Profile Info */}
              <div className="flex-1 overflow-y-auto p-6 bg-white border-r border-gray-200 custom-scrollbar">
                <DialogHeader className="mb-6">
                  <DialogTitle className="font-display flex items-center justify-between">
                    Therapist Profile
                    <Badge className={`${statusColors[selectedTherapist.approval_status]} border-0 text-[10px] uppercase tracking-wider`}>
                      {selectedTherapist.approval_status.replace("_", " ")}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 text-sm">
                  <div className="flex items-center gap-4">
                    {selectedTherapist.profile_photo_url
                      ? <img src={selectedTherapist.profile_photo_url} alt={selectedTherapist.full_name} className="w-16 h-16 rounded-full object-cover border border-gray-200 shadow-sm" />
                      : <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-6 h-6 text-primary" /></div>
                    }
                    <div>
                      <p className="font-bold text-lg text-gray-900">{selectedTherapist.full_name}</p>
                      <p className="text-xs text-gray-500">{emailMap[selectedTherapist.user_id] || "—"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-gray-500 text-xs mb-0.5">Qualification</p>
                      <p className="font-medium text-gray-900">{selectedTherapist.qualification || "—"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs mb-0.5">Experience</p>
                      <p className="font-medium text-gray-900">{selectedTherapist.experience_years || 0} years</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs mb-0.5">Phone</p>
                      <p className="font-medium text-gray-900">{selectedTherapist.phone || "—"}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs mb-0.5">Languages</p>
                      <p className="font-medium text-gray-900">{(selectedTherapist.languages || []).join(", ") || "—"}</p>
                    </div>
                  </div>

                  {/* Requested Pricing Section */}
                  <div>
                    <h4 className="font-semibold text-gray-900 text-xs uppercase tracking-wider mb-3">Requested Base Pricing</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-gray-500 uppercase font-medium">Chat</p>
                        <p className="font-bold text-primary mt-1">{selectedTherapist.currency || "₹"}{selectedTherapist.chat_price || 0}</p>
                      </div>
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-gray-500 uppercase font-medium">Voice</p>
                        <p className="font-bold text-primary mt-1">{selectedTherapist.currency || "₹"}{selectedTherapist.voice_price || 0}</p>
                      </div>
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-gray-500 uppercase font-medium">Video</p>
                        <p className="font-bold text-primary mt-1">{selectedTherapist.currency || "₹"}{selectedTherapist.video_price || 0}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-amber-600 mt-2 bg-amber-50 p-2 rounded border border-amber-200">
                      Use the chat panel to negotiate pricing before final approval.
                    </p>
                  </div>

                  {selectedTherapist.specializations?.length > 0 && (
                    <div>
                      <p className="text-gray-500 text-xs mb-1 uppercase tracking-wider">Specializations</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTherapist.specializations.map(s => (
                          <span key={s} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded border border-gray-200">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTherapist.bio && (
                    <div>
                      <p className="text-gray-500 text-xs mb-1 uppercase tracking-wider">Bio</p>
                      <p className="text-sm text-gray-800 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">{selectedTherapist.bio}</p>
                    </div>
                  )}

                  {(selectedTherapist.gov_id_url || selectedTherapist.certificates_url || selectedTherapist.license_url) && (
                    <div className="pt-2">
                      <p className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Submitted Documents</p>
                      <div className="flex flex-col gap-2">
                        {selectedTherapist.gov_id_url && (
                          <a href={selectedTherapist.gov_id_url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                            <span className="flex items-center gap-2 text-sm font-medium text-gray-700"><FileText className="w-4 h-4 text-primary" /> Government ID</span>
                            <ExternalLink className="w-4 h-4 text-gray-400" />
                          </a>
                        )}
                        {selectedTherapist.certificates_url && (
                          <a href={selectedTherapist.certificates_url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                            <span className="flex items-center gap-2 text-sm font-medium text-gray-700"><FileText className="w-4 h-4 text-primary" /> Educational Certificates</span>
                            <ExternalLink className="w-4 h-4 text-gray-400" />
                          </a>
                        )}
                        {selectedTherapist.license_url && (
                          <a href={selectedTherapist.license_url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                            <span className="flex items-center gap-2 text-sm font-medium text-gray-700"><FileText className="w-4 h-4 text-primary" /> Professional License</span>
                            <ExternalLink className="w-4 h-4 text-gray-400" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Chat & Actions */}
              <div className="w-full md:w-[450px] flex flex-col bg-gray-50 h-[60vh] md:h-auto">
                <div className="p-4 border-b border-gray-200 bg-white shadow-sm z-10">
                  <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-800">
                    <MessageSquare className="w-4 h-4 text-primary" /> Application Review Chat
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-1">Discuss pricing or request document updates.</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {chatMessages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-70">
                      <MessageSquare className="w-8 h-8 mb-2" />
                      <p className="text-xs">No messages yet.</p>
                    </div>
                  )}
                  {chatMessages.map(m => {
                    const isAd = m.sender_type === "super_admin";
                    return (
                      <div key={m.id} className={`flex ${isAd ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-sm ${isAd ? "bg-primary text-white rounded-tr-sm" : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm"}`}>
                          <p className="text-xs whitespace-pre-wrap leading-relaxed">{m.message}</p>
                          <p className={`text-[8px] mt-1 text-right ${isAd ? "text-primary-foreground/70" : "text-gray-400"}`}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-4 bg-white border-t border-gray-200">
                  <form onSubmit={handleSendChat} className="flex gap-2 mb-4">
                    <Input 
                      className="flex-1 text-xs h-9 rounded-full bg-gray-50 focus-visible:ring-primary" 
                      placeholder="Type message..." 
                      value={newChatMsg} 
                      onChange={e => setNewChatMsg(e.target.value)} 
                    />
                    <Button type="submit" size="icon" className="w-9 h-9 rounded-full bg-primary flex-shrink-0" disabled={!newChatMsg.trim()}>
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </form>

                  {/* Actions for Pending/Changes Requested/Reactivated */}
                  {pendingStatuses.includes(selectedTherapist.approval_status) && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="text-xs h-8 text-amber-700 border-amber-300 hover:bg-amber-50" onClick={() => handleStatus(selectedTherapist.user_id, "changes_requested", "Please review the chat and update your application.")} disabled={updating}>
                        Request Changes
                      </Button>
                      <Button variant="outline" className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50" onClick={() => { setRejectDialog(selectedTherapist); }} disabled={updating}>
                        Reject
                      </Button>
                      <Button className="col-span-1 text-xs h-8 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleStatus(selectedTherapist.user_id, "approved")} disabled={updating}>
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve
                      </Button>
                      <Button className="col-span-1 text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => handleStatus(selectedTherapist.user_id, "suspended", "Suspended during review.")} disabled={updating}>
                        <PauseCircle className="w-3.5 h-3.5 mr-1.5" /> Suspend
                      </Button>
                    </div>
                  )}

                  {/* Actions for Rejected/Suspended */}
                  {(selectedTherapist.approval_status === "rejected" || selectedTherapist.approval_status === "suspended") && (
                    <Button className="w-full text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleStatus(selectedTherapist.user_id, "changes_requested", "Account Reactivated. Please review your profile.")} disabled={updating}>
                      <PlayCircle className="w-3.5 h-3.5 mr-1.5" /> Reactivate & Request Changes
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => { setRejectDialog(null); setRejectReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-red-600 flex items-center gap-2"><AlertCircle className="w-5 h-5"/> Reject Application</DialogTitle>
            <DialogDescription>This will reject the therapist's application. They will see the reason provided below.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs">Reason for Rejection <span className="text-destructive">*</span></Label>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Qualifications do not meet our minimum platform requirements." rows={3} className="mt-1 bg-white" />
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

function TherapistCard({ therapist: t, email, onView, onSuspend, onReactivate, loading, reviewed }) {
  const isChangesRequested = t.approval_status === "changes_requested" || t.approval_status === "reactivated";
  
  return (
    <div className={`bg-card rounded-xl border p-5 transition-all hover:shadow-sm ${isChangesRequested ? "border-blue-200 bg-blue-50/30" : "border-border"}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {t.profile_photo_url
            ? <img src={t.profile_photo_url} alt={t.full_name} className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-gray-200" />
            : <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><User className="w-5 h-5 text-primary" /></div>
          }
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h3 className="font-semibold text-sm text-gray-900">{t.full_name}</h3>
              <Badge className={`${statusColors[t.approval_status] || "bg-gray-100 text-gray-800"} border-0 text-[10px] uppercase tracking-wider`}>
                {t.approval_status.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{email || "—"}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 font-medium">
              <span className="flex items-center gap-1"><Briefcase className="w-3 h-3 text-gray-400" /> {t.qualification || "—"}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-gray-400" /> {t.experience_years || 0} yrs</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant={isChangesRequested ? "default" : "outline"} size="sm" onClick={onView} className={`gap-1.5 text-xs h-8 ${isChangesRequested ? "bg-blue-600 hover:bg-blue-700" : ""}`}>
            {isChangesRequested ? <MessageSquare className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} 
            {isChangesRequested ? "View & Chat" : "Review"}
          </Button>
          {reviewed && t.approval_status === "approved" && (
            <Button size="sm" variant="outline" onClick={onSuspend} disabled={loading} className="gap-1 text-xs text-amber-700 border-amber-300 h-8"><PauseCircle className="w-3.5 h-3.5" /> Suspend</Button>
          )}
          {reviewed && (t.approval_status === "rejected" || t.approval_status === "suspended") && (
            <Button size="sm" onClick={onReactivate} disabled={loading} className="gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white h-8"><PlayCircle className="w-3.5 h-3.5" /> Reactivate</Button>
          )}
        </div>
      </div>
    </div>
  );
}