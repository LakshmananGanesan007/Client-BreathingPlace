import { cn } from "@/lib/utils";

export default function StatCard({ icon: Icon, label, value, trend, className }) {
  return (
    <div className={cn("bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-2xl font-bold font-heading">{value}</p>
          {trend && (
            <p className={cn("text-xs mt-1", trend > 0 ? "text-green-600" : "text-red-500")}>
              {trend > 0 ? "+" : ""}{trend}% this month
            </p>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}