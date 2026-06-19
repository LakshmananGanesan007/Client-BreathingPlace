import { useQueryClient } from "@tanstack/react-query";
import { useAdminData, ADMIN_DATA_KEY } from "@/hooks/useAdminData";
import { DashboardSkeleton } from "@/components/SkeletonLoader";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users, User, UserCheck, Clock, CreditCard, AlertTriangle, ArrowRight, ShieldCheck, CalendarCheck, RefreshCw } from "lucide-react";
import moment from "moment";

const statusBadge = {
  scheduled: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  in_progress: "bg-purple-100 text-purple-800",
};

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useAdminData();

  if (isLoading) return <DashboardSkeleton />;
  if (error) return (
    <div className="text-center py-20 text-destructive">
      <p className="font-medium">Failed to load dashboard data</p>
      <p className="text-sm mt-1">{error.message}</p>
      <Button className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ADMIN_DATA_KEY })}>Retry</Button>
    </div>
  );

  const customers = data?.customers || [];
  const therapists = data?.therapists || [];
  const userProfiles = data?.userProfiles || [];
  const sessions = data?.sessions || [];
  const payments = data?.payments || [];

  const emailMap = Object.fromEntries(userProfiles.map(p => [p.user_id, p.email]));
  const pendingTherapists = therapists.filter(t => t.approval_status === "pending");
  const approvedTherapists = therapists.filter(t => t.approval_status === "approved");
  const activeSessions = sessions.filter(s =>
    s.status === "in_progress" || (s.status === "scheduled" && moment(s.session_date).isSameOrAfter(moment(), "day"))
  );
  const totalRevenue = payments.filter(p => p.status === "completed").reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold">Admin Control Center</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Live Supabase data — {moment().format("MMMM D, YYYY")}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => queryClient.invalidateQueries({ queryKey: ADMIN_DATA_KEY })}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Customers" value={customers.length} />
        <StatCard icon={UserCheck} label="Total Therapists" value={therapists.length} />
        <StatCard icon={AlertTriangle} label="Pending Approvals" value={pendingTherapists.length} />
        <StatCard icon={UserCheck} label="Approved Therapists" value={approvedTherapists.length} />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={CalendarCheck} label="Active / Upcoming Sessions" value={activeSessions.length} />
        <StatCard icon={Clock} label="Total Bookings" value={sessions.length} />
        <StatCard icon={CreditCard} label="Total Revenue (Completed)" value={`₹${totalRevenue.toLocaleString()}`} />
      </div>

      {/* Pending Therapist Approvals */}
      <div className="bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-base font-semibold">Pending Therapist Approvals</h2>
            {pendingTherapists.length > 0 && (
              <Badge className="bg-amber-100 text-amber-800 border-0 text-xs">{pendingTherapists.length}</Badge>
            )}
          </div>
          <Link to="/admin/approvals">
            <Button variant="ghost" size="sm" className="gap-1 text-primary text-xs">Manage All <ArrowRight className="w-3 h-3" /></Button>
          </Link>
        </div>
        <div className="p-5">
          {pendingTherapists.length === 0 ? (
            <EmptyState icon={UserCheck} title="No pending approvals" description="All therapist applications have been reviewed." />
          ) : (
            <div className="space-y-3">
              {pendingTherapists.map(t => (
                <div key={t.id || t.user_id} className="flex items-center justify-between p-4 rounded-lg bg-amber-50 border border-amber-100">
                  <div className="flex items-center gap-3">
                    {t.profile_photo_url
                      ? <img src={t.profile_photo_url} alt={t.full_name} className="w-10 h-10 rounded-full object-cover" />
                      : <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-5 h-5 text-primary" /></div>
                    }
                    <div>
                      <p className="text-sm font-medium">{t.full_name}</p>
                      <p className="text-xs text-muted-foreground">{emailMap[t.user_id] || "—"}</p>
                      <p className="text-xs text-muted-foreground">{t.qualification || "—"} · {t.experience_years || 0} yrs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Pending</Badge>
                    <Link to="/admin/approvals"><Button size="sm" variant="outline" className="text-xs">Review</Button></Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All Therapists Summary */}
      <div className="bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-heading text-base font-semibold">All Therapists ({therapists.length})</h2>
          <Link to="/admin/approvals">
            <Button variant="ghost" size="sm" className="gap-1 text-primary text-xs">View All <ArrowRight className="w-3 h-3" /></Button>
          </Link>
        </div>
        <div className="p-5">
          {therapists.length === 0 ? (
            <EmptyState icon={UserCheck} title="No therapists yet" />
          ) : (
            <div className="space-y-3">
              {therapists.slice(0, 5).map(t => (
                <div key={t.id || t.user_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <div className="flex items-center gap-3">
                    {t.profile_photo_url
                      ? <img src={t.profile_photo_url} alt={t.full_name} className="w-8 h-8 rounded-full object-cover" />
                      : <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-4 h-4 text-primary" /></div>
                    }
                    <div>
                      <p className="text-sm font-medium">{t.full_name}</p>
                      <p className="text-xs text-muted-foreground">{emailMap[t.user_id] || "—"} · {t.qualification || "—"}</p>
                    </div>
                  </div>
                  <Badge className={
                    t.approval_status === "approved" ? "bg-green-100 text-green-800 border-0 text-xs" :
                    t.approval_status === "rejected" ? "bg-red-100 text-red-800 border-0 text-xs" :
                    "bg-amber-100 text-amber-800 border-0 text-xs"
                  }>{t.approval_status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-heading text-base font-semibold">Recent Sessions</h2>
          <Link to="/admin/sessions">
            <Button variant="ghost" size="sm" className="gap-1 text-primary text-xs">View All <ArrowRight className="w-3 h-3" /></Button>
          </Link>
        </div>
        <div className="p-5">
          {sessions.length === 0 ? (
            <EmptyState icon={Clock} title="No sessions recorded" description="Session activity will appear here once customers start booking." />
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 5).map((s, i) => (
                <div key={s.id || i} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <div>
                    <p className="text-sm font-medium">{s.customer_name || "Customer"} → {s.therapist_name || "Therapist"}</p>
                    <p className="text-xs text-muted-foreground">{moment(s.session_date).format("MMM D, YYYY")} at {s.start_time}</p>
                  </div>
                  <Badge className={`${statusBadge[s.status] || "bg-gray-100 text-gray-800"} border-0 text-xs`}>{s.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}