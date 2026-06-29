import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, Video, X, Maximize2, Minimize2, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { createDailyRoom } from "@/lib/daily";
import { useAuth } from "@/lib/AuthContext";
import SessionFeedbackDialog from "./SessionFeedbackDialog";

const DEFAULT_VIDEO_CONFIG = { session_duration_minutes: 50, warning_minutes: 45 };

export default function VideoCallModal({ session, open, onClose }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState(null);
  const [error, setError] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [videoConfig, setVideoConfig] = useState(DEFAULT_VIDEO_CONFIG);
  const [showFeedback, setShowFeedback] = useState(false);
  const iframeRef = useRef(null);

  const isCustomer = user?.role === "customer";

  useEffect(() => {
    if (!open || !session?.id) return;

    setLoading(true);
    setError(null);
    setMeetingUrl(null);
    setSecondsElapsed(0);

    // Load video config from platform_settings
    supabase
      .from("platform_settings")
      .select("setting_value")
      .eq("setting_type", "video_config")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.setting_value) setVideoConfig({ ...DEFAULT_VIDEO_CONFIG, ...data.setting_value });
      });

    // Check if room URL already stored on session
    if (session.video_room_url) {
      setMeetingUrl(session.video_room_url);
      setLoading(false);
      return;
    }

    // Create Daily.co room
    createDailyRoom(session.id)
      .then(async (roomUrl) => {
        setMeetingUrl(roomUrl);
        // Persist room URL on session so both parties share the same room
        await supabase.from("sessions").update({ video_room_url: roomUrl, status: "in_progress" }).eq("id", session.id);
      })
      .catch((err) => {
        setError(err.message || "Failed to start video call. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [open, session?.id]);

  // Timer
  useEffect(() => {
    if (!meetingUrl || !open) return;

    const maxSeconds = (videoConfig.session_duration_minutes ?? 50) * 60;
    const warningSeconds = (videoConfig.warning_minutes ?? 45) * 60;

    const timerInterval = setInterval(() => {
      setSecondsElapsed(prev => {
        const next = prev + 1;
        if (next === warningSeconds) {
          const remainingMins = Math.round((maxSeconds - warningSeconds) / 60);
          toast.warning(`${remainingMins} minutes remaining. Session ends at ${videoConfig.session_duration_minutes} minutes.`, { duration: 10000 });
        }
        if (next >= maxSeconds) {
          toast.error(`Session ended. Maximum ${videoConfig.session_duration_minutes} minutes reached.`);
          handleSessionEnd();
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [meetingUrl, open, videoConfig]);

  const formatTimer = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSessionEnd = async () => {
    // Mark session as completed
    if (session?.id) {
      await supabase.from("sessions").update({ status: "completed" }).eq("id", session.id).catch(() => {});
    }
    setMeetingUrl(null);
    if (isCustomer) setShowFeedback(true);
    else onClose?.();
  };

  const handleClose = () => {
    setMeetingUrl(null);
    setError(null);
    setFullscreen(false);
    setSecondsElapsed(0);
    if (isCustomer && secondsElapsed > 60) {
      // Show feedback if session lasted more than 1 minute
      setShowFeedback(true);
    } else {
      onClose?.();
    }
  };

  const handleFeedbackClose = () => {
    setShowFeedback(false);
    onClose?.();
  };

  return (
    <>
      <Dialog open={open && !showFeedback} onOpenChange={handleClose}>
        <DialogContent
          className={`p-0 gap-0 overflow-hidden border-0 ${
            fullscreen
              ? "fixed inset-0 max-w-none w-screen h-screen rounded-none"
              : "max-w-5xl w-[95vw] h-[85vh] rounded-2xl"
          }`}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 bg-slate-900 text-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
                <Video className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <span className="text-sm font-bold block">
                  {session?.therapist_name ? `Session with ${session.therapist_name}` : "Video Session"}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Daily.co · Secure Room</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {meetingUrl && (
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  secondsElapsed >= (videoConfig.warning_minutes ?? 45) * 60
                    ? "bg-red-500/20 text-red-400 border-red-500/50 animate-pulse"
                    : "bg-slate-800 text-slate-300 border-slate-700"
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  {formatTimer(secondsElapsed)} / {String(videoConfig.session_duration_minutes ?? 50).padStart(2, "0")}:00
                </div>
              )}
              <div className="flex items-center gap-1 border-l border-slate-700 pl-4">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                  onClick={() => setFullscreen(f => !f)}>
                  {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
                <Button variant="destructive" size="icon" className="h-8 w-8 rounded-lg ml-1" onClick={handleClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 bg-black flex items-center justify-center" style={{ height: "calc(100% - 56px)" }}>
            {loading && (
              <div className="flex flex-col items-center gap-4 text-white">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <p className="text-sm font-medium text-slate-300">Creating your secure video room...</p>
                <p className="text-xs text-slate-500">Powered by Daily.co</p>
              </div>
            )}
            {error && (
              <div className="flex flex-col items-center gap-3 text-white text-center px-6">
                <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Video className="w-6 h-6 text-red-500" />
                </div>
                <p className="text-sm font-semibold text-red-300">{error}</p>
                <p className="text-xs text-slate-400">Make sure the Daily.co Edge Function is deployed in Supabase.</p>
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

      {/* Feedback dialog after session ends */}
      <SessionFeedbackDialog
        open={showFeedback}
        onClose={handleFeedbackClose}
        session={session}
        customerId={user?.id}
        therapistId={session?.therapist_id}
      />
    </>
  );
}
