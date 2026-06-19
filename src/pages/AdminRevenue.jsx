import { useAdminData } from "@/hooks/useAdminData";
import { DashboardSkeleton } from "@/components/SkeletonLoader";
import EmptyState from "@/components/EmptyState";
import { IndianRupee, TrendingUp, User, CreditCard } from "lucide-react";
import moment from "moment";

export default function AdminRevenue() {
  const { data, isLoading, error } = useAdminData();

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <div className="text-center py-10 text-destructive">{error.message}</div>;

  const payments = data?.payments || [];
  const completedPayments = payments.filter(p => p.status === "completed");

  const totalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPlatformEarnings = completedPayments.reduce((sum, p) => sum + (p.platform_fee || 0), 0);
  const totalTherapistEarnings = completedPayments.reduce((sum, p) => sum + (p.therapist_fee || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Revenue Reports</h1>
        <p className="text-muted-foreground mt-1 text-sm">Track customer payments, therapist shares, and platform earnings.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-medium">Total Customer Payments</h3>
          </div>
          <div className="text-3xl font-bold font-mono">₹{totalRevenue.toFixed(2)}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-blue-500" />
            <h3 className="font-medium">Total Therapist Share</h3>
          </div>
          <div className="text-3xl font-bold font-mono text-blue-600">₹{totalTherapistEarnings.toFixed(2)}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h3 className="font-medium">Total Platform Earnings</h3>
          </div>
          <div className="text-3xl font-bold font-mono text-green-600">₹{totalPlatformEarnings.toFixed(2)}</div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border mt-6">
        <div className="p-5 border-b border-border">
          <h2 className="font-heading text-base font-semibold">Completed Transactions</h2>
        </div>
        <div className="p-0">
          {completedPayments.length === 0 ? (
            <div className="p-10"><EmptyState icon={IndianRupee} title="No transactions yet" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Therapist</th>
                    <th className="px-4 py-3">Total Paid</th>
                    <th className="px-4 py-3">Therapist Share</th>
                    <th className="px-4 py-3 text-right">Platform Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {completedPayments.map(p => (
                    <tr key={p.id} className="border-b border-border hover:bg-muted/20">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {moment(p.created_at || p.payment_date).format("MMM D, YYYY HH:mm")}
                      </td>
                      <td className="px-4 py-3 font-medium">{p.customer_name || "Unknown"}</td>
                      <td className="px-4 py-3">{p.therapist_name || "Unknown"}</td>
                      <td className="px-4 py-3 font-semibold">{p.currency || "INR"} {(p.amount || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-blue-600">{p.currency || "INR"} {(p.therapist_fee || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">
                        {p.currency || "INR"} {(p.platform_fee || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}