import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Heart, User, Brain, ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { upsertUserProfile } from "@/lib/userProfile";

export default function CompleteProfile() {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // If user already has a role, skip selection entirely
  useEffect(() => {
    if (!userProfile) return;
    const { selected_role, profile_status } = userProfile;

    // Super admin always goes straight to admin dashboard — no onboarding ever
    if (selected_role === "super_admin" || selected_role === "admin") {
      navigate("/admin", { replace: true });
      return;
    }

    // Profile completed → go directly to dashboard
    if (profile_status === "completed") {
      if (selected_role === "customer") navigate("/dashboard", { replace: true });
      else if (selected_role === "therapist") navigate("/therapist", { replace: true });
      return;
    }
    // Profile pending → resume onboarding
    if (selected_role === "customer") navigate("/customer-onboarding", { replace: true });
    else if (selected_role === "therapist") navigate("/join-support", { replace: true });
  }, [userProfile]);

  const handleSelect = async (role) => {
    if (!user) { navigate("/login"); return; }
    setSaving(true);
    setError("");
    try {
      // Save immediately to Supabase before any redirect
      await upsertUserProfile(user.id, user.email, {
        selected_role: role,
        profile_status: "pending",
      });
      await refreshUserProfile();
      
      alert(`✓ Role selection saved successfully.\n\nTable Updated:\nuser_profiles\n\nRole:\n${role}`);

      if (role === "customer") {
        navigate("/customer-onboarding");
      } else {
        navigate("/join-support");
      }
    } catch (err) {
      console.error("[CompleteProfile] Supabase save error:", err, err.response?.data);
      const msg = err.response?.data?.error || err.message;
      if (msg.includes("Invalid Supabase token") || msg.includes("Missing supabase")) {
        setError("✕ Authentication session expired. Please log in again.");
      } else if (msg.includes("Row Level Security") || msg.includes("row-level security")) {
        setError("✕ Permission denied by RLS policy on user_profiles.");
      } else {
        setError(`✕ User role could not be saved in user_profiles table. Details: ${msg}`);
      }
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F0F0E0" }}>
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-3">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">Welcome to BreathingPlace</h1>
            <p className="text-gray-500 text-sm">How would you like to get started?</p>
            {user?.email && <p className="text-xs text-gray-400 mt-1">Signed in as {user.email}</p>}
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}

          <div className="space-y-4">
            {/* I'm Looking for Therapy */}
            <button
              onClick={() => handleSelect("customer")}
              disabled={saving}
              className="w-full bg-white rounded-2xl border-2 border-gray-200 hover:border-primary p-5 text-left transition-all group shadow-sm disabled:opacity-60"
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-heading text-base font-semibold text-gray-900 mb-1">I am Looking for Therapy</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">Connect with licensed therapists and start your mental wellness journey.</p>
                </div>
                {saving ? <Loader2 className="w-4 h-4 text-primary animate-spin mt-1" /> : <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors mt-1 flex-shrink-0" />}
              </div>
            </button>

            {/* Join Our Team as Therapist */}
            <button
              onClick={() => handleSelect("therapist")}
              disabled={saving}
              className="w-full bg-white rounded-2xl border-2 border-gray-200 hover:border-green-500 p-5 text-left transition-all group shadow-sm disabled:opacity-60"
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
                  <Brain className="w-5 h-5 text-green-700" />
                </div>
                <div className="flex-1">
                  <h3 className="font-heading text-base font-semibold text-gray-900 mb-1">Join Our Team as Therapist</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">Apply to join our platform and help others on their wellness journey.</p>
                </div>
                {saving ? <Loader2 className="w-4 h-4 text-green-600 animate-spin mt-1" /> : <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition-colors mt-1 flex-shrink-0" />}
              </div>
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">Your selection is saved instantly to our database before you continue.</p>
        </div>
      </div>
    </div>
  );
}