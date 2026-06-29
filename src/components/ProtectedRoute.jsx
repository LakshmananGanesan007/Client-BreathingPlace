import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

// Paths that bypass profile-status and role checks entirely
const ALWAYS_EXEMPT = [
  "/complete-profile", "/customer-onboarding", "/join-support",
  "/login", "/register", "/forgot-password", "/reset-password",
  "/pending-approval", "/home",
];

// Customer-only routes — therapists/admins must NOT access these
const CUSTOMER_ONLY_ROUTES = ["/dashboard", "/payments", "/sessions", "/find-therapist", "/book", "/chat"];
// Therapist-only routes — customers/admins must NOT access these
const THERAPIST_ONLY_ROUTES = ["/therapist", "/therapist/sessions", "/therapist/calendar", "/therapist/profile-editor", "/therapist/payments", "/therapist/free-chat"];

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement }) {
  const { isAuthenticated, isLoadingAuth, authChecked, userProfile, user } = useAuth();
  const location = useLocation();

  // Wait for auth to be fully checked before rendering anything
  if (isLoadingAuth || !authChecked) return fallback;
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) return unauthenticatedElement;

  const isExempt = ALWAYS_EXEMPT.some(p => location.pathname.startsWith(p));
  if (isExempt) return <Outlet />;

  // No Supabase profile at all → must select path
  if (!userProfile) {
    return <Navigate to="/complete-profile" replace />;
  }

  const role = userProfile.selected_role;
  const metaRole = user?.user_metadata?.role || user?.role || "";
  const isAdmin = metaRole === "admin" || metaRole === "super_admin" || role === "admin" || role === "super_admin";

  // Profile not completed → send to onboarding (admins bypass)
  if (!isAdmin && userProfile.profile_status !== "completed") {
    if (role === "customer") return <Navigate to="/customer-onboarding" replace />;
    if (role === "therapist") return <Navigate to="/join-support" replace />;
    return <Navigate to="/complete-profile" replace />;
  }

  // Enforce strict role-based route separation (admins bypass)
  if (!isAdmin) {
    const isCustomerRoute = CUSTOMER_ONLY_ROUTES.some(p => location.pathname.startsWith(p));
    const isTherapistRoute = THERAPIST_ONLY_ROUTES.some(p => location.pathname.startsWith(p));
    const isAdminRoute = location.pathname.startsWith("/admin");

    // Admin routes are completely off-limits for non-admins
    if (isAdminRoute) {
      return <Navigate to="/home" replace />;
    }

    // Therapists must never land on customer routes
    if (role === "therapist" && isCustomerRoute) {
      const approvalStatus = userProfile?.approval_status;
      if (!approvalStatus || approvalStatus === "pending") return <Navigate to="/pending-approval" replace />;
      return <Navigate to="/therapist" replace />;
    }

    // Therapist routes are accessible even when pending — dashboard shows review status inline
    // Customers must never land on therapist routes
    if (role === "customer" && isTherapistRoute) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
}