import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Monitor, X, Loader2, Grid, Square } from "lucide-react";

/**
 * AdminVideoMonitor — lets super_admin/admin observe multiple live sessions.
 * Shows a grid of iframes for in_progress sessions.
 */
export default function AdminVideoMonitor({ sessions }) {
  const [activeRooms, setActiveRooms] = useState({}); // sessionId -> { url, loading, error }
  const [layout, setLayout] = useState("grid"); // "grid" | "single"
  const [focusedId, setFocusedId] = useState(null);

  const inProgress = sessions.filter(s => s.status === "in_progress" && s.meeting_url);

  const joinRoom = async (session) => {
    setActiveRooms(prev => ({ ...prev, [session.id]: { loading: true } }));
    const { supabase } = await import("@/lib/supabaseClient");
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const res = await base44.functions.invoke("createVideoRoom", { 
      session_id: session.id,
      supabaseToken: authSession?.access_token 
    });
    const url = res?.data?.meeting_url;
    setActiveRooms(prev => ({
      ...prev,
      [session.id]: url
        ? { url, loading: false }
        : { error: "Failed to join room", loading: false },
    }));
    if (url && layout === "single") setFocusedId(session.id);
  };

  const leaveRoom = (id) => {
    setActiveRooms(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (focusedId === id) setFocusedId(null);
  };

  const activeIds = Object.keys(activeRooms);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-sm">Live Session Monitor</h3>
          {inProgress.length > 0 && (
            <Badge className="bg-green-100 text-green-800 border-0 text-xs">{inProgress.length} Live</Badge>
          )}
        </div>
        {activeIds.length > 1 && (
          <div className="flex items-center gap-1 border border-border rounded-lg p-0.5">
            <button
              onClick={() => setLayout("grid")}
              className={`p-1.5 rounded-md transition-colors ${layout === "grid" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setLayout("single"); setFocusedId(activeIds[0]); }}
              className={`p-1.5 rounded-md transition-colors ${layout === "single" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* No live sessions */}
      {inProgress.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <Video className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No sessions currently in progress.</p>
        </div>
      )}

      {/* Session tiles */}
      {inProgress.length > 0 && (
        <div className="space-y-2">
          {inProgress.map(session => {
            const room = activeRooms[session.id];
            return (
              <div key={session.id} className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Row header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-medium">{session.customer_name} ↔ {session.therapist_name}</span>
                    <span className="text-xs text-muted-foreground">{session.start_time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!room && (
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={() => joinRoom(session)}>
                        <Video className="w-3 h-3" /> Observe
                      </Button>
                    )}
                    {room?.url && (
                      <>
                        {layout === "grid" && activeIds.length > 1 && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setFocusedId(session.id); setLayout("single"); }}>
                            Focus
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => leaveRoom(session.id)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Iframe */}
                {room?.loading && (
                  <div className="h-24 flex items-center justify-center bg-gray-950">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                )}
                {room?.error && (
                  <div className="h-16 flex items-center justify-center bg-gray-950 text-red-400 text-xs">
                    {room.error}
                  </div>
                )}
                {room?.url && (
                  <div
                    className={
                      layout === "single" && focusedId === session.id
                        ? "h-[75vh]"
                        : layout === "grid" && activeIds.length > 1
                          ? "h-64"
                          : "h-[75vh]"
                    }
                  >
                    <iframe
                      src={room.url}
                      className="w-full h-full border-0"
                      allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}