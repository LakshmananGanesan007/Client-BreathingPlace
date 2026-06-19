import { useAuth } from "@/lib/AuthContext";
import { LayoutDashboard, Calendar, Clock, Settings, UserCircle } from "lucide-react";
import DashboardLayout from "./DashboardLayout";

const navItems = [
  { path: "/therapist", label: "Dashboard", icon: LayoutDashboard },
  { path: "/therapist/sessions", label: "Sessions", icon: Calendar },
  { path: "/therapist/calendar", label: "My Calendar", icon: Clock },
  { path: "/therapist/profile-editor", label: "My Profile", icon: UserCircle },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function TherapistLayout() {
  const { user, logout } = useAuth();
  return <DashboardLayout navItems={navItems} user={user} onLogout={logout} />;
}