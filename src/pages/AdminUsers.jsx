import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminData, updateTherapistStatus, ADMIN_DATA_KEY } from "@/hooks/useAdminData";
import EmptyState from "@/components/EmptyState";
import { TableRowSkeleton } from "@/components/SkeletonLoader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, User, Brain, Search, RefreshCw, Eye, PauseCircle, FileText, ExternalLink } from "lucide-react";
import moment from "moment";
import { toast } from "sonner";

const statusColors = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  suspended: "bg-red-100 text-red-800",
};

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useAdminData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewProfile, setViewProfile] = useState(null);
  const [suspending, setSuspending] = useState(false);

  const customers = data?.customers || [];
  const therapists = data?.therapists || [];
  const userProfiles = data?.userProfiles || [];
  const emailMap = Object.fromEntries(userProfiles.map(p => [p.user_id, p.email]));

  const handleSuspend = async (userId) => {
    setSuspending(true);
    const result = await updateTherapistStatus(userId, "suspended");
    setSuspending(false);
    if (result?.success) {
      queryClient.invalidateQueries({ queryKey: ADMIN_DATA_KEY });
      toast.success("Account suspended.");
    } else {
      toast.error("Failed to suspend.");
    }
  };

  const filterCustomers = (list) =>
    list.filter(c => {
      const email = emailMap[c.user_id] || "";
      return !search ||
        c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        email.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search);
    });

  const filterTherapists = (list) =>
    list.filter(t => {
      const email = emailMap[t.user_id] || "";
      const matchSearch = !search ||
        t.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        email.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || t.approval_status === statusFilter;
      return matchSearch && matchStatus;
    });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">All registered users — live from Supabase database</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => queryClient.invalidateQueries({ queryKey: ADMIN_DATA_KEY })}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9 h-9 text-sm" placeholder="Search by name, email, phone..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="Filter status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="customers">
        <TabsList>
          <TabsTrigger value="customers" className="gap-2">
            <User className="w-3.5 h-3.5" /> Customers
            {!isLoading && <Badge variant="secondary" className="ml-1 text-xs">{customers.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="therapists" className="gap-2">
            <Brain className="w-3.5 h-3.5" /> Therapists
            {!isLoading && <Badge variant="secondary" className="ml-1 text-xs">{therapists.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* CUSTOMERS TAB */}
        <TabsContent value="customers" className="mt-4">
          {isLoading ? <TableRowSkeleton rows={5} /> : filterCustomers(customers).length === 0 ? (
            <div className="bg-card rounded-xl border border-border">
              <EmptyState icon={Users} title="No customers found" description="Customers who complete their profile will appear here." />
            </div>
          ) : (
            <div className="space-y-3">
              {filterCustomers(customers).map(c => (
                <div key={c.id || c.user_id} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      {c.profile_photo_url
                        ? <img src={c.profile_photo_url} alt={c.full_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                        : <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><User className="w-5 h-5 text-primary" /></div>
                      }
                      <div>
                        <p className="text-sm font-semibold">{c.full_name}</p>
                        <p className="text-xs text-muted-foreground">{emailMap[c.user_id] || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.phone || "No phone"}{c.created_at ? ` · Joined ${moment(c.created_at).format("MMM D, YYYY")}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="border-0 text-xs bg-blue-100 text-blue-800">customer</Badge>
                      <Badge className={`border-0 text-xs ${c.profile_complete ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                        {c.profile_complete ? "Complete" : "Incomplete"}
                      </Badge>
                      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setViewProfile({ type: "customer", data: c })}>
                        <Eye className="w-3 h-3" /> View Profile
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* THERAPISTS TAB */}
        <TabsContent value="therapists" className="mt-4">
          {isLoading ? <TableRowSkeleton rows={5} /> : filterTherapists(therapists).length === 0 ? (
            <div className="bg-card rounded-xl border border-border">
              <EmptyState icon={Brain} title="No therapists found" />
            </div>
          ) : (
            <div className="space-y-3">
              {filterTherapists(therapists).map(t => (
                <div key={t.id || t.user_id} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      {t.profile_photo_url
                        ? <img src={t.profile_photo_url} alt={t.full_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                        : <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><Brain className="w-5 h-5 text-primary" /></div>
                      }
                      <div>
                        <p className="text-sm font-semibold">{t.full_name}</p>
                        <p className="text-xs text-muted-foreground">{emailMap[t.user_id] || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.qualification || "—"} · {t.experience_years || 0} yrs
                          {t.consultation_fee ? ` · ₹${t.consultation_fee}/session` : ""}
                          {t.created_at ? ` · Applied ${moment(t.created_at).format("MMM D, YYYY")}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="border-0 text-xs bg-purple-100 text-purple-800">therapist</Badge>
                      <Badge className={`border-0 text-xs ${statusColors[t.approval_status] || "bg-gray-100 text-gray-800"}`}>{t.approval_status || "pending"}</Badge>
                      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setViewProfile({ type: "therapist", data: t })}>
                        <Eye className="w-3 h-3" /> View
                      </Button>
                      {t.approval_status === "approved" && (
                        <Button size="sm" variant="outline" className="gap-1 text-xs text-amber-700 border-amber-300" onClick={() => handleSuspend(t.user_id)} disabled={suspending}>
                          <PauseCircle className="w-3 h-3" /> Suspend
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Profile Detail Dialog */}
      <Dialog open={!!viewProfile} onOpenChange={() => setViewProfile(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {viewProfile?.type === "therapist" ? "Therapist Profile" : "Customer Profile"}
            </DialogTitle>
          </DialogHeader>
          {viewProfile?.type === "customer" && <CustomerProfileView data={viewProfile.data} email={emailMap[viewProfile.data.user_id]} />}
          {viewProfile?.type === "therapist" && <TherapistProfileView data={viewProfile.data} email={emailMap[viewProfile.data.user_id]} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustomerProfileView({ data: c, email }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center gap-4">
        {c.profile_photo_url
          ? <img src={c.profile_photo_url} alt={c.full_name} className="w-16 h-16 rounded-full object-cover" />
          : <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-7 h-7 text-primary" /></div>
        }
        <div>
          <p className="font-semibold text-base">{c.full_name}</p>
          <p className="text-muted-foreground text-xs">{email}</p>
          <Badge className="border-0 text-xs bg-blue-100 text-blue-800 mt-1">customer</Badge>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {[
          ["Phone", c.phone || "—"],
          ["Gender", c.gender || "—"],
          ["Date of Birth", c.dob || "—"],
          ["Occupation", c.occupation || "—"],
          ["Address", c.address || "—"],
          ["Language", c.preferred_language || "—"],
          ["Anxiety Level", c.anxiety_level || "—"],
          ["Stress Level", c.stress_level || "—"],
          ["Sleep Quality", c.sleep_quality || "—"],
          ["Relationship Status", c.relationship_status || "—"],
          ["Previous Therapy", c.previous_therapy ? "Yes" : "No"],
          ["Current Medication", c.current_medication || "—"],
          ["Emergency Contact", c.emergency_contact || "—"],
          ["Preferred Therapist Gender", c.preferred_therapist_gender || "—"],
          ["Preferred Session Time", c.preferred_session_time || "—"],
          ["Profile Complete", c.profile_complete ? "Yes" : "No"],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-muted-foreground text-xs">{label}</p>
            <p className="font-medium capitalize">{value}</p>
          </div>
        ))}
        {c.main_concerns?.length > 0 && (
          <div className="col-span-2">
            <p className="text-muted-foreground text-xs">Main Concerns</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {c.main_concerns.map(concern => (
                <Badge key={concern} variant="secondary" className="text-xs">{concern}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TherapistProfileView({ data: t, email }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center gap-4">
        {t.profile_photo_url
          ? <img src={t.profile_photo_url} alt={t.full_name} className="w-16 h-16 rounded-full object-cover" />
          : <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"><Brain className="w-7 h-7 text-primary" /></div>
        }
        <div>
          <p className="font-semibold text-base">{t.full_name}</p>
          <p className="text-muted-foreground text-xs">{email}</p>
          <Badge className={`border-0 text-xs mt-1 ${statusColors[t.approval_status] || "bg-gray-100 text-gray-800"}`}>{t.approval_status}</Badge>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {[
          ["Phone", t.phone || "—"],
          ["Qualification", t.qualification || "—"],
          ["Experience", `${t.experience_years || 0} years`],
          ["Consultation Fee", t.consultation_fee ? `₹${t.consultation_fee}` : "—"],
          ["Languages", (t.languages || []).join(", ") || "—"],
          ["Available Days", (t.available_days || []).join(", ") || "—"],
          ["Currency", t.currency || "INR"],
          ["Profile Complete", t.profile_complete ? "Yes" : "No"],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-muted-foreground text-xs">{label}</p>
            <p className="font-medium">{value}</p>
          </div>
        ))}
        {t.specializations?.length > 0 && (
          <div className="col-span-2">
            <p className="text-muted-foreground text-xs">Specializations</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {t.specializations.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
            </div>
          </div>
        )}
        {t.bio && (
          <div className="col-span-2">
            <p className="text-muted-foreground text-xs">Bio</p>
            <p className="font-medium">{t.bio}</p>
          </div>
        )}
        {t.profile_tagline && (
          <div className="col-span-2">
            <p className="text-muted-foreground text-xs">Tagline</p>
            <p className="font-medium">{t.profile_tagline}</p>
          </div>
        )}
        {t.rejection_reason && (
          <div className="col-span-2">
            <p className="text-muted-foreground text-xs">Rejection Reason</p>
            <p className="font-medium text-destructive">{t.rejection_reason}</p>
          </div>
        )}
      </div>
      {(t.gov_id_url || t.certificates_url || t.license_url) && (
        <div className="pt-3 border-t border-border">
          <p className="text-muted-foreground text-xs mb-2">Submitted Documents</p>
          <div className="flex flex-wrap gap-2">
            {t.gov_id_url && (
              <a href={t.gov_id_url} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs"><FileText className="w-3 h-3" /> Govt ID <ExternalLink className="w-3 h-3" /></Button>
              </a>
            )}
            {t.certificates_url && (
              <a href={t.certificates_url} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs"><FileText className="w-3 h-3" /> Certificates <ExternalLink className="w-3 h-3" /></Button>
              </a>
            )}
            {t.license_url && (
              <a href={t.license_url} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs"><FileText className="w-3 h-3" /> License <ExternalLink className="w-3 h-3" /></Button>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}