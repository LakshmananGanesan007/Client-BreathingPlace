import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { DashboardSkeleton } from "@/components/SkeletonLoader";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { IndianRupee, Brain, Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminFees() {
  const queryClient = useQueryClient();
  
  // Direct Supabase query to bypass any broken legacy hooks
  const { data: approvedTherapists = [], isLoading, error } = useQuery({
    queryKey: ["admin-approved-therapists-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('therapist_profiles')
        .select('*')
        .eq('approval_status', 'approved');
      if (error) throw error;
      return data || [];
    }
  });

  const [editingTherapist, setEditingTherapist] = useState(null);
  const [individualPrices, setIndividualPrices] = useState({ video: "", final_customer_price: "" });
  const [isSaving, setIsSaving] = useState(false);

  const handleEditClick = (t) => {
    setEditingTherapist(t);
    setIndividualPrices({
      video: (t.video_price || 0).toString(),
      final_customer_price: (t.final_customer_price || "").toString(),
    });
  };

  const handleSaveIndividualPrices = async () => {
    if (!editingTherapist) return;

    const videoP = parseFloat(individualPrices.video) || 0;
    const finalOverride = individualPrices.final_customer_price !== "" ? parseFloat(individualPrices.final_customer_price) : null;

    setIsSaving(true);
    try {
      const updatePayload = { video_price: videoP };
      if (finalOverride !== null) updatePayload.final_customer_price = finalOverride;

      const { error } = await supabase
        .from('therapist_profiles')
        .update(updatePayload)
        .eq('user_id', editingTherapist.user_id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["admin-approved-therapists-pricing"] });
      toast.success(`✅ Prices updated for ${editingTherapist.full_name}`);
      setEditingTherapist(null);
    } catch (err) {
      toast.error("❌ Failed to update individual prices.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <DashboardSkeleton />;
  if (error) return (
    <div className="text-center py-20 text-destructive">
      <p className="font-medium">Failed to load data</p>
      <Button className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-approved-therapists-pricing"] })}>Retry</Button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="font-display text-2xl font-bold">Fee Management</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Set the video session price per therapist. Customers see only the Final Price. Use Pricing Config for global chat/video settings.
        </p>
      </div>

      {/* Therapist Pricing Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-2 p-5 border-b border-border bg-muted/20">
          <IndianRupee className="w-5 h-5 text-primary" />
          <h2 className="font-heading text-base font-semibold">Individual Therapist Pricing</h2>
        </div>

        <div className="p-0">
          {approvedTherapists.length === 0 ? (
            <div className="p-10"><EmptyState icon={Brain} title="No approved therapists" description="Approve therapists first to manage their fees." /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Therapist</th>
                    <th className="px-4 py-3">Video Session Price</th>
                    <th className="px-4 py-3">Final Price (Customer)</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedTherapists.map(t => {
                    const currency = t.currency || "₹";
                    const videoBase = parseFloat(t.video_price) || 0;
                    const finalOverride = t.final_customer_price ? parseFloat(t.final_customer_price) : null;

                    return (
                      <tr key={t.id || t.user_id} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-4">
                          <div className="font-medium text-foreground">{t.full_name}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t.qualification}</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-semibold text-slate-700">{currency}{videoBase.toFixed(0)}</span>
                        </td>
                        <td className="px-4 py-4">
                          {finalOverride !== null ? (
                            <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-sm">{currency}{finalOverride.toFixed(0)} <span className="text-[10px] font-normal text-blue-500">override</span></span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Same as video price</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Button size="sm" variant="outline" onClick={() => handleEditClick(t)} className="gap-1.5 h-8">
                            <Edit className="w-3.5 h-3.5" /> Edit
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

      {/* Set Individual Therapist Prices Dialog */}
      <Dialog open={!!editingTherapist} onOpenChange={() => setEditingTherapist(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Video Session Price</DialogTitle>
            <DialogDescription>
              Set the video session price for this therapist. Customers will see the Final Price.
            </DialogDescription>
          </DialogHeader>
          {editingTherapist && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase">
                  {editingTherapist.full_name.substring(0, 2)}
                </div>
                <div>
                  <p className="font-semibold text-blue-900">{editingTherapist.full_name}</p>
                  <p className="text-xs text-blue-700">{editingTherapist.qualification}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold">Video Session Price (₹)</Label>
                  <Input type="number" min="0" className="mt-1" placeholder="e.g. 499"
                    value={individualPrices.video} onChange={e => setIndividualPrices({...individualPrices, video: e.target.value})} />
                  <p className="text-xs text-muted-foreground mt-1">Therapist's base video session fee.</p>
                </div>
                <div className="border-t pt-3">
                  <Label className="text-sm font-bold text-blue-700">Final Customer Price Override (₹)</Label>
                  <Input type="number" min="0" className="mt-1 border-blue-200 focus:ring-blue-500"
                    placeholder="Leave blank to use video price"
                    value={individualPrices.final_customer_price}
                    onChange={e => setIndividualPrices({...individualPrices, final_customer_price: e.target.value})} />
                  <p className="text-xs text-muted-foreground mt-1">Override the price customers see. Leave blank to show the video session price.</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTherapist(null)}>Cancel</Button>
            <Button onClick={handleSaveIndividualPrices} disabled={isSaving} className="bg-primary text-white">
              {isSaving ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Saving...</> : "Save Price"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}