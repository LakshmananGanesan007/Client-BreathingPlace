import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MessageCircle, Video, IndianRupee, Settings2, Save, Loader2,
  Info, RefreshCw, Calculator, Users, TrendingUp, ShieldCheck
} from "lucide-react";
import { toast } from "sonner";

const DEFAULT_CHAT_CONFIG = {
  free_minutes_new: 15,
  free_minutes_returning: 10,
  paid_duration_minutes: 20,
  paid_amount: 150,
  therapist_revenue_percent: 73,
};

const DEFAULT_VIDEO_CONFIG = {
  session_duration_minutes: 50,
  warning_minutes: 45,
  cashfree_fee_fixed: 10,
};

const DEFAULT_REVENUE_CONFIG = {
  platform_commission_percent: 20,
  cashfree_fee_fixed: 10,
  cashfree_fee_percent: 2,
};

function ConfigCard({ title, icon: Icon, children, onSave, saving, preview }) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/20">
        <Icon className="w-5 h-5 text-primary" />
        <h2 className="font-heading text-base font-semibold">{title}</h2>
      </div>
      <div className="p-5 space-y-4">
        {children}
        {preview && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mt-2">
            <p className="text-xs text-blue-700 font-medium flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> {preview}
            </p>
          </div>
        )}
        <div className="flex justify-end pt-2">
          <Button size="sm" onClick={onSave} disabled={saving} className="gap-2 shadow-sm">
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</> : <><Save className="w-3.5 h-3.5" /> Save Configuration</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ label, hint, children }) {
  return (
    <div className="grid sm:grid-cols-3 gap-2 items-start">
      <div className="sm:col-span-1">
        <Label className="text-sm font-medium">{label}</Label>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className="sm:col-span-2">{children}</div>
    </div>
  );
}

export default function AdminPricing() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [chatConfig, setChatConfig] = useState(DEFAULT_CHAT_CONFIG);
  const [videoConfig, setVideoConfig] = useState(DEFAULT_VIDEO_CONFIG);
  const [revenueConfig, setRevenueConfig] = useState(DEFAULT_REVENUE_CONFIG);

  const [savingChat, setSavingChat] = useState(false);
  const [savingVideo, setSavingVideo] = useState(false);
  const [savingRevenue, setSavingRevenue] = useState(false);

  // Load all configs
  const { data: configs, isLoading } = useQuery({
    queryKey: ["platform-pricing-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .in("setting_type", ["chat_config", "video_config", "revenue_config"]);
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (!configs) return;
    const chat = configs.find((c) => c.setting_type === "chat_config");
    const video = configs.find((c) => c.setting_type === "video_config");
    const revenue = configs.find((c) => c.setting_type === "revenue_config");
    if (chat?.setting_value) setChatConfig({ ...DEFAULT_CHAT_CONFIG, ...chat.setting_value });
    if (video?.setting_value) setVideoConfig({ ...DEFAULT_VIDEO_CONFIG, ...video.setting_value });
    if (revenue?.setting_value) setRevenueConfig({ ...DEFAULT_REVENUE_CONFIG, ...revenue.setting_value });
  }, [configs]);

  const saveConfig = async (settingType, value, setSaving) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("platform_settings").upsert(
        { setting_type: settingType, setting_value: value, updated_at: new Date().toISOString() },
        { onConflict: "setting_type" }
      );
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["platform-pricing-configs"] });
      toast.success("Configuration saved successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save. Ensure the platform_settings table exists.");
    } finally {
      setSaving(false);
    }
  };

  // Live price example calc
  const exampleTherapistFee = 500;
  const examplePlatformFee = Math.round(exampleTherapistFee * (revenueConfig.platform_commission_percent / 100));
  const exampleCashfree = Math.round((exampleTherapistFee + examplePlatformFee) * (revenueConfig.cashfree_fee_percent / 100)) + revenueConfig.cashfree_fee_fixed;
  const exampleFinalPrice = exampleTherapistFee + examplePlatformFee + exampleCashfree;

  const chatTherapistShare = Math.round(chatConfig.paid_amount * (chatConfig.therapist_revenue_percent / 100));
  const chatPlatformShare = chatConfig.paid_amount - chatTherapistShare;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Pricing & Revenue Configuration</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Control all pricing, session durations, and revenue splits. Customers only see the final price — never the breakdown.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => queryClient.invalidateQueries({ queryKey: ["platform-pricing-configs"] })}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* CHAT CONFIGURATION */}
      <ConfigCard
        title="Chat Session Configuration"
        icon={MessageCircle}
        onSave={() => saveConfig("chat_config", chatConfig, setSavingChat)}
        saving={savingChat}
        preview={`New customers get ${chatConfig.free_minutes_new} min free → then ₹${chatConfig.paid_amount} per ${chatConfig.paid_duration_minutes} min block. Returning customers get ${chatConfig.free_minutes_returning} min free.`}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium">Free Minutes – New Customer</Label>
            <p className="text-[11px] text-muted-foreground mb-1">First-time customer free chat duration</p>
            <div className="flex items-center gap-2">
              <Input
                type="number" min="0" max="60"
                className="h-9 text-sm"
                value={chatConfig.free_minutes_new}
                onChange={(e) => setChatConfig({ ...chatConfig, free_minutes_new: parseInt(e.target.value) || 0 })}
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">minutes</span>
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium">Free Minutes – Returning Customer</Label>
            <p className="text-[11px] text-muted-foreground mb-1">Lifetime free minutes after first session</p>
            <div className="flex items-center gap-2">
              <Input
                type="number" min="0" max="60"
                className="h-9 text-sm"
                value={chatConfig.free_minutes_returning}
                onChange={(e) => setChatConfig({ ...chatConfig, free_minutes_returning: parseInt(e.target.value) || 0 })}
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">minutes</span>
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium">Paid Chat Block Duration</Label>
            <p className="text-[11px] text-muted-foreground mb-1">Minutes unlocked after each payment</p>
            <div className="flex items-center gap-2">
              <Input
                type="number" min="5" max="120"
                className="h-9 text-sm"
                value={chatConfig.paid_duration_minutes}
                onChange={(e) => setChatConfig({ ...chatConfig, paid_duration_minutes: parseInt(e.target.value) || 20 })}
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">minutes</span>
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium">Paid Chat Amount</Label>
            <p className="text-[11px] text-muted-foreground mb-1">Customer pays this for each paid block</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">₹</span>
              <Input
                type="number" min="0"
                className="h-9 text-sm"
                value={chatConfig.paid_amount}
                onChange={(e) => setChatConfig({ ...chatConfig, paid_amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>

        {/* Chat Revenue Split */}
        <div className="border-t border-border pt-4">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-3">Chat Revenue Distribution</Label>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium">Therapist Revenue Share</Label>
              <p className="text-[11px] text-muted-foreground mb-1">Percentage of chat payment to therapist</p>
              <div className="flex items-center gap-2">
                <Input
                  type="number" min="0" max="100"
                  className="h-9 text-sm"
                  value={chatConfig.therapist_revenue_percent}
                  onChange={(e) => setChatConfig({ ...chatConfig, therapist_revenue_percent: parseFloat(e.target.value) || 0 })}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <div className="flex flex-col justify-end pb-1">
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 text-xs space-y-1">
                <p className="font-semibold text-slate-700">Example for ₹{chatConfig.paid_amount} payment:</p>
                <p className="text-green-700">Therapist: ₹{chatTherapistShare} ({chatConfig.therapist_revenue_percent}%)</p>
                <p className="text-blue-700">Platform: ₹{chatPlatformShare} ({100 - chatConfig.therapist_revenue_percent}%)</p>
              </div>
            </div>
          </div>
        </div>
      </ConfigCard>

      {/* VIDEO SESSION CONFIGURATION */}
      <ConfigCard
        title="Video Session Configuration"
        icon={Video}
        onSave={() => saveConfig("video_config", videoConfig, setSavingVideo)}
        saving={savingVideo}
        preview={`Sessions run up to ${videoConfig.session_duration_minutes} minutes. Reminder sent at ${videoConfig.warning_minutes} minutes.`}
      >
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs font-medium">Session Duration</Label>
            <p className="text-[11px] text-muted-foreground mb-1">Maximum session length</p>
            <div className="flex items-center gap-2">
              <Input
                type="number" min="15" max="120"
                className="h-9 text-sm"
                value={videoConfig.session_duration_minutes}
                onChange={(e) => setVideoConfig({ ...videoConfig, session_duration_minutes: parseInt(e.target.value) || 50 })}
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">min</span>
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium">Warning Reminder At</Label>
            <p className="text-[11px] text-muted-foreground mb-1">Send timer warning to both parties</p>
            <div className="flex items-center gap-2">
              <Input
                type="number" min="5" max="90"
                className="h-9 text-sm"
                value={videoConfig.warning_minutes}
                onChange={(e) => setVideoConfig({ ...videoConfig, warning_minutes: parseInt(e.target.value) || 45 })}
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">min</span>
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium">Cashfree Fixed Fee</Label>
            <p className="text-[11px] text-muted-foreground mb-1">Per-transaction fee charged by Cashfree</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">₹</span>
              <Input
                type="number" min="0"
                className="h-9 text-sm"
                value={videoConfig.cashfree_fee_fixed}
                onChange={(e) => setVideoConfig({ ...videoConfig, cashfree_fee_fixed: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>
      </ConfigCard>

      {/* REVENUE & COMMISSION CONFIGURATION */}
      <ConfigCard
        title="Platform Commission & Cashfree"
        icon={TrendingUp}
        onSave={() => saveConfig("revenue_config", revenueConfig, setSavingRevenue)}
        saving={savingRevenue}
      >
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs font-medium">Platform Commission</Label>
            <p className="text-[11px] text-muted-foreground mb-1">% added on top of therapist fee</p>
            <div className="flex items-center gap-2">
              <Input
                type="number" min="0" max="100"
                className="h-9 text-sm"
                value={revenueConfig.platform_commission_percent}
                onChange={(e) => setRevenueConfig({ ...revenueConfig, platform_commission_percent: parseFloat(e.target.value) || 0 })}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium">Cashfree Fixed Fee</Label>
            <p className="text-[11px] text-muted-foreground mb-1">Flat fee per transaction (₹)</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">₹</span>
              <Input
                type="number" min="0"
                className="h-9 text-sm"
                value={revenueConfig.cashfree_fee_fixed}
                onChange={(e) => setRevenueConfig({ ...revenueConfig, cashfree_fee_fixed: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium">Cashfree % Fee</Label>
            <p className="text-[11px] text-muted-foreground mb-1">Percentage charged by Cashfree</p>
            <div className="flex items-center gap-2">
              <Input
                type="number" min="0" max="10" step="0.1"
                className="h-9 text-sm"
                value={revenueConfig.cashfree_fee_percent}
                onChange={(e) => setRevenueConfig({ ...revenueConfig, cashfree_fee_percent: parseFloat(e.target.value) || 0 })}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        </div>

        {/* Price Breakdown Example */}
        <div className="border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5" /> Price Breakdown Example (Therapist Fee: ₹{exampleTherapistFee})
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Therapist Fee</span><span className="font-bold text-slate-800">₹{exampleTherapistFee}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Platform Fee ({revenueConfig.platform_commission_percent}%)</span><span className="font-bold text-slate-800">₹{examplePlatformFee}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Cashfree Charges</span><span className="font-bold text-slate-800">₹{exampleCashfree}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-2"><span className="font-bold text-slate-800">Final Customer Price</span><span className="text-lg font-black text-blue-700">₹{exampleFinalPrice}</span></div>
            </div>
            <div className="space-y-2">
              <div className="bg-amber-50 rounded-lg border border-amber-100 p-3">
                <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Customer Sees Only
                </p>
                <p className="text-sm text-amber-700">"Session Fee: <strong>₹{exampleFinalPrice}</strong>"</p>
                <p className="text-[11px] text-amber-600 mt-1">Therapist fee, platform fee, and Cashfree charges are never shown to customers.</p>
              </div>
              <div className="bg-green-50 rounded-lg border border-green-100 p-3">
                <p className="text-xs font-bold text-green-800 mb-1">Per Session Revenue</p>
                <p className="text-[11px] text-green-700">Therapist: ₹{exampleTherapistFee}</p>
                <p className="text-[11px] text-green-700">Platform: ₹{examplePlatformFee}</p>
                <p className="text-[11px] text-green-700">Cashfree: ₹{exampleCashfree}</p>
              </div>
            </div>
          </div>
        </div>
      </ConfigCard>

      {/* Link to per-therapist pricing */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <IndianRupee className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-900">Per-Therapist Pricing</p>
          <p className="text-xs text-blue-700 mt-0.5">Set individual therapist base prices and override the final customer price per therapist in the Fee Management page.</p>
        </div>
        <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100" onClick={() => navigate("/admin/fees")}>
          Manage Therapist Fees
        </Button>
      </div>
    </div>
  );
}
