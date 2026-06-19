import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TherapistApprovalCongrats({ onDismiss }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Fire confetti burst
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.5 },
      colors: ["#2E8B57", "#52c41a", "#faad14", "#1890ff", "#f5222d"],
    });
    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });
    }, 400);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Decorative background circles */}
        <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-green-50 opacity-60" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-primary/10 opacity-60" />

        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5 ring-4 ring-green-200">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <div className="text-4xl mb-3">🎉</div>

          <h2 className="font-display text-2xl font-bold text-foreground mb-2">
            Congratulations!
          </h2>
          <p className="text-base font-semibold text-green-700 mb-3">
            You're officially approved!
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Your profile has been verified by our Super Admin. You are now live on the platform and clients will be matched to you based on language and expertise.
          </p>

          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-left space-y-2">
            <p className="text-xs font-semibold text-green-800 mb-1">What happens next?</p>
            {[
              "Clients matching your language & specialization will be assigned to you",
              "You'll receive session requests in your dashboard",
              "Complete your availability in the Profile Editor to get more bookings",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-green-700">{item}</p>
              </div>
            ))}
          </div>

          <Button
            onClick={handleDismiss}
            className="w-full rounded-full bg-primary text-white font-semibold"
          >
            Start Accepting Clients 🚀
          </Button>
        </div>
      </div>
    </div>
  );
}