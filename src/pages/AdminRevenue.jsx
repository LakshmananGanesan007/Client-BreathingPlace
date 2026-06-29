import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, TrendingUp, User, CreditCard, Download, RefreshCw, Filter } from "lucide-react";
import moment from "moment";

const statusColor = {
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-purple-100 text-purple-700",
  pending: "bg-yellow-100 text-yellow-700",
};

function downloadCSV(rows, filename) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map(r => headers.map(h => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];
const MONTHS = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function AdminRevenue() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: payments = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-all-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("payment_date", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 15000,
  });

  const { data: platformSettings } = useQuery({
    queryKey: ["platform-revenue-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_type", "revenue_config")
        .maybeSingle();
      return data?.setting_value || { platform_commission_percent: 20, cashfree_fee_fixed: 10, cashfree_fee_percent: 2 };
    },
  });

  const commissionPct = platformSettings?.platform_commission_percent ?? 20;

  const filtered = useMemo(() => {
    let result = payments;

    if (filterStatus !== "all") result = result.filter(p => p.status === filterStatus);

    if (filterYear) {
      result = result.filter(p => {
        const d = moment(p.payment_date || p.created_at);
        return d.year() === parseInt(filterYear);
      });
    }
    if (filterMonth) {
      result = result.filter(p => {
        const d = moment(p.payment_date || p.created_at);
        return d.month() + 1 === parseInt(filterMonth);
      });
    }
    if (fromDate) result = result.filter(p => moment(p.payment_date || p.created_at).isSameOrAfter(moment(fromDate), "day"));
    if (toDate) result = result.filter(p => moment(p.payment_date || p.created_at).isSameOrBefore(moment(toDate), "day"));

    return result;
  }, [payments, filterStatus, filterYear, filterMonth, fromDate, toDate]);

  const completed = filtered.filter(p => p.status === "completed");

  const totalRevenue = completed.reduce((s, p) => s + (p.amount || 0), 0);
  const totalTherapist = completed.reduce((s, p) => {
    const share = p.therapist_fee ?? (p.amount * (1 - commissionPct / 100));
    return s + share;
  }, 0);
  const totalPlatform = completed.reduce((s, p) => {
    const fee = p.platform_fee ?? (p.amount * commissionPct / 100);
    return s + fee;
  }, 0);

  const handleClearFilters = () => {
    setFromDate(""); setToDate(""); setFilterMonth(""); setFilterYear(""); setFilterStatus("all");
  };

  const handleDownload = () => {
    const rows = filtered.map(p => ({
      Date: moment(p.payment_date || p.created_at).format("YYYY-MM-DD HH:mm"),
      Customer: p.customer_name || "Unknown",
      Therapist: p.therapist_name || "Unknown",
      Amount_INR: p.amount || 0,
      Therapist_Share: (p.therapist_fee ?? (p.amount * (1 - commissionPct / 100))).toFixed(2),
      Platform_Fee: (p.platform_fee ?? (p.amount * commissionPct / 100)).toFixed(2),
      Status: p.status,
      Payment_Method: p.payment_method || "",
      Transaction_ID: p.transaction_id || "",
    }));
    const label = [filterYear, filterMonth ? MONTHS[parseInt(filterMonth)] : ""].filter(Boolean).join("-") || "all";
    downloadCSV(rows, `revenue-report-${label}-${moment().format("YYYY-MM-DD")}.csv`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Revenue Reports</h1>
          <p className="text-muted-foreground mt-1 text-sm">Real-time platform revenue — all transactions including failed and refunded.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={handleDownload} className="gap-2">
            <Download className="w-4 h-4" /> Download CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-heading text-sm font-semibold">Filter Transactions</h3>
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
          <Input type="date" className="h-9 text-sm" value={fromDate} onChange={e => setFromDate(e.target.value)} placeholder="From date" />
          <Input type="date" className="h-9 text-sm" value={toDate} onChange={e => setToDate(e.target.value)} placeholder="To date" />
          <select className="h-9 rounded-lg border border-border bg-background text-sm px-2" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="pending">Pending</option>
          </select>
          <Button size="sm" variant="ghost" onClick={handleClearFilters} className="text-muted-foreground h-9">Clear</Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{filtered.length} transactions shown</p>
      </div>

      {/* Summary cards — completed only */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-medium text-sm">Total Customer Payments</h3>
          </div>
          <div className="text-3xl font-bold font-mono">₹{totalRevenue.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">{completed.length} completed</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-blue-500" />
            <h3 className="font-medium text-sm">Therapist Share</h3>
          </div>
          <div className="text-3xl font-bold font-mono text-blue-600">₹{totalTherapist.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">{(100 - commissionPct)}% of revenue</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h3 className="font-medium text-sm">Platform Earnings</h3>
          </div>
          <div className="text-3xl font-bold font-mono text-green-600">₹{totalPlatform.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">{commissionPct}% commission</p>
        </div>
      </div>

      {/* Transactions table */}
      <div className="bg-card rounded-xl border border-border">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold">All Transactions</h2>
          <span className="text-xs text-muted-foreground">{filtered.length} records</span>
        </div>
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Loading transactions...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <IndianRupee className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No transactions match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Therapist</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Total Paid</th>
                  <th className="px-4 py-3">Therapist Share</th>
                  <th className="px-4 py-3">Platform Fee</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const tShare = p.therapist_fee ?? (p.amount * (1 - commissionPct / 100));
                  const pFee = p.platform_fee ?? (p.amount * commissionPct / 100);
                  return (
                    <tr key={p.id} className="border-b border-border hover:bg-muted/20 last:border-0">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        <div>{moment(p.payment_date || p.created_at).format("MMM D, YYYY")}</div>
                        <div>{moment(p.payment_date || p.created_at).format("h:mm A")}</div>
                      </td>
                      <td className="px-4 py-3 font-medium">{p.customer_name || "Unknown"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.therapist_name || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{p.payment_method || "—"}</td>
                      <td className="px-4 py-3 font-semibold">₹{(p.amount || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-blue-600">₹{tShare.toFixed(2)}</td>
                      <td className="px-4 py-3 text-green-600 font-medium">₹{pFee.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <Badge className={`${statusColor[p.status] || "bg-gray-100 text-gray-700"} border-0 text-xs`}>
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
