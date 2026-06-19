import { useEffect, useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";

export default function CustomerSuccessScreen({ navigate }) {
  const audioRef = useRef(null);

  useEffect(() => {
    // Confetti burst
    const duration = 3000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors: ["#4CAF50","#8BC34A","#FFD700","#FF6B6B","#64B5F6"] });
      confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors: ["#4CAF50","#8BC34A","#FFD700","#FF6B6B","#64B5F6"] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();

    // Success sound using Web Audio API
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.4);
      });
    } catch (_) {}

    // Redirect after 5 seconds
    const timer = setTimeout(() => navigate("/dashboard"), 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#F0F0E0" }}>
      <div className="max-w-sm w-full text-center">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-lg p-8">
          {/* Animated checkmark */}
          <div className="flex items-center justify-center mb-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <CheckCircle2 className="w-12 h-12 text-primary" />
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping opacity-40" />
            </div>
          </div>

          <h2 className="font-display text-xl font-bold text-gray-900 mb-2">
            You have successfully completed your profile.
          </h2>

          <div className="my-5 p-4 bg-primary/5 rounded-2xl border border-primary/10">
            <p className="text-sm text-gray-600 italic leading-relaxed">
              "The curious paradox is that when I accept myself just as I am, then I can change."
            </p>
            <p className="text-xs text-primary font-semibold mt-2">— Carl Rogers</p>
          </div>

          <p className="text-xs text-gray-400">Redirecting to your dashboard in a few seconds…</p>

          {/* Progress bar countdown */}
          <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-[shrink_5s_linear_forwards]" style={{ width: "100%", animation: "shrink 5s linear forwards" }} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}