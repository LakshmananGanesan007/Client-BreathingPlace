import { useAuth } from "@/lib/AuthContext";
import { Navigate } from "react-router-dom";

export default function RoleRouter() {
  const { user, userProfile, isLoadingAuth } = useAuth();

  // Wait for auth AND profile to be fully loaded
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // No Supabase profile → select path first
  if (!userProfile) return <Navigate to="/complete-profile" replace />;

  const { selected_role, profile_status } = userProfile;

  // Admin/super_admin check — from EITHER metadata OR selected_role in profile (highest priority)
  const metaRole = user?.user_metadata?.role || user?.role || "";
  const isAdmin = metaRole === "super_admin" || metaRole === "admin" || selected_role === "super_admin" || selected_role === "admin";
  if (isAdmin) return <Navigate to="/admin" replace />;

  // Profile not completed → send to appropriate onboarding
  if (profile_status !== "completed") {
    if (selected_role === "customer") return <Navigate to="/customer-onboarding" replace />;
    if (selected_role === "therapist") return <Navigate to="/join-support" replace />;
    return <Navigate to="/complete-profile" replace />;
  }

  // Profile completed - redirect to role-specific dashboard
  if (selected_role === "customer") return <Navigate to="/dashboard" replace />;
  if (selected_role === "therapist") {
    return <Navigate to="/therapist" replace />;
  }

  return <Navigate to="/complete-profile" replace />;
}