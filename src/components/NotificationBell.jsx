import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import moment from "moment";

export default function NotificationBell() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => base44.entities.Notification.filter({ user_id: user?.id }, "-created_date", 20),
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  const unread = notifications.filter(n => !n.read).length;

  const markRead = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  const markAllRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.read);
    await Promise.all(unreadNotifs.map(n => base44.entities.Notification.update(n.id, { read: true })));
    queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
  };

  const typeColors = {
    session_request: "bg-blue-100 text-blue-700",
    session_accepted: "bg-green-100 text-green-700",
    payment_confirmed: "bg-purple-100 text-purple-700",
    schedule_change: "bg-amber-100 text-amber-700",
    new_message: "bg-primary/10 text-primary",
    session_reminder: "bg-orange-100 text-orange-700",
    general: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-lg hover:bg-muted transition-colors">
        <Bell className="w-5 h-5 text-foreground" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-heading text-sm font-semibold">Notifications</h3>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>
                )}
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => !n.read && markRead.mutate(n.id)}
                    className={`px-4 py-3 border-b border-border hover:bg-muted/50 cursor-pointer transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 mt-0.5 ${typeColors[n.type] || typeColors.general}`}>
                        {n.type?.replace("_", " ")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{n.title}</p>
                        {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                        <p className="text-[10px] text-muted-foreground mt-1">{moment(n.created_date).fromNow()}</p>
                      </div>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}