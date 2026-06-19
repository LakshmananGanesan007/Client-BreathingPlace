import { useAuth } from "@/lib/AuthContext";
import { Navigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Wraps a route and enforces that the logged-in user has one of the allowed roles.
 * Role is read from Supabase user_profiles.selected_role (never from Base44/auth user object).
 */
export default function RoleGuard({ allowedRoles = [], children }) {
  const { user, userProfile, isLoadingAuth } = useAuth();

  if (isLoadingAuth) return null;
  if (!user) return <Navigate to="/login" replace />;

  // Role comes from Supabase user_profiles table
  const role = userProfile?.selected_role || "customer";

  // Super admin / admin come from Supabase user metadata role field
  const metaRole = user?.user_metadata?.role || user?.role || "";
  const effectiveRoles = [role];
  if (metaRole === "super_admin" || metaRole === "admin") {
    effectiveRoles.push(metaRole);
    effectiveRoles.push("admin");
  }

  const allowed = allowedRoles.some(r => effectiveRoles.includes(r));

  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4 p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="font-display text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground max-w-sm">
          You don't have permission to access this page.
        </p>
        <div className="flex gap-3 mt-2">
          <Button variant="outline" onClick={() => window.history.back()}>Go Back</Button>
          <Button onClick={() => { window.location.href = "/home"; }}>Go Home</Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Logged in as <span className="font-medium">{user?.email}</span> · Role: <span className="font-medium capitalize">{role || "unknown"}</span>
        </p>
      </div>
    );
  }

  return children;
}