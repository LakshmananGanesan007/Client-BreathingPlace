import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, Video, X, Maximize2, Minimize2 } from "lucide-react";

/**
 * VideoCallModal — wraps Daily.co room in an iframe.
 * Props:
 *   session   - Session entity object
 *   open      - boolean
 *   onClose   - callback
 */
export default function VideoCallModal({ session, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState(null);
  const [error, setError] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!open || !session?.id) return;
    setLoading(true);
    setError(null);
    setMeetingUrl(null);

    import("@/lib/supabaseClient").then(({ supabase }) => {
      supabase.auth.getSession().then(({ data: { session: authSession } }) => {
        base44.functions.invoke("createVideoRoom", { 
          session_id: session.id,
          supabaseToken: authSession?.access_token 
        })
          .then((res) => {
            setMeetingUrl(res.data.meeting_url);
          })
          .catch((err) => {
            setError(err?.response?.data?.error || "Failed to start video call.");
          })
          .finally(() => setLoading(false));
      });
    });
  }, [open, session?.id]);

  const handleClose = () => {
    setMeetingUrl(null);
    setError(null);
    setFullscreen(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={`p-0 gap-0 overflow-hidden border-0 ${
          fullscreen
            ? "fixed inset-0 max-w-none w-screen h-screen rounded-none"
            : "max-w-4xl w-[95vw] h-[85vh]"
        }`}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 text-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium">
              {session?.therapist_name
                ? `Session with ${session.therapist_name}`
                : session?.customer_name
                  ? `Session with ${session.customer_name}`
                  : "Video Session"}
            </span>
            <span className="text-xs text-gray-400 ml-1">
              {session?.session_date} · {session?.start_time}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-300 hover:text-white hover:bg-gray-700"
              onClick={() => setFullscreen(f => !f)}
            >
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-300 hover:text-white hover:bg-gray-700"
              onClick={handleClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-gray-950 flex items-center justify-center" style={{ height: "calc(100% - 44px)" }}>
          {loading && (
            <div className="flex flex-col items-center gap-3 text-white">
              <Loader2 className="w-8 h-8 animate-spin text-green-400" />
              <p className="text-sm text-gray-300">Setting up your secure room...</p>
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center gap-3 text-white text-center px-6">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <Video className="w-6 h-6 text-red-400" />
              </div>
              <p className="text-sm text-red-300">{error}</p>
              <Button size="sm" variant="outline" className="text-white border-gray-600" onClick={() => {
                setLoading(true);
                setError(null);
                import("@/lib/supabaseClient").then(({ supabase }) => {
                  supabase.auth.getSession().then(({ data: { session: authSession } }) => {
                    base44.functions.invoke("createVideoRoom", { 
                      session_id: session.id,
                      supabaseToken: authSession?.access_token
                    })
                      .then(res => setMeetingUrl(res.data.meeting_url))
                      .catch(err => setError(err?.response?.data?.error || "Failed to start video call."))
                      .finally(() => setLoading(false));
                  });
                });
              }}>
                Retry
              </Button>
            </div>
          )}
          {meetingUrl && (
            <iframe
              ref={iframeRef}
              src={meetingUrl}
              className="w-full h-full border-0"
              allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
              allowFullScreen
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}