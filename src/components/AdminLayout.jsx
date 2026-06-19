import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { LayoutDashboard, Users, UserCheck, Calendar, Settings, FileText, IndianRupee, TrendingUp, HeartHandshake } from "lucide-react";
import DashboardLayout from "./DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function AdminNavItems() {
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["admin-pending-approvals-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("therapist_profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("approval_status", "pending");
      if (error) return 0;
      return data?.length || 0;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const baseNavItems = [
    { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { path: "/admin/users", label: "Users", icon: Users },
    { 
      path: "/admin/approvals", 
      label: (
        <div className="flex items-center gap-2">
          <span>Approvals</span>
          {pendingCount > 0 && (
            <Badge className="bg-red-500 text-white border-0 text-xs px-1.5 h-5 min-w-[20px]">
              {pendingCount}
            </Badge>
          )}
        </div>
      ),
      icon: UserCheck 
    },
    { path: "/admin/sessions", label: "Sessions", icon: Calendar },
    { path: "/admin/free-support", label: "Free Support Queue", icon: HeartHandshake },
    { path: "/admin/fees", label: "Fee Management", icon: IndianRupee },
    { path: "/admin/revenue", label: "Revenue Reports", icon: TrendingUp },
    { path: "/admin/blog", label: "Blog Posts", icon: FileText },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  return baseNavItems;
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navItems = AdminNavItems();
  
  return <DashboardLayout navItems={navItems} user={user} onLogout={logout} />;
}