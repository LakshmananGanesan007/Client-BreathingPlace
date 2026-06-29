import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Calendar, Clock, User, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import { initiateCashfreePayment } from "@/lib/cashfree";

const TIMES = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

export default function BookingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const therapistId = searchParams.get("therapist");
  const sessionType = searchParams.get("type") || "Video Session";
  const finalPrice = parseFloat(searchParams.get("price") || "499");

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const { data: therapist } = useQuery({
    queryKey: ["therapist-for-booking", therapistId],
    queryFn: async () => {
      const { data } = await supabase
        .from("therapist_profiles")
        .select("*")
        .eq("id", therapistId)
        .maybeSingle();
      return data || null;
    },
    enabled: !!therapistId,
  });

  const handlePayNow = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time.");
      return;
    }
    if (!user) {
      navigate("/login");
      return;
    }

    setIsProcessingPayment(true);
    const orderId = `BP_${user.id.slice(0, 8)}_${Date.now()}`;

    try {
      // Step 1: Pre-create session in "payment_pending" state
      const endTime = moment(`${selectedDate} ${selectedTime}`, "YYYY-MM-DD HH:mm")
        .add(50, "minutes")
        .format("HH:mm");

      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          customer_id: user.id,
          customer_name: user.user_metadata?.full_name || user.email,
          therapist_id: therapist?.user_id,
          therapist_name: therapist?.full_name,
          session_date: selectedDate,
          start_time: selectedTime,
          end_time: endTime,
          status: "payment_pending",
          session_type: "initial_consultation",
        })
        .select()
        .single();

      if (sessionError) throw new Error("Failed to create session. Please try again.");

      // Step 2: Save booking context to localStorage so PaymentReturn can finalize it
      localStorage.setItem(
        "bp_pending_booking",
        JSON.stringify({
          sessionId: session.id,
          orderId,
          therapistId: therapist?.id,
          therapistUserId: therapist?.user_id,
          therapistName: therapist?.full_name,
          sessionDate: selectedDate,
          sessionTime: selectedTime,
          sessionType,
          finalPrice,
          customerEmail: user.email,
          customerName: user.user_metadata?.full_name || user.email,
          createdAt: new Date().toISOString(),
        })
      );

      // Step 3: Launch Cashfree checkout (redirects away to hosted page)
      await initiateCashfreePayment({
        orderId,
        amount: finalPrice,
        customerName: user.user_metadata?.full_name || "Customer",
        customerEmail: user.email || "customer@breathingplace.in",
        customerPhone: "9999999999",
      });

      // This code only runs if Cashfree uses a popup/non-redirect mode
      toast.success("Payment processing...");
    } catch (error) {
      // Clean up pending session if payment launch fails
      if (error.message !== "Failed to create session. Please try again.") {
        await supabase
          .from("sessions")
          .delete()
          .eq("customer_id", user.id)
          .eq("status", "payment_pending");
        localStorage.removeItem("bp_pending_booking");
      }
      toast.error(error.message || "Payment failed. Please try again.");
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 py-10">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 text-sm mb-6 transition-colors font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="font-display text-3xl font-bold mb-8 text-slate-900">Schedule & Pay</h1>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Date & Time */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-heading text-base font-bold mb-4 flex items-center gap-2 text-slate-800">
                <Calendar className="w-5 h-5 text-blue-600" /> Select Date
              </h3>
              <Input type="date" className="h-12 rounded-xl text-base border-slate-300"
                min={moment().format("YYYY-MM-DD")}
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)} />
            </div>

            {selectedDate && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="font-heading text-base font-bold mb-4 flex items-center gap-2 text-slate-800">
                  <Clock className="w-5 h-5 text-blue-600" /> Select Time <span className="text-xs font-normal text-slate-400 ml-2">(IST)</span>
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {TIMES.map(t => (
                    <button key={t} onClick={() => setSelectedTime(t)}
                      className={`py-3 rounded-xl border text-sm font-bold transition-all ${selectedTime === t ? "border-blue-600 bg-blue-600 text-white shadow-md" : "border-slate-200 text-slate-600 hover:border-blue-300 bg-slate-50"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Checkout summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sticky top-6 shadow-lg">
              <h3 className="font-heading text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Booking Summary</h3>
              <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                  {therapist?.profile_photo_url
                    ? <img src={therapist.profile_photo_url} className="w-full h-full object-cover" alt={therapist.full_name} />
                    : <div className="w-full h-full flex items-center justify-center"><User className="w-6 h-6 text-slate-400" /></div>}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{therapist?.full_name || "Loading..."}</p>
                  <p className="text-xs font-semibold text-blue-600 mt-0.5">{sessionType}</p>
                </div>
              </div>

              <div className="space-y-4 py-6 border-b border-slate-100 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Date</span><span className="font-bold">{selectedDate ? moment(selectedDate).format("MMM D, YYYY") : "—"}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Time</span><span className="font-bold">{selectedTime || "—"}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Duration</span><span className="font-bold">45–50 mins</span></div>
              </div>

              <div className="py-6">
                <div className="flex justify-between items-end">
                  <span className="font-bold text-slate-800">Total</span>
                  <span className="text-3xl font-black text-blue-600">₹{finalPrice}</span>
                </div>
              </div>

              <Button
                className="w-full h-14 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-xl"
                disabled={!selectedDate || !selectedTime || isProcessingPayment}
                onClick={handlePayNow}>
                {isProcessingPayment
                  ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Opening Payment...</>
                  : `Pay ₹${finalPrice} via Cashfree`}
              </Button>

              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400">
                <ShieldCheck className="w-4 h-4 text-green-500" /> Secured by Cashfree
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
