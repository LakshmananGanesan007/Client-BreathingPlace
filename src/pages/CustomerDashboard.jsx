import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/lib/supabaseClient";
import { upsertCustomerProfile } from "@/lib/supabaseProfiles";
import RoleGuard from "@/components/RoleGuard";
import {
  Calendar, UserCheck, CreditCard, Clock, ArrowRight,
  MessageCircle, Star, Zap, Shield, AlertTriangle,
  Edit3, Save, X, User, Phone, MapPin, HeartHandshake, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import moment from "moment";

const CONCERNS = [
  "Anxiety", "Depression", "Stress", "Relationship Issues", "Trauma / PTSD",
  "Grief & Loss", "Self-esteem", "Career / Life Confusion", "Loneliness",
  "Anger Management", "Family Conflict", "Other"
];
const THERAPIST_GENDERS = ["Male", "Female", "No Preference"];

function ProfileSection({ profile, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const { user } = useAuth();

  const startEdit = () => {
    setForm({
      full_name: profile?.full_name || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
      preferred_language: profile?.preferred_language || "",
      preferred_therapist_gender: profile?.preferred_therapist_gender || "",
      main_concerns: profile?.main_concerns || [],
    });
    setEditing(true);
  };

  const toggleConcern = (c) => {
    setForm((f) => ({
      ...f,
      main_concerns: f.main_concerns.includes(c)
        ? f.main_concerns.filter((x) => x !== c)
        : [...f.main_concerns, c],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    await upsertCustomerProfile(user.id, { ...form, profile_complete: true });
    setSaving(false);
    setEditing(false);
    onSaved?.();
  };

  if (!profile && !editing) {
    return (
      <div className="bg-card rounded-xl border border-border p-5">
        <p className="text-sm text-muted-foreground">No profile data yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          <h2 className="font-heading text-base font-semibold">My Profile</h2>
        </div>
        {!editing ? (
          <Button size="sm" variant="outline" onClick={startEdit} className="gap-1.5 text-xs">
            <Edit3 className="w-3.5 h-3.5" /> Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="gap-1 text-xs">
              <X className="w-3.5 h-3.5" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 text-xs bg-primary text-white">
              <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        {!editing ? (
          <>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Full Name</p>
                <p className="font-medium">{profile?.full_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Gender</p>
                <p className="font-medium capitalize">{profile?.gender?.replace(/_/g, " ") || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Date of Birth</p>
                <p className="font-medium">{profile?.dob ? moment(profile.dob).format("DD MMM YYYY") : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                <p className="font-medium">{profile?.phone || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Address</p>
                <p className="font-medium">{profile?.address || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Language</p>
                <p className="font-medium">{profile?.preferred_language || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Preferred Therapist Gender</p>
                <p className="font-medium capitalize">{profile?.preferred_therapist_gender?.replace(/_/g, " ") || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Previous Therapy</p>
                <p className="font-medium">{profile?.previous_therapy ? "Yes" : "No"}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Main Concerns</p>
              <div className="flex flex-wrap gap-1.5">
                {(profile?.main_concerns || []).length > 0
                  ? profile.main_concerns.map((c) => (
                      <span key={c} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{c}</span>
                    ))
                  : <span className="text-sm text-muted-foreground">—</span>
                }
              </div>
            </div>
            {/* Profile Status */}
            <div className="flex items-center gap-2 pt-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-700 font-medium">Profile Complete</span>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Full Name</Label>
                <Input className="mt-1 h-9 text-sm" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input className="mt-1 h-9 text-sm" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Address</Label>
              <Input className="mt-1 h-9 text-sm" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Preferred Language</Label>
              <Input className="mt-1 h-9 text-sm" value={form.preferred_language} onChange={(e) => setForm({ ...form, preferred_language: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Preferred Therapist Gender</Label>
              <div className="flex gap-2 mt-1">
                {THERAPIST_GENDERS.map((g) => (
                  <button key={g} onClick={() => setForm({ ...form, preferred_therapist_gender: g.toLowerCase().replace(/ /g, "_") })}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${form.preferred_therapist_gender === g.toLowerCase().replace(/ /g, "_") ? "border-primary bg-primary/10 text-primary" : "border-gray-200 text-gray-600"}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Main Concerns</Label>
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                {CONCERNS.map((c) => (
                  <button key={c} onClick={() => toggleConcern(c)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left text-xs transition-all ${form.main_concerns.includes(c) ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-gray-700"}`}>
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${form.main_concerns.includes(c) ? "bg-primary border-primary" : "border-gray-300"}`}>
                      {form.main_concerns.includes(c) && <span className="text-white text-[8px]">✓</span>}
                    </div>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["customer-profile", user?.id],
    queryFn: async () => {
      function toUUID(id) {
        if (!id) return id;
        if (id.includes('-')) return id;
        const hex = id.replace(/[^a-fA-F0-9]/g, '');
        if (hex.length === 24) {
          const p = hex.padEnd(32, '0');
          return `${p.slice(0,8)}-${p.slice(8,12)}-${p.slice(12,16)}-${p.slice(16,20)}-${p.slice(20)}`;
        }
        return id;
      }
      
      // Fetch from Supabase (source of truth for profile completion)
      const { data: supaProfile } = await supabase
        .from("customer_profiles")
        .select("*")
        .eq("user_id", toUUID(user.id))
        .maybeSingle();

      // Fetch from Base44 (source of truth for free_support_used managed by admins)
      const base44Profiles = await base44.entities.CustomerProfile.filter({ user_id: user.id });
      const b44Profile = base44Profiles[0] || {};

      if (!supaProfile && !b44Profile.id) return null;

      // Merge them, prioritizing Supabase for profile info and Base44 for support flags
      return {
        ...supaProfile,
        ...b44Profile,
        profile_complete: supaProfile?.profile_complete || b44Profile?.profile_complete || false,
        free_support_used: b44Profile?.free_support_used || false,
      };
    },
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["customer-sessions", user?.id],
    queryFn: () => base44.entities.Session.filter({ customer_id: user?.id }, "-session_date", 10),
    enabled: !!user?.id,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["customer-payments", user?.id],
    queryFn: () => base44.entities.Payment.filter({ customer_id: user?.id }, "-payment_date", 5),
    enabled: !!user?.id,
  });

  const { data: freeSessions = [] } = useQuery({
    queryKey: ["customer-free-sessions", user?.id],
    queryFn: () => base44.entities.SupportSession.filter({ customer_id: user?.id }, "-created_date", 5),
    enabled: !!user?.id,
  });

  const upcomingSessions = sessions.filter(s => s.status === "scheduled" && moment(s.session_date).isSameOrAfter(moment(), "day"));
  const completedSessions = sessions.filter(s => s.status === "completed");
  const totalSpent = payments.filter(p => p.status === "completed").reduce((sum, p) => sum + (p.amount || 0), 0);
  const profileIncomplete = !profile?.profile_complete;

  const activeFreeSession = freeSessions.find(s => {
    if (s.status === "completed" || s.status === "cancelled") return false;
    if (s.timer_end_at && new Date(s.timer_end_at) <= new Date()) return false;
    return true;
  });

  const hasUsedFreeSupport = profile?.free_support_used || freeSessions.length > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Profile incomplete warning */}
      {profileIncomplete && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">⚠ Profile Setup Pending</p>
            <p className="text-xs text-amber-700 mt-0.5">Complete your profile to access Talk Freely and Find Support features.</p>
          </div>
          <Link to="/customer-onboarding">
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">Complete Now</Button>
          </Link>
        </div>
      )}

      {/* Active Free Chat Banner */}
      {activeFreeSession && (
        <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-primary">You have an active free support session</p>
              <p className="text-xs text-primary/80 mt-0.5">Don't lose your connection. Return to the chat now.</p>
            </div>
          </div>
          <Button onClick={() => navigate(`/free-chat?session=${activeFreeSession.id}`)} className="bg-primary hover:bg-primary/90 text-white shadow-sm">
            Return to Active Chat
          </Button>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">
          Welcome back, {profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0]} 👋
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Your mental wellness overview</p>
      </div>

      {/* Primary Action Buttons */}
      <div className={`grid gap-4 ${hasUsedFreeSupport ? "grid-cols-1 max-w-md" : "sm:grid-cols-2"}`}>
        {!hasUsedFreeSupport && (
          <button
            onClick={() => navigate("/talk-freely")}
            disabled={profileIncomplete}
            className={`group rounded-2xl p-6 border-2 text-left transition-all ${profileIncomplete ? "opacity-50 cursor-not-allowed border-gray-200 bg-white" : "border-primary/30 bg-white hover:border-primary hover:shadow-md cursor-pointer"}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wide text-primary">Free</span>
            </div>
            <h3 className="font-display text-xl font-bold text-gray-900 mb-1">Talk Freely</h3>
            <p className="text-sm text-gray-500">A safe space to express yourself freely. Start a free 10-minute chat session.</p>
            <div className="mt-4 flex items-center gap-1 text-primary text-sm font-semibold group-hover:gap-2 transition-all">
              Start Free Chat <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        )}

        <button
          onClick={() => navigate("/find-support")}
          disabled={profileIncomplete}
          className={`group rounded-2xl p-6 border-2 text-left transition-all ${profileIncomplete ? "opacity-50 cursor-not-allowed border-gray-200 bg-white" : "border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 hover:border-amber-400 hover:shadow-md cursor-pointer"}`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <HeartHandshake className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wide text-amber-600">⭐ Premium</span>
          </div>
          <h3 className="font-display text-xl font-bold text-amber-900 mb-1">Find Support</h3>
          <p className="text-sm text-amber-700">Get matched with a dedicated therapist for professional, ongoing support.</p>
          <div className="mt-4 flex items-center gap-1 text-amber-600 text-sm font-semibold group-hover:gap-2 transition-all">
            Find a Therapist <ArrowRight className="w-4 h-4" />
          </div>
        </button>
      </div>
      {profileIncomplete && (
        <p className="text-center text-xs text-amber-700 -mt-3 font-medium">Complete your profile above to unlock these features.</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Calendar, label: "Upcoming Sessions", value: upcomingSessions.length },
          { icon: Clock, label: "Completed Sessions", value: completedSessions.length },
          { icon: UserCheck, label: "Therapist Assigned", value: profile?.assigned_therapist_id ? "Yes" : "Not yet" },
          { icon: CreditCard, label: "Total Spent", value: `₹${totalSpent.toLocaleString()}` },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <s.icon className="w-3.5 h-3.5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Profile Section */}
      {profile?.profile_complete && (
        <ProfileSection
          profile={profile}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["customer-profile", user?.id] })}
        />
      )}

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <div className="bg-card rounded-xl border border-border">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-heading text-base font-semibold">Upcoming Sessions</h2>
            <Link to="/sessions">
              <Button variant="ghost" size="sm" className="gap-1 text-primary text-xs">View All <ArrowRight className="w-3 h-3" /></Button>
            </Link>
          </div>
          <div className="p-5 space-y-3">
            {upcomingSessions.map(session => (
              <div key={session.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/40">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{session.therapist_name || "Therapist"}</p>
                    <p className="text-xs text-muted-foreground">{moment(session.session_date).format("ddd, MMM D")} · {session.start_time}</p>
                  </div>
                </div>
                <Badge className="bg-blue-100 text-blue-800 border-0 text-xs">
                  {session.session_type?.replace("_", " ") || session.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerDashboard() {
  return (
    <RoleGuard allowedRoles={["customer"]}>
      <DashboardContent />
    </RoleGuard>
  );
}