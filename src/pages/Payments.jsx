import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import RoleGuard from "@/components/RoleGuard";
import EmptyState from "@/components/EmptyState";
import { TableRowSkeleton } from "@/components/SkeletonLoader";
import { Badge } from "@/components/ui/badge";
import { CreditCard, IndianRupee, TrendingUp } from "lucide-react";
import moment from "moment";

const statusBadge = {
  completed: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-blue-100 text-blue-800",
};

function PaymentsContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments", user?.id, user?.role],
    queryFn: () => {
      if (isAdmin) return base44.entities.Payment.list("-payment_date", 100);
      return base44.entities.Payment.filter({ customer_id: user?.id }, "-payment_date", 50);
    },
    enabled: !!user?.id,
  });

  if (isLoading) return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="h-8 bg-muted rounded w-40 animate-pulse" />
      <TableRowSkeleton rows={5} />
    </div>
  );

  const isTherapist = user?.role === "therapist";
  const totalCompleted = payments.filter(p => p.status === "completed").reduce((sum, p) => sum + (isTherapist ? (p.therapist_fee || 0) : (p.amount || 0)), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">
          {isAdmin ? "Platform Payments" : "Payment History"}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {isAdmin ? "All transactions across the platform" : "Your transaction history"}
        </p>
      </div>

      {/* Summary */}
      {payments.length > 0 && (
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Transactions</p>
            <p className="text-2xl font-bold">{payments.length}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">
              {isAdmin ? "Total Platform Revenue" : isTherapist ? "Your Total Earnings" : "Total Paid"}
            </p>
            <p className="text-2xl font-bold">₹{totalCompleted.toLocaleString()}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Pending</p>
            <p className="text-2xl font-bold">{payments.filter(p => p.status === "pending").length}</p>
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="bg-card rounded-xl border border-border">
        <div className="p-5 border-b border-border">
          <h2 className="font-heading text-base font-semibold">All Transactions</h2>
        </div>
        <div className="p-5">
          {payments.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No transactions yet"
              description={isAdmin
                ? "Payment transactions will appear here as customers book and pay for sessions."
                : "Your payment history will appear here after you complete sessions."}
            />
          ) : (
            <div className="space-y-3">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <IndianRupee className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {isAdmin ? `${p.customer_name || "Customer"} → ${p.therapist_name || "Therapist"}` : `Session with ${p.therapist_name || "Therapist"}`}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{p.payment_date ? moment(p.payment_date).format("MMM D, YYYY") : "Date not set"}</span>
                        {p.payment_method && <span>· {p.payment_method}</span>}
                        {p.transaction_id && <span>· {p.transaction_id}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold">
                      ₹{isTherapist ? (p.therapist_fee || 0).toLocaleString() : (p.amount || 0).toLocaleString()}
                    </p>
                    {isTherapist && p.platform_fee > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        (Client paid ₹{p.amount?.toLocaleString()})
                      </p>
                    )}
                    <Badge className={`${statusBadge[p.status] || "bg-gray-100 text-gray-800"} border-0 text-xs mt-1`}>
                      {p.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Payments() {
  return (
    <RoleGuard allowedRoles={["customer", "user", "admin", "super_admin"]}>
      <PaymentsContent />
    </RoleGuard>
  );
}