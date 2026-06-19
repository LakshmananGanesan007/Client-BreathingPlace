import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, CreditCard, User, Star, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";

const SESSION_TYPES = ["Chat", "Voice Call", "Video Call"];
const TIMES = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

function StarRating({ rating = 4.5 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= Math.round(rating) ? "text-yellow-500 fill-yellow-500" : "text-gray-200 fill-gray-200"}`} />
      ))}
    </div>
  );
}

export default function BookingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const therapistId = urlParams.get("therapist");
  const sessionTypeParam = urlParams.get("type") || "Video Call";

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [sessionType, setSessionType] = useState(sessionTypeParam);
  const [conflictWarning, setConflictWarning] = useState(false);
  const [booked, setBooked] = useState(false);

  const { data: therapist } = useQuery({
    queryKey: ["therapist-for-booking", therapistId],
    queryFn: async () => {
      const profiles = await base44.entities.TherapistProfile.filter({ id: therapistId });
      const t = profiles[0] || null;
      if (t && t.approval_status !== "approved") return null; // Block non-approved
      return t;
    },
    enabled: !!therapistId,
  });

  const { data: existingSessions = [] } = useQuery({
    queryKey: ["customer-sessions-check", user?.id],
    queryFn: () => base44.entities.Session.filter({ customer_id: user?.id }),
    enabled: !!user?.id,
  });

  const checkConflict = (date, time) => {
    if (!date || !time) return false;
    return existingSessions.some(s =>
      s.session_date === date && s.start_time === time && s.status === "scheduled"
    );
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    if (selectedTime) setConflictWarning(checkConflict(date, selectedTime));
  };

  const handleTimeChange = (time) => {
    setSelectedTime(time);
    setConflictWarning(checkConflict(selectedDate, time));
  };

  const bookSession = useMutation({
    mutationFn: async () => {
      const session = await base44.entities.Session.create({
        customer_id: user.id,
        customer_name: user.user_metadata?.full_name || user.email,
        therapist_id: therapist?.user_id,
        therapist_name: therapist?.full_name,
        session_date: selectedDate,
        start_time: selectedTime,
        end_time: moment(`${selectedDate} ${selectedTime}`, "YYYY-MM-DD HH:mm").add(1, "hour").format("HH:mm"),
        status: "scheduled",
        session_type: sessionType === "Video Call" ? "initial_consultation" : "regular",
        notes: `Session type: ${sessionType}`,
      });

      const { supabase } = await import("@/lib/supabaseClient");
      const { data: { session: authSession } } = await supabase.auth.getSession();

      // Create Payment through Cashfree
      const totalAmount = ((therapist?.consultation_fee || 499) * (1 + ((therapist?.platform_markup_percentage || 0) / 100))).toFixed(2);
      
      try {
        const paymentRes = await base44.functions.invoke("createPayment", {
          order_amount: totalAmount,
          order_currency: "INR",
          customer_name: user.user_metadata?.full_name || user.email,
          customer_email: user.email,
          session_id: session.id,
          therapist_id: therapist?.user_id,
          supabaseToken: authSession?.access_token
        });

        if (paymentRes.data?.payment_session_id) {
          // If Cashfree SDK was loaded, we would redirect. 
          // For now we just created the order on Cashfree servers successfully.
        }
      } catch (err) {
        console.error("Failed to create Cashfree payment order:", err);
      }

      // Notify therapist via email
      await base44.functions.invoke("sendEmailNotification", {
        to: therapist?.user_id,
        type: "session_request",
        session_id: session.id,
        customer_name: user.user_metadata?.full_name || user.email,
        session_date: selectedDate,
        session_time: selectedTime,
        supabaseToken: authSession?.access_token
      });

      return session;
    },
    onSuccess: () => {
      setBooked(true);
    },
    onError: () => {
      toast.error("Failed to book session. Please try again.");
    }
  });

  if (booked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-2xl border border-border p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">Session Requested!</h2>
          <p className="text-muted-foreground text-sm mb-1">
            Your session with <strong>{therapist?.full_name}</strong> has been requested.
          </p>
          <p className="text-sm text-muted-foreground mb-2">
            {moment(selectedDate).format("dddd, MMMM D YYYY")} at {selectedTime}
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            The therapist will review your request and accept it. You'll be notified once confirmed.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => navigate("/sessions")}>View Sessions</Button>
            <Button className="flex-1" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="font-display text-2xl font-bold mb-6">Book a Session</h1>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Therapist Card */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-2xl border border-border p-5 sticky top-4">
              <h3 className="font-heading text-sm font-semibold text-muted-foreground mb-4">Your Therapist</h3>
              {therapist ? (
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-muted mx-auto mb-3">
                    {therapist.profile_photo_url
                      ? <img src={therapist.profile_photo_url} alt={therapist.full_name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><User className="w-8 h-8 text-muted-foreground" /></div>}
                  </div>
                  <p className="font-semibold text-sm">{therapist.full_name}</p>
                  <p className="text-xs text-muted-foreground">{therapist.qualification}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <StarRating />
                    <span className="text-xs text-muted-foreground">4.8</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">Languages</p>
                    <p className="text-xs font-medium">{(therapist.languages || []).join(", ") || "—"}</p>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground">Total Session Fee</p>
                    <p className="text-lg font-bold text-primary">₹{((therapist.consultation_fee || 499) * (1 + ((therapist.platform_markup_percentage || 0) / 100))).toFixed(2)}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-sm">Loading...</div>
              )}
            </div>
          </div>

          {/* Booking Form */}
          <div className="lg:col-span-3 space-y-5">
            {/* Session Type */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="font-heading text-sm font-semibold mb-3">Session Type</h3>
              <div className="flex gap-2">
                {SESSION_TYPES.map(t => (
                  <button key={t} onClick={() => setSessionType(t)}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${sessionType === t ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="font-heading text-sm font-semibold mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" /> Select Date
              </h3>
              <Input type="date" min={moment().add(1, "day").format("YYYY-MM-DD")}
                value={selectedDate} onChange={e => handleDateChange(e.target.value)} />
            </div>

            {/* Time */}
            {selectedDate && (
              <div className="bg-card rounded-2xl border border-border p-5">
                <h3 className="font-heading text-sm font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> Select Time
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {TIMES.map(t => (
                    <button key={t} onClick={() => handleTimeChange(t)}
                      className={`py-2 rounded-lg border text-xs font-medium transition-all ${selectedTime === t ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conflict Warning */}
            {conflictWarning && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">You already have a session at this time. Please select a different time.</p>
              </div>
            )}

            {/* Summary & Book */}
            {selectedDate && selectedTime && !conflictWarning && (
              <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
                <h3 className="font-heading text-sm font-semibold">Booking Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{moment(selectedDate).format("ddd, MMM D YYYY")}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span>{selectedTime}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{sessionType}</span></div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Therapist Fee</span>
                    <span>₹{therapist?.consultation_fee || 499}</span>
                  </div>
                  {therapist?.platform_markup_percentage > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Platform Fee</span>
                      <span>₹{((therapist?.consultation_fee || 499) * (therapist?.platform_markup_percentage / 100)).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-2 font-semibold">
                    <span>Total Payable Amount</span>
                    <span className="text-primary">₹{((therapist?.consultation_fee || 499) * (1 + ((therapist?.platform_markup_percentage || 0) / 100))).toFixed(2)}</span>
                  </div>
                </div>
                <Button
                  className="w-full gap-2"
                  onClick={() => bookSession.mutate()}
                  disabled={bookSession.isPending}
                >
                  {bookSession.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirming...</>
                    : <><CreditCard className="w-4 h-4" /> Confirm & Request Session</>}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">🔒 Your data is secure. The therapist will confirm your session request.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}