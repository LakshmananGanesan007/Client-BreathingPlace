import { useState, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import RoleGuard from "@/components/RoleGuard";
import EmptyState from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, IndianRupee, Download, Filter, RefreshCw } from "lucide-react";
import moment from "moment";

const statusBadge = {
  completed: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-blue-100 text-blue-800",
  cancelled: "bg-gray-100 text-gray-700",
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];
const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function downloadCSV(rows, filename) {
  if (!rows.length) return;
  const h = Object.keys(rows[0]);
  const csv = [h.join(","), ...rows.map(r => h.map(k => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = filename; a.click();
}

function PaymentsContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isTherapist = user?.role === "therapist";

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: payments = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["payments-supabase", user?.id, user?.role],
    queryFn: async () => {
      let q = supabase.from("payments").select("*").order("payment_date", { ascending: false }).limit(500);
      if (!isAdmin) {
        if (isTherapist) q = q.eq("therapist_id", user.id);
        else q = q.eq("customer_id", user.id);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  const filtered = useMemo(() => {
    let r = payments;
    if (filterStatus !== "all") r = r.filter(p => p.status === filterStatus);
    if (filterYear) r = r.filter(p => moment(p.payment_date || p.created_at).year() === parseInt(filterYear));
    if (filterMonth) r = r.filter(p => moment(p.payment_date || p.created_at).month() + 1 === parseInt(filterMonth));
    if (fromDate) r = r.filter(p => moment(p.payment_date || p.created_at).isSameOrAfter(moment(fromDate), "day"));
    if (toDate) r = r.filter(p => moment(p.payment_date || p.created_at).isSameOrBefore(moment(toDate), "day"));
    return r;
  }, [payments, filterStatus, filterYear, filterMonth, fromDate, toDate]);

  const completed = filtered.filter(p => p.status === "completed");
  const totalCompleted = completed.reduce((s, p) => s + (isTherapist ? (p.therapist_fee || 0) : (p.amount || 0)), 0);
  const totalPending = filtered.filter(p => p.status === "pending").length;

  const handleDownload = () => {
    const rows = filtered.map(p => ({
      Date: moment(p.payment_date || p.created_at).format("YYYY-MM-DD HH:mm"),
      Customer: p.customer_name || "",
      Therapist: p.therapist_name || "",
      Amount: p.amount || 0,
      Therapist_Share: p.therapist_fee || 0,
      Platform_Fee: p.platform_fee || 0,
      Status: p.status,
      Method: p.payment_method || "",
      Transaction_ID: p.transaction_id || "",
    }));
    downloadCSV(rows, `payments-${moment().format("YYYY-MM-DD")}.csv`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">
            {isAdmin ? "Platform Payments" : isTherapist ? "My Earnings" : "Payment History"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isAdmin ? "All platform transactions — live from Cashfree" : "Your complete transaction history"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Transactions</p>
          <p className="text-2xl font-bold">{filtered.length}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">
            {isTherapist ? "Total Earnings" : "Total Paid"}
          </p>
          <p className="text-2xl font-bold text-green-600">₹{totalCompleted.toFixed(2)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground mb-1">Pending</p>
          <p className="text-2xl font-bold text-amber-600">{totalPending}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Filter</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <select className="h-9 rounded-lg border border-border bg-background text-sm px-2" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
            <option value="">All Years</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="h-9 rounded-lg border border-border bg-background text-sm px-2" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
            <option value="">All Months</option>
            {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <Input type="date" className="h-9 text-sm" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          <Input type="date" className="h-9 text-sm" value={toDate} onChange={e => setToDate(e.target.value)} />
          <select className="h-9 rounded-lg border border-border bg-background text-sm px-2" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <Button size="sm" variant="ghost" className="h-9 text-muted-foreground" onClick={() => { setFromDate(""); setToDate(""); setFilterMonth(""); setFilterYear(""); setFilterStatus("all"); }}>
            Clear
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{filtered.length} records</p>
      </div>

      {/* Transactions */}
      <div className="bg-card rounded-xl border border-border">
        <div className="p-5 border-b border-border">
          <h2 className="font-heading text-base font-semibold">Transactions</h2>
        </div>
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Loading transactions...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10">
            <EmptyState icon={CreditCard} title="No transactions" description="Your payment history will appear here." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  {(isAdmin || isTherapist) && <th className="px-4 py-3">Customer</th>}
                  {(isAdmin || !isTherapist) && <th className="px-4 py-3">Therapist</th>}
                  <th className="px-4 py-3">Amount</th>
                  {isTherapist && <th className="px-4 py-3">Your Share</th>}
                  {isAdmin && <th className="px-4 py-3">Platform Fee</th>}
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Txn ID</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/20 last:border-0">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      <div>{moment(p.payment_date || p.created_at).format("MMM D, YYYY")}</div>
                      <div>{moment(p.payment_date || p.created_at).format("h:mm A")}</div>
                    </td>
                    {(isAdmin || isTherapist) && <td className="px-4 py-3 font-medium">{p.customer_name || "—"}</td>}
                    {(isAdmin || !isTherapist) && <td className="px-4 py-3 text-muted-foreground">{p.therapist_name || "—"}</td>}
                    <td className="px-4 py-3 font-semibold">₹{(p.amount || 0).toFixed(2)}</td>
                    {isTherapist && <td className="px-4 py-3 text-green-600 font-semibold">₹{(p.therapist_fee || 0).toFixed(2)}</td>}
                    {isAdmin && <td className="px-4 py-3 text-green-600">₹{(p.platform_fee || 0).toFixed(2)}</td>}
                    <td className="px-4 py-3 text-xs">{p.payment_method || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[120px]" title={p.transaction_id}>{p.transaction_id ? p.transaction_id.slice(0, 14) + "…" : "—"}</td>
                    <td className="px-4 py-3">
                      <Badge className={`${statusBadge[p.status] || "bg-gray-100 text-gray-700"} border-0 text-xs capitalize`}>
                        {p.status || "unknown"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Payments() {
  return (
    <RoleGuard allowedRoles={["customer", "user", "therapist", "admin", "super_admin"]}>
      <PaymentsContent />
    </RoleGuard>
  );
}
