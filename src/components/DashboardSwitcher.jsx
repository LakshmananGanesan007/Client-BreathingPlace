import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Stethoscope } from "lucide-react";

/**
 * Shown when the logged-in user has the "therapist" role
 * (which implicitly means they also have customer access).
 */
export default function DashboardSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const isTherapistView = location.pathname.startsWith("/therapist");

  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1 text-xs font-medium">
      <button
        onClick={() => navigate("/dashboard")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
          !isTherapistView
            ? "bg-white shadow text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <LayoutDashboard className="w-3.5 h-3.5" />
        Customer
      </button>
      <button
        onClick={() => navigate("/therapist")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
          isTherapistView
            ? "bg-white shadow text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Stethoscope className="w-3.5 h-3.5" />
        Therapist
      </button>
    </div>
  );
}