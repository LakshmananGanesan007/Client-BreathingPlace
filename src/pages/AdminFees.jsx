import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminData, updateTherapistMarkup, ADMIN_DATA_KEY } from "@/hooks/useAdminData";
import { DashboardSkeleton, TableRowSkeleton } from "@/components/SkeletonLoader";
import EmptyState from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { IndianRupee, Brain, Edit, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdminFees() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useAdminData();
  const [editingTherapist, setEditingTherapist] = useState(null);
  const [markupValue, setMarkupValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (isLoading) return <DashboardSkeleton />;
  if (error) return (
    <div className="text-center py-20 text-destructive">
      <p className="font-medium">Failed to load data</p>
      <Button className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ADMIN_DATA_KEY })}>Retry</Button>
    </div>
  );

  const therapists = data?.therapists || [];
  const approvedTherapists = therapists.filter(t => t.approval_status === "approved");

  const handleEditClick = (t) => {
    setEditingTherapist(t);
    setMarkupValue((t.platform_markup_percentage || 0).toString());
  };

  const handleSaveMarkup = async () => {
    if (!editingTherapist) return;
    const markup = parseFloat(markupValue);
    if (isNaN(markup) || markup < 0) {
      toast.error("Please enter a valid positive percentage");
      return;
    }

    setIsSaving(true);
    const result = await updateTherapistMarkup(editingTherapist.user_id, markup);
    setIsSaving(false);
    
    if (result?.success) {
      queryClient.invalidateQueries({ queryKey: ADMIN_DATA_KEY });
      toast.success("Platform markup updated successfully!");
      setEditingTherapist(null);
    } else {
      toast.error(result?.error || "Failed to update markup");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Therapist Fee Management</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Set platform markup percentages for approved therapists. The markup will be automatically applied to the consultation fee.
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="flex items-center gap-2 p-5 border-b border-border bg-muted/20">
          <IndianRupee className="w-5 h-5 text-primary" />
          <h2 className="font-heading text-base font-semibold">Approved Therapists Pricing</h2>
        </div>

        <div className="p-5">
          {approvedTherapists.length === 0 ? (
            <EmptyState icon={Brain} title="No approved therapists" description="Approve therapists first to manage their fees." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Therapist</th>
                    <th className="px-4 py-3">Base Fee</th>
                    <th className="px-4 py-3">Platform Markup</th>
                    <th className="px-4 py-3">Platform Fee</th>
                    <th className="px-4 py-3">Final Customer Price</th>
                    <th className="px-4 py-3 text-right rounded-tr-lg">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedTherapists.map(t => {
                    const baseFee = parseFloat(t.consultation_fee) || 0;
                    const markupPct = parseFloat(t.platform_markup_percentage) || 0;
                    const platformFee = baseFee * (markupPct / 100);
                    const finalPrice = baseFee + platformFee;
                    const currency = t.currency || "INR";

                    return (
                      <tr key={t.id || t.user_id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{t.full_name}</div>
                          <div className="text-xs text-muted-foreground">{t.qualification}</div>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {currency} {baseFee.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={markupPct > 0 ? "secondary" : "outline"} className="font-mono text-xs">
                            {markupPct.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-medium text-primary">
                          {currency} {platformFee.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {currency} {finalPrice.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => handleEditClick(t)} className="gap-1.5 h-8">
                            <Edit className="w-3.5 h-3.5" /> Adjust
                          </Button>
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

      <Dialog open={!!editingTherapist} onOpenChange={() => setEditingTherapist(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Platform Markup</DialogTitle>
          </DialogHeader>
          {editingTherapist && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Therapist: {editingTherapist.full_name}</p>
                  <p className="text-muted-foreground mt-1">Base Fee: {editingTherapist.currency || "INR"} {editingTherapist.consultation_fee || 0}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="markup">Platform Markup (%)</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    id="markup" 
                    type="number" 
                    min="0" 
                    step="0.1" 
                    value={markupValue} 
                    onChange={e => setMarkupValue(e.target.value)} 
                    className="max-w-[150px]"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  The final price will be: {editingTherapist.currency || "INR"} {(
                    (parseFloat(editingTherapist.consultation_fee) || 0) * (1 + ((parseFloat(markupValue) || 0) / 100))
                  ).toFixed(2)}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTherapist(null)}>Cancel</Button>
            <Button onClick={handleSaveMarkup} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}