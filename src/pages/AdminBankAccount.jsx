import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Landmark, ShieldCheck, CheckCircle2, Save, Loader2, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const SETTING_TYPE = "bank_account";

export default function AdminBankAccount() {
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    account_holder_name: "",
    account_number: "",
    confirm_account_number: "",
    ifsc_code: "",
    bank_name: "",
    account_type: "savings",
  });

  const { data: savedSettings, isLoading } = useQuery({
    queryKey: ["platform-bank-account"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_type", SETTING_TYPE)
        .maybeSingle();
      return data?.setting_value || null;
    },
  });

  useEffect(() => {
    if (savedSettings) {
      setForm({
        account_holder_name: savedSettings.account_holder_name || "",
        account_number: savedSettings.account_number || "",
        confirm_account_number: savedSettings.account_number || "",
        ifsc_code: savedSettings.ifsc_code || "",
        bank_name: savedSettings.bank_name || "",
        account_type: savedSettings.account_type || "savings",
      });
    }
  }, [savedSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (form.account_number !== form.confirm_account_number) {
        throw new Error("Account numbers do not match.");
      }
      if (!form.account_number || !form.ifsc_code || !form.account_holder_name) {
        throw new Error("Account holder name, account number, and IFSC are required.");
      }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc_code.toUpperCase())) {
        throw new Error("Invalid IFSC code format (e.g., SBIN0001234).");
      }

      const payload = {
        account_holder_name: form.account_holder_name.trim(),
        account_number: form.account_number.trim(),
        ifsc_code: form.ifsc_code.toUpperCase().trim(),
        bank_name: form.bank_name.trim(),
        account_type: form.account_type,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("platform_settings")
        .upsert({ setting_type: SETTING_TYPE, setting_value: payload }, { onConflict: "setting_type" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-bank-account"] });
      toast.success("Bank account details saved successfully!");
    },
    onError: (err) => toast.error(err.message),
  });

  const cfAppId = import.meta.env.VITE_CASHFREE_APP_ID;
  const maskedId = cfAppId ? `${cfAppId.slice(0, 6)}${"•".repeat(Math.max(0, cfAppId.length - 10))}${cfAppId.slice(-4)}` : "Not configured";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Bank Account Management</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage payout bank account and Cashfree payment gateway settings.
        </p>
      </div>

      {/* Cashfree Connection Status */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-heading text-base font-semibold">Cashfree Payment Gateway</h2>
            <p className="text-xs text-muted-foreground">Payment processing credentials</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-muted/40 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">App ID</p>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono text-foreground">{maskedId}</code>
              {cfAppId && <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />}
            </div>
          </div>
          <div className="bg-muted/40 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Secret Key</p>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono text-foreground">
                {import.meta.env.VITE_CASHFREE_SECRET_KEY ? "••••••••••••••••" : "Not configured"}
              </code>
              {import.meta.env.VITE_CASHFREE_SECRET_KEY && <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <p className="text-xs text-green-700 font-medium">Production mode active</p>
          <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs gap-1" asChild>
            <a href="https://merchant.cashfree.com/" target="_blank" rel="noopener noreferrer">
              Cashfree Dashboard <ExternalLink className="w-3 h-3" />
            </a>
          </Button>
        </div>
      </div>

      {/* Bank Account Form */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Landmark className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-heading text-base font-semibold">Payout Bank Account</h2>
            <p className="text-xs text-muted-foreground">Account where platform earnings will be credited</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Account Holder Name <span className="text-destructive">*</span></Label>
              <Input
                className="mt-1"
                value={form.account_holder_name}
                onChange={e => setForm(f => ({ ...f, account_holder_name: e.target.value }))}
                placeholder="As per bank records"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Account Number <span className="text-destructive">*</span></Label>
                <Input
                  className="mt-1"
                  type="password"
                  value={form.account_number}
                  onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))}
                  placeholder="Enter account number"
                />
              </div>
              <div>
                <Label>Confirm Account Number <span className="text-destructive">*</span></Label>
                <Input
                  className="mt-1"
                  value={form.confirm_account_number}
                  onChange={e => setForm(f => ({ ...f, confirm_account_number: e.target.value }))}
                  placeholder="Re-enter account number"
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>IFSC Code <span className="text-destructive">*</span></Label>
                <Input
                  className="mt-1 uppercase"
                  value={form.ifsc_code}
                  onChange={e => setForm(f => ({ ...f, ifsc_code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. SBIN0001234"
                  maxLength={11}
                />
              </div>
              <div>
                <Label>Bank Name</Label>
                <Input
                  className="mt-1"
                  value={form.bank_name}
                  onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}
                  placeholder="e.g. State Bank of India"
                />
              </div>
            </div>
            <div>
              <Label>Account Type</Label>
              <select
                className="mt-1 w-full h-10 rounded-lg border border-border bg-background text-sm px-3"
                value={form.account_type}
                onChange={e => setForm(f => ({ ...f, account_type: e.target.value }))}
              >
                <option value="savings">Savings</option>
                <option value="current">Current</option>
              </select>
            </div>

            {savedSettings?.updated_at && (
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(savedSettings.updated_at).toLocaleString("en-IN")}
              </p>
            )}

            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="gap-2 w-full sm:w-auto"
            >
              {saveMutation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                : <><Save className="w-4 h-4" /> Save Bank Details</>}
            </Button>
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">Important</p>
        <p>Bank account details are stored securely. Payouts to therapists are processed separately. Ensure the account details match your Cashfree merchant registration for seamless settlements.</p>
      </div>
    </div>
  );
}
