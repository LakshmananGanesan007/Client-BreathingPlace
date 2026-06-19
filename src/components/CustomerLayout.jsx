import { useAuth } from "@/lib/AuthContext";
import { LayoutDashboard, Calendar, CreditCard, Search, Settings } from "lucide-react";
import DashboardLayout from "./DashboardLayout";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/find-therapist", label: "Find Therapist", icon: Search },
  { path: "/sessions", label: "Sessions", icon: Calendar },
  { path: "/payments", label: "Payments", icon: CreditCard },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function CustomerLayout() {
  const { user, logout } = useAuth();
  return <DashboardLayout navItems={navItems} user={user} onLogout={logout} />;
}