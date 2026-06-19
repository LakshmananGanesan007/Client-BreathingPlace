import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import { Clock, CheckCircle2, XCircle, Heart, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TherapistPending() {
  const { user, refreshUserProfile } = useAuth();
  const navigate = useNavigate();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["therapist-profile-pending", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("therapist_profiles")
        .select("approval_status, rejection_reason")
        .eq("user_id", user.id)
        .maybeSingle();
      return data || null;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-7 h-7 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const status = profile?.approval_status;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-3">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">BreathingPlace</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-8 text-center shadow-sm">
          {status === "approved" ? (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">You Are Approved!</h1>
              <p className="text-muted-foreground text-sm mb-6">
                Your profile has been verified. You can now access your therapist dashboard and start accepting clients.
              </p>
              <Button
                onClick={async () => {
                  await refreshUserProfile();
                  navigate("/therapist");
                }}
                className="gap-2 rounded-full px-8"
              >
                Go to Dashboard
              </Button>
            </>
          ) : status === "rejected" ? (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">Application Not Approved</h1>
              <p className="text-muted-foreground text-sm mb-4">
                Your application was reviewed and could not be approved at this time.
              </p>
              {profile?.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-left">
                  <p className="text-xs font-semibold text-red-800 mb-1">Reason provided:</p>
                  <p className="text-sm text-red-700">{profile.rejection_reason}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground mb-5">
                Please contact support if you believe this was a mistake.
              </p>
              <Link to="/">
                <Button variant="outline" className="rounded-full px-8">Back to Home</Button>
              </Link>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">Application Under Review</h1>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-left">
                <p className="text-sm text-amber-800 leading-relaxed">
                  Your application has been submitted successfully and is currently under review by our team. You will be able to receive client assignments once your profile has been approved by the Super Admin.
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-4 mb-5 text-left">
                <ul className="text-xs text-muted-foreground space-y-2.5">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> Profile submitted successfully
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" /> Credentials under admin review
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" /> Awaiting final approval
                  </li>
                </ul>
              </div>

              <Button
                variant="outline"
                className="gap-2 rounded-full mb-3"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="w-4 h-4" /> Check Status
              </Button>
              <div>
                <Link to="/">
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                    Return to Home
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}