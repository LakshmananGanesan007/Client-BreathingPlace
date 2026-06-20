import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { DashboardSkeleton } from "@/components/SkeletonLoader";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { IndianRupee, Brain, Edit, AlertCircle, Settings2, Save, Loader2, Info } from "lucide-react";
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
  const [individualPrices, setIndividualPrices] = useState({ chat: "", voice: "", video: "" });
  const [isSaving, setIsSaving] = useState(false);

  // Global Platform Fee State
  const [globalFees, setGlobalFees] = useState({
    percent_fee: 0,
    flat_fee: 0,
    extra_charges: 0,
    discount: 0,
  });
  const [isSavingGlobal, setIsSavingGlobal] = useState(false);

  // Load Global Fees
  useEffect(() => {
    async function fetchGlobalFees() {
      const { data: settings } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('setting_type', 'global_fees')
        .maybeSingle();
      
      if (settings && settings.setting_value) {
        setGlobalFees(settings.setting_value);
      }
    }
    fetchGlobalFees();
  }, []);

  const handleSaveGlobalFees = async () => {
    setIsSavingGlobal(true);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({ 
          setting_type: 'global_fees', 
          setting_value: globalFees,
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_type' });

      if (error) throw error;
      toast.success("✅ Global platform fees saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error("❌ Failed to save global fees. Please ensure the SQL script was run.");
    } finally {
      setIsSavingGlobal(false);
    }
  };

  const calculateFinalPrice = (basePrice) => {
    const base = parseFloat(basePrice) || 0;
    const percentAmount = base * (parseFloat(globalFees.percent_fee) / 100);
    const flat = parseFloat(globalFees.flat_fee) || 0;
    const extra = parseFloat(globalFees.extra_charges) || 0;
    const discount = parseFloat(globalFees.discount) || 0;
    
    const final = base + percentAmount + flat + extra - discount;
    return final > 0 ? final : 0;
  };

  const handleEditClick = (t) => {
    setEditingTherapist(t);
    setIndividualPrices({
      chat: (t.chat_price || 0).toString(),
      voice: (t.voice_price || 0).toString(),
      video: (t.video_price || 0).toString()
    });
  };

  const handleSaveIndividualPrices = async () => {
    if (!editingTherapist) return;
    
    const chatP = parseFloat(individualPrices.chat) || 0;
    const voiceP = parseFloat(individualPrices.voice) || 0;
    const videoP = parseFloat(individualPrices.video) || 0;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('therapist_profiles')
        .update({
          chat_price: chatP,
          voice_price: voiceP,
          video_price: videoP
        })
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
        <h1 className="font-display text-2xl font-bold">Platform Fee Management</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure global platform fees and manually adjust specific therapist base prices. Customers will only see the Final Calculated Price.
        </p>
      </div>

      {/* Global Platform Fees Card */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 p-5 border-b border-border bg-muted/20">
          <Settings2 className="w-5 h-5 text-primary" />
          <h2 className="font-heading text-base font-semibold">Global Fee Configuration</h2>
        </div>
        <div className="p-5">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label className="text-xs">Percentage Fee (%)</Label>
              <Input 
                type="number" className="mt-1 h-9 text-sm" 
                value={globalFees.percent_fee} 
                onChange={(e) => setGlobalFees({...globalFees, percent_fee: e.target.value})} 
              />
            </div>
            <div>
              <Label className="text-xs">Flat Fee (₹)</Label>
              <Input 
                type="number" className="mt-1 h-9 text-sm" 
                value={globalFees.flat_fee} 
                onChange={(e) => setGlobalFees({...globalFees, flat_fee: e.target.value})} 
              />
            </div>
            <div>
              <Label className="text-xs">Additional Services (₹)</Label>
              <Input 
                type="number" className="mt-1 h-9 text-sm" 
                value={globalFees.extra_charges} 
                onChange={(e) => setGlobalFees({...globalFees, extra_charges: e.target.value})} 
              />
            </div>
            <div>
              <Label className="text-xs">Promo Discount (₹)</Label>
              <Input 
                type="number" className="mt-1 h-9 text-sm text-green-600 font-medium" 
                value={globalFees.discount} 
                onChange={(e) => setGlobalFees({...globalFees, discount: e.target.value})} 
              />
            </div>
          </div>
          <div className="flex items-center justify-between bg-primary/5 p-3 rounded-lg border border-primary/20">
            <p className="text-xs text-primary font-medium flex items-center gap-1.5">
              <Info className="w-4 h-4" /> Final Price = Base + {globalFees.percent_fee}% + ₹{globalFees.flat_fee} + ₹{globalFees.extra_charges} - ₹{globalFees.discount}
            </p>
            <Button size="sm" onClick={handleSaveGlobalFees} disabled={isSavingGlobal} className="gap-2 shadow-sm">
              {isSavingGlobal ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/> Saving...</> : <><Save className="w-3.5 h-3.5"/> Save Configuration</>}
            </Button>
          </div>
        </div>
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
                    <th className="px-4 py-3">Chat Base (Final)</th>
                    <th className="px-4 py-3">Voice Base (Final)</th>
                    <th className="px-4 py-3">Video Base (Final)</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedTherapists.map(t => {
                    const currency = t.currency || "INR";
                    const chatBase = parseFloat(t.chat_price) || 0;
                    const voiceBase = parseFloat(t.voice_price) || 0;
                    const videoBase = parseFloat(t.video_price) || 0;

                    return (
                      <tr key={t.id || t.user_id} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-4">
                          <div className="font-medium text-foreground">{t.full_name}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{t.qualification}</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-gray-400 line-through mr-2 text-xs">{currency}{chatBase.toFixed(0)}</span>
                          <span className="font-bold text-gray-900 bg-green-50 text-green-700 px-2 py-0.5 rounded">{currency}{calculateFinalPrice(chatBase).toFixed(0)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-gray-400 line-through mr-2 text-xs">{currency}{voiceBase.toFixed(0)}</span>
                          <span className="font-bold text-gray-900 bg-green-50 text-green-700 px-2 py-0.5 rounded">{currency}{calculateFinalPrice(voiceBase).toFixed(0)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-gray-400 line-through mr-2 text-xs">{currency}{videoBase.toFixed(0)}</span>
                          <span className="font-bold text-gray-900 bg-green-50 text-green-700 px-2 py-0.5 rounded">{currency}{calculateFinalPrice(videoBase).toFixed(0)}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Button size="sm" variant="outline" onClick={() => handleEditClick(t)} className="gap-1.5 h-8">
                            <Edit className="w-3.5 h-3.5" /> Set Base Prices
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Individual Base Prices</DialogTitle>
            <DialogDescription>
              Adjust the base prices for this specific therapist based on their experience. Customers will see the base price PLUS the global platform fees.
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
              
              <div className="grid gap-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right col-span-1">Chat Support</Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <span className="text-muted-foreground">{editingTherapist.currency || "INR"}</span>
                    <Input 
                      type="number" min="0" 
                      value={individualPrices.chat} 
                      onChange={e => setIndividualPrices({...individualPrices, chat: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right col-span-1">Voice Call</Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <span className="text-muted-foreground">{editingTherapist.currency || "INR"}</span>
                    <Input 
                      type="number" min="0" 
                      value={individualPrices.voice} 
                      onChange={e => setIndividualPrices({...individualPrices, voice: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right col-span-1">Video Call</Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <span className="text-muted-foreground">{editingTherapist.currency || "INR"}</span>
                    <Input 
                      type="number" min="0" 
                      value={individualPrices.video} 
                      onChange={e => setIndividualPrices({...individualPrices, video: e.target.value})} 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTherapist(null)}>Cancel</Button>
            <Button onClick={handleSaveIndividualPrices} disabled={isSaving} className="bg-primary text-white">
              {isSaving ? "Saving..." : "Save Base Prices"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}