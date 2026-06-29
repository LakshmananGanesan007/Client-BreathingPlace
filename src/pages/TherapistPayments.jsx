import { useState, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { IndianRupee, Download, Wallet, TrendingUp, Clock, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";

const CASHFREE_FEE_PERCENT = 2;
const CASHFREE_FEE_FIXED = 10;

function calcCashfreeFee(amount) {
  return parseFloat((amount * CASHFREE_FEE_PERCENT / 100 + CASHFREE_FEE_FIXED).toFixed(2));
}

function downloadCSV(rows, filename) {
  if (!rows.length) return;
  const h = Object.keys(rows[0]);
  const csv = [h.join(","), ...rows.map(r => h.map(k => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = filename; a.click();
}

export default function TherapistPayments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["therapist-payments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("therapist_id", user.id)
        .eq("status", "completed")
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const { data: withdrawals = [], refetch: refetchWithdrawals } = useQuery({
    queryKey: ["therapist-withdrawals", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("therapist_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  const totalEarned = useMemo(() => payments.reduce((s, p) => s + (p.therapist_fee || 0), 0), [payments]);
  const totalWithdrawn = useMemo(() => withdrawals.filter(w => w.status === "completed").reduce((s, w) => s + (w.amount || 0), 0), [withdrawals]);
  const availableBalance = Math.max(0, totalEarned - totalWithdrawn);

  // This week's withdrawals
  const thisWeekWithdrawals = withdrawals.filter(w =>
    moment(w.created_at).isSameOrAfter(moment().startOf("isoWeek"))
  );
  const canWithdraw = thisWeekWithdrawals.length < 3;

  const requestWithdrawal = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(withdrawAmount);
      if (!amount || amount <= 0) throw new Error("Enter a valid amount.");
      if (amount > availableBalance) throw new Error(`Maximum available: ₹${availableBalance.toFixed(2)}`);
      if (!canWithdraw) throw new Error("Maximum 3 withdrawals per week allowed.");

      const cashfreeFee = calcCashfreeFee(amount);
      const netAmount = parseFloat((amount - cashfreeFee).toFixed(2));

      const { error } = await supabase.from("withdrawals").insert({
        therapist_id: user.id,
        therapist_name: user.user_metadata?.full_name || user.email,
        amount,
        cashfree_fee: cashfreeFee,
        net_amount: netAmount,
        status: "pending",
        requested_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["therapist-withdrawals"] });
      setShowWithdrawDialog(false);
      setWithdrawAmount("");
      toast.success("Withdrawal request submitted! Processing within 2-3 business days.");
    },
    onError: (err) => toast.error(err.message),
  });

  const withdrawAmountNum = parseFloat(withdrawAmount) || 0;
  const previewFee = calcCashfreeFee(withdrawAmountNum);
  const previewNet = Math.max(0, withdrawAmountNum - previewFee);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">My Earnings</h1>
          <p className="text-muted-foreground mt-1 text-sm">Your session earnings and withdrawal history</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => downloadCSV(
            payments.map(p => ({ Date: moment(p.payment_date || p.created_at).format("YYYY-MM-DD"), Customer: p.customer_name || "", Amount: p.amount, YourShare: p.therapist_fee || 0, Method: p.payment_method || "" })),
            `earnings-${moment().format("YYYY-MM-DD")}.csv`
          )}>
            <Download className="w-3.5 h-3.5" /> Download
          </Button>
          <Button size="sm" onClick={() => setShowWithdrawDialog(true)} disabled={availableBalance <= 0 || !canWithdraw} className="gap-1.5">
            <Wallet className="w-4 h-4" /> Withdraw
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <p className="text-xs text-muted-foreground">Total Earned</p>
          </div>
          <p className="text-2xl font-bold text-green-600">₹{totalEarned.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">{payments.length} sessions</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-2">
            <IndianRupee className="w-4 h-4 text-blue-500" />
            <p className="text-xs text-muted-foreground">Available Balance</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">₹{availableBalance.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">After withdrawals</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">This Week</p>
          </div>
          <p className="text-2xl font-bold">{thisWeekWithdrawals.length}/3</p>
          <p className="text-xs text-muted-foreground mt-1">Withdrawals used</p>
        </div>
      </div>

      {!canWithdraw && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">You have used all 3 withdrawals this week. Resets on Monday.</p>
        </div>
      )}

      {/* Session Earnings */}
      <div className="bg-card rounded-xl border border-border">
        <div className="p-5 border-b border-border">
          <h2 className="font-heading text-base font-semibold">Session Earnings</h2>
        </div>
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Loading...</div>
        ) : payments.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">No earnings yet. Completed sessions will appear here.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Session Fee</th>
                  <th className="px-4 py-3 text-green-600">Your Share</th>
                  <th className="px-4 py-3">Method</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/20 last:border-0">
                    <td className="px-4 py-3 text-xs text-muted-foreground">{moment(p.payment_date || p.created_at).format("MMM D, YYYY")}</td>
                    <td className="px-4 py-3 font-medium">{p.customer_name || "—"}</td>
                    <td className="px-4 py-3">₹{(p.amount || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 font-bold text-green-600">₹{(p.therapist_fee || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.payment_method || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Withdrawal History */}
      {withdrawals.length > 0 && (
        <div className="bg-card rounded-xl border border-border">
          <div className="p-5 border-b border-border">
            <h2 className="font-heading text-base font-semibold">Withdrawal History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Requested</th>
                  <th className="px-4 py-3">Cashfree Fee</th>
                  <th className="px-4 py-3">Net Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map(w => (
                  <tr key={w.id} className="border-b border-border hover:bg-muted/20 last:border-0">
                    <td className="px-4 py-3 text-xs text-muted-foreground">{moment(w.created_at).format("MMM D, YYYY h:mm A")}</td>
                    <td className="px-4 py-3 font-semibold">₹{(w.amount || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-red-600 text-xs">- ₹{(w.cashfree_fee || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 font-bold text-green-600">₹{(w.net_amount || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <Badge className={w.status === "completed" ? "bg-green-100 text-green-700 border-0" : w.status === "pending" ? "bg-amber-100 text-amber-700 border-0" : "bg-red-100 text-red-700 border-0"}>
                        {w.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Withdrawal Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Request Withdrawal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Available Balance</p>
              <p className="text-2xl font-bold text-green-600">₹{availableBalance.toFixed(2)}</p>
            </div>
            <div>
              <Label>Withdrawal Amount (₹) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                className="mt-1"
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                placeholder="Enter amount"
                min="1"
                max={availableBalance}
              />
            </div>
            {withdrawAmountNum > 0 && (
              <div className="bg-blue-50 rounded-lg border border-blue-100 p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-slate-600">Requested:</span><span className="font-semibold">₹{withdrawAmountNum.toFixed(2)}</span></div>
                <div className="flex justify-between text-red-600"><span>Cashfree fee ({CASHFREE_FEE_PERCENT}% + ₹{CASHFREE_FEE_FIXED}):</span><span>- ₹{previewFee.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-green-700 border-t border-blue-100 pt-1 mt-1"><span>You receive:</span><span>₹{previewNet.toFixed(2)}</span></div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Processed within 2–3 business days. {3 - thisWeekWithdrawals.length} withdrawal{3 - thisWeekWithdrawals.length !== 1 ? "s" : ""} remaining this week.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdrawDialog(false)}>Cancel</Button>
            <Button onClick={() => requestWithdrawal.mutate()} disabled={requestWithdrawal.isPending || !withdrawAmountNum}>
              {requestWithdrawal.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : "Request Withdrawal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
