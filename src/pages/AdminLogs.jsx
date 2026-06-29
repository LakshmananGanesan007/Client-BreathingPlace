import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollText, RefreshCw, Search, AlertCircle, Info, CheckCircle, XCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import moment from "moment";

const LOG_LEVEL_STYLES = {
  info: { badge: "bg-blue-100 text-blue-800", icon: Info, color: "text-blue-600" },
  success: { badge: "bg-green-100 text-green-800", icon: CheckCircle, color: "text-green-600" },
  warning: { badge: "bg-yellow-100 text-yellow-800", icon: AlertCircle, color: "text-yellow-600" },
  error: { badge: "bg-red-100 text-red-800", icon: XCircle, color: "text-red-600" },
};

const EVENT_TYPE_LABELS = {
  user_login: "User Login",
  user_logout: "User Logout",
  session_created: "Session Created",
  session_updated: "Session Updated",
  session_cancelled: "Session Cancelled",
  payment_initiated: "Payment Initiated",
  payment_completed: "Payment Completed",
  payment_failed: "Payment Failed",
  therapist_approved: "Therapist Approved",
  therapist_rejected: "Therapist Rejected",
  free_support_started: "Free Chat Started",
  free_support_completed: "Free Chat Completed",
  admin_action: "Admin Action",
  system_error: "System Error",
};

export default function AdminLogs() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");

  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ["admin-system-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Fallback: If system_logs table doesn't exist, build logs from existing tables
  const { data: recentSessions = [] } = useQuery({
    queryKey: ["admin-logs-sessions-fallback"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sessions")
        .select("id, customer_name, therapist_name, status, session_date, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(100);
      return (data || []).map(s => ({
        id: `session-${s.id}`,
        event_type: s.status === "cancelled" ? "session_cancelled" : s.status === "completed" ? "session_updated" : "session_created",
        level: s.status === "cancelled" ? "warning" : "info",
        message: `Session ${s.status} — Customer: ${s.customer_name || "Unknown"}, Therapist: ${s.therapist_name || "Unknown"}`,
        metadata: s,
        created_at: s.updated_at || s.created_at,
        source: "sessions",
      }));
    },
    enabled: logs.length === 0 && !isLoading && !error,
  });

  const { data: recentPayments = [] } = useQuery({
    queryKey: ["admin-logs-payments-fallback"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("id, customer_id, amount, status, payment_method, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      return (data || []).map(p => ({
        id: `payment-${p.id}`,
        event_type: p.status === "completed" ? "payment_completed" : p.status === "failed" ? "payment_failed" : "payment_initiated",
        level: p.status === "failed" ? "error" : p.status === "completed" ? "success" : "info",
        message: `Payment ${p.status} — ₹${p.amount} via ${p.payment_method || "Cashfree"}`,
        metadata: p,
        created_at: p.created_at,
        source: "payments",
      }));
    },
    enabled: logs.length === 0 && !isLoading && !error,
  });

  const { data: recentFreeSupport = [] } = useQuery({
    queryKey: ["admin-logs-free-support-fallback"],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_sessions")
        .select("id, customer_name, assigned_therapist_name, status, session_type, created_at, started_at, ended_at")
        .order("created_at", { ascending: false })
        .limit(100);
      return (data || []).map(s => ({
        id: `support-${s.id}`,
        event_type: s.status === "completed" ? "free_support_completed" : "free_support_started",
        level: s.status === "cancelled" ? "warning" : s.status === "completed" ? "success" : "info",
        message: `Free Chat ${s.status} — ${s.customer_name || "Unknown"} · ${s.session_type || "General"}`,
        metadata: s,
        created_at: s.ended_at || s.started_at || s.created_at,
        source: "support_sessions",
      }));
    },
    enabled: logs.length === 0 && !isLoading && !error,
  });

  // Combine all sources and sort by date
  const allLogs = logs.length > 0
    ? logs
    : [...recentSessions, ...recentPayments, ...recentFreeSupport].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

  const filteredLogs = allLogs.filter(log => {
    const matchSearch = !search || log.message?.toLowerCase().includes(search.toLowerCase()) || log.event_type?.toLowerCase().includes(search.toLowerCase());
    const matchLevel = levelFilter === "all" || log.level === levelFilter;
    return matchSearch && matchLevel;
  });

  const levelCounts = {
    all: allLogs.length,
    info: allLogs.filter(l => l.level === "info").length,
    success: allLogs.filter(l => l.level === "success").length,
    warning: allLogs.filter(l => l.level === "warning").length,
    error: allLogs.filter(l => l.level === "error").length,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ScrollText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Activity Logs</h1>
            <p className="text-muted-foreground text-sm">Monitor user activities, system actions, and errors.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-system-logs"] })}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(levelCounts).map(([level, count]) => (
            <button
              key={level}
              onClick={() => setLevelFilter(level)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${levelFilter === level ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
            >
              {level} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-10 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <ScrollText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No logs found. Activity will appear here as users interact with the platform.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredLogs.slice(0, 200).map((log, i) => {
              const levelStyle = LOG_LEVEL_STYLES[log.level] || LOG_LEVEL_STYLES.info;
              const LevelIcon = levelStyle.icon;
              return (
                <div key={log.id || i} className="flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors">
                  <LevelIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${levelStyle.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className="text-sm text-foreground leading-relaxed">{log.message}</p>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0 whitespace-nowrap">
                        {moment(log.created_at).format("MMM D, h:mm A")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge className={`${levelStyle.badge} border-0 text-[10px] capitalize px-2 py-0`}>{log.level || "info"}</Badge>
                      {log.event_type && (
                        <span className="text-[10px] text-muted-foreground">{EVENT_TYPE_LABELS[log.event_type] || log.event_type}</span>
                      )}
                      {log.source && (
                        <span className="text-[10px] text-muted-foreground">· {log.source}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {filteredLogs.length > 200 && (
        <p className="text-xs text-center text-muted-foreground">Showing 200 of {filteredLogs.length} logs. Use search to narrow results.</p>
      )}
    </div>
  );
}
