import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LogOut, Save, ArrowLeft, CheckCircle, Clock, XCircle, ShieldCheck } from "lucide-react";
import CloudinaryUpload from "@/components/CloudinaryUpload";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const selectedRole = userProfile?.selected_role;
  const isAdmin = selectedRole === "super_admin" || selectedRole === "admin";
  const isCustomer = selectedRole === "customer";

  const dashboardPath = isAdmin ? "/admin" : selectedRole === "therapist" ? "/therapist" : "/dashboard";

  const { data: customerProfile } = useQuery({
    queryKey: ["my-customer-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('customer_profiles').select('*').eq('user_id', user.id).single();
      return data || null;
    },
    enabled: !!user?.id && isCustomer,
  });

  const { data: therapistProfile } = useQuery({
    queryKey: ["my-therapist-profile-settings", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('therapist_profiles').select('*').eq('user_id', user.id).single();
      return data || null;
    },
    enabled: !!user?.id && selectedRole === "therapist",
  });

  const [profileForm, setProfileForm] = useState({});
  useEffect(() => {
    if (customerProfile) {
      setProfileForm({
        full_name: customerProfile.full_name || "",
        phone: customerProfile.phone || "",
        address: customerProfile.address || "",
        occupation: customerProfile.occupation || "",
        profile_photo_url: customerProfile.profile_photo_url || "",
      });
    }
  }, [customerProfile]);

  const updateProfile = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from('customer_profiles').update(data).eq('id', customerProfile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-customer-profile"] });
      toast.success("Profile updated!");
    },
  });

  const [emailForm, setEmailForm] = useState({ newEmail: "", currentPassword: "" });
  const [emailLoading, setEmailLoading] = useState(false);

  const handleEmailChange = async () => {
    if (!emailForm.newEmail || !emailForm.currentPassword) {
      toast.error("Please fill in all fields.");
      return;
    }
    
    const { data: existingUsers } = await supabase
      .from("user_profiles")
      .select("user_id, email")
      .eq("email", emailForm.newEmail)
      .single();
    
    if (existingUsers && existingUsers.user_id !== user.id) {
      toast.error("Email already in use by another account.");
      return;
    }
    
    setEmailLoading(true);
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: emailForm.currentPassword,
    });
    if (signInErr) {
      toast.error("Current password is incorrect.");
      setEmailLoading(false);
      return;
    }
    
    const { error: authError } = await supabase.auth.updateUser({ email: emailForm.newEmail });
    if (authError) {
      toast.error(authError.message);
      setEmailLoading(false);
      return;
    }
    
    const { error: dbError } = await supabase
      .from("user_profiles")
      .update({ email: emailForm.newEmail, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    
    if (dbError) {
      toast.error("Failed to update database: " + dbError.message);
      setEmailLoading(false);
      return;
    }
    
    toast.success("Email updated! Please check your new email for confirmation.");
    setEmailForm({ newEmail: "", currentPassword: "" });
    setEmailLoading(false);
  };

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwLoading, setPwLoading] = useState(false);

  const handlePasswordChange = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setPwLoading(true);
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: pwForm.currentPassword,
    });
    if (signInErr) {
      toast.error("Current password is incorrect.");
      setPwLoading(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully!");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    }
    setPwLoading(false);
  };

  const therapistStatusMap = {
    pending: { label: "Under Review", color: "bg-amber-100 text-amber-800", icon: Clock },
    approved: { label: "Approved", color: "bg-green-100 text-green-800", icon: CheckCircle },
    rejected: { label: "Rejected", color: "bg-red-100 text-red-800", icon: XCircle },
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(dashboardPath)} className="gap-2 -ml-2">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>
      </div>
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Account</CardTitle>
          <CardDescription>Your login information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground mt-1">
              To change your email, use the "Change Email Address" section below
            </p>
          </div>
          <div>
            <Label>Role</Label>
            <Input value={selectedRole ? selectedRole.replace(/_/g, " ") : "—"} disabled className="bg-muted capitalize" />
          </div>
        </CardContent>
      </Card>

      {customerProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Profile</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CloudinaryUpload
              value={profileForm.profile_photo_url || ""}
              onChange={async (url) => {
                await supabase.from('customer_profiles').update({ profile_photo_url: url }).eq('id', customerProfile.id);
                queryClient.invalidateQueries({ queryKey: ["my-customer-profile"] });
                setProfileForm(prev => ({ ...prev, profile_photo_url: url }));
                toast.success("Photo updated!");
              }}
              label="Profile Photo"
              size="w-20 h-20"
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                <Input value={profileForm.full_name || ""} onChange={e => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={profileForm.phone || ""} onChange={e => setProfileForm(prev => ({ ...prev, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Address</Label><Input value={profileForm.address || ""} onChange={e => setProfileForm(prev => ({ ...prev, address: e.target.value }))} /></div>
              <div><Label>Occupation</Label><Input value={profileForm.occupation || ""} onChange={e => setProfileForm(prev => ({ ...prev, occupation: e.target.value }))} /></div>
            </div>
            <Button onClick={() => updateProfile.mutate(profileForm)} className="gap-2" disabled={!customerProfile || updateProfile.isPending}>
              <Save className="w-4 h-4" /> Save Changes
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedRole === "therapist" && therapistProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Application Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex-1">
                <p className="text-sm font-medium">Therapist Application</p>
                <p className="text-xs text-muted-foreground mt-0.5">Submitted as {therapistProfile.full_name}</p>
              </div>
              {(() => {
                const s = therapistStatusMap[therapistProfile.approval_status];
                const Icon = s?.icon || Clock;
                return (
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" />
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s?.color || "bg-gray-100 text-gray-800"}`}>
                      {s?.label || therapistProfile.approval_status}
                    </span>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <div>
                <CardTitle className="font-heading text-lg">Change Email Address</CardTitle>
                <CardDescription>Update the email used to sign in</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Current Password <span className="text-destructive">*</span></Label>
              <Input
                type="password"
                className="mt-1"
                value={emailForm.currentPassword}
                onChange={e => setEmailForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter current password to verify identity"
              />
            </div>
            <div>
              <Label>New Email Address <span className="text-destructive">*</span></Label>
              <Input
                type="email"
                className="mt-1"
                value={emailForm.newEmail}
                onChange={e => setEmailForm(prev => ({ ...prev, newEmail: e.target.value }))}
                placeholder="new@email.com"
              />
            </div>
            <Button onClick={handleEmailChange} disabled={emailLoading} className="gap-2">
              <Save className="w-4 h-4" /> {emailLoading ? "Updating..." : "Update Email"}
            </Button>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <div>
                <CardTitle className="font-heading text-lg">Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Current Password <span className="text-destructive">*</span></Label>
              <Input
                type="password"
                className="mt-1"
                value={pwForm.currentPassword}
                onChange={e => setPwForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter your current password"
              />
            </div>
            <div>
              <Label>New Password <span className="text-destructive">*</span></Label>
              <Input
                type="password"
                className="mt-1"
                value={pwForm.newPassword}
                onChange={e => setPwForm(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <Label>Confirm New Password <span className="text-destructive">*</span></Label>
              <Input
                type="password"
                className="mt-1"
                value={pwForm.confirmPassword}
                onChange={e => setPwForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Re-enter new password"
              />
            </div>
            <Button onClick={handlePasswordChange} disabled={pwLoading} className="gap-2">
              <Save className="w-4 h-4" /> {pwLoading ? "Updating..." : "Update Password"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Separator />

      <Button variant="destructive" onClick={() => supabase.auth.signOut().then(() => { window.location.href = "/"; })} className="gap-2">
        <LogOut className="w-4 h-4" /> Sign Out
      </Button>
    </div>
  );
}