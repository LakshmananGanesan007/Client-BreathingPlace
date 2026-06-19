import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Eye, Palette, Link2, Type, Check, ImageIcon } from "lucide-react";
import CloudinaryUpload from "@/components/CloudinaryUpload";
import { cn } from "@/lib/utils";

const PALETTE = ["#2E8B57","#1a6b8a","#7c3aed","#e11d48","#ea580c","#ca8a04","#0f766e","#374151"];

export default function TherapistProfileEditor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profiles = [] } = useQuery({
    queryKey: ["my-therapist-profile", user?.id],
    queryFn: () => base44.entities.TherapistProfile.filter({ user_id: user.id }),
    enabled: !!user,
  });

  const profile = profiles[0];

  const [form, setForm] = useState({
    full_name: "",
    bio: "",
    profile_tagline: "",
    slug: "",
    profile_color: "#2E8B57",
    profile_photo_url: "",
    specializations: [],
    languages: [],
    available_days: [],
    available_times: [],
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        bio: profile.bio || "",
        profile_tagline: profile.profile_tagline || "",
        slug: profile.slug || profile.full_name?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "",
        profile_color: profile.profile_color || "#2E8B57",
        profile_photo_url: profile.profile_photo_url || "",
        specializations: profile.specializations || [],
        available_days: profile.available_days || [],
        available_times: profile.available_times || [],
        languages: profile.languages || [],
      });
    }
  }, [profile]);

  const upd = (field, val) => setForm((p) => ({ ...p, [field]: val }));

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.TherapistProfile.update(profile.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-therapist-profile"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSave = () => {
    if (!profile) return;
    // NOTE: consultation_fee is NOT editable here — super admin only
    mutation.mutate({
      full_name: form.full_name,
      bio: form.bio,
      profile_tagline: form.profile_tagline,
      slug: form.slug.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      profile_color: form.profile_color,
      specializations: form.specializations,
      available_days: form.available_days,
      available_times: form.available_times,
      languages: form.languages,
    });
  };

  const profileUrl = `${window.location.origin}/therapist/${form.slug}`;

  if (!profile) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500 text-sm">Profile not found. Please complete your application first.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <button onClick={() => navigate("/therapist")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <h1 className="font-heading font-semibold text-base text-foreground">Edit My Profile</h1>
        <Button size="sm" className="gap-1.5 rounded-lg" onClick={handleSave} disabled={mutation.isPending}>
          {saved ? <><Check className="w-3.5 h-3.5" /> Saved!</> : <><Save className="w-3.5 h-3.5" /> {mutation.isPending ? "Saving..." : "Save Changes"}</>}
        </Button>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Preview link */}
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <Eye className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5">Your public profile URL</p>
            <p className="text-sm text-primary font-medium truncate">{profileUrl}</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-lg text-xs flex-shrink-0" onClick={() => window.open(profileUrl, "_blank")}>Preview</Button>
        </div>

        {/* Profile Photo */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="font-heading font-semibold text-sm text-foreground flex items-center gap-2"><ImageIcon className="w-4 h-4 text-primary" /> Profile Photo</h2>
          <CloudinaryUpload
            value={form.profile_photo_url || profile?.profile_photo_url || ""}
            onChange={(url) => {
              upd("profile_photo_url", url);
              mutation.mutate({ profile_photo_url: url });
            }}
            label="Professional Photo"
            size="w-28 h-28"
          />
          <p className="text-xs text-muted-foreground text-center">Photo is saved immediately when uploaded.</p>
        </div>

        {/* Basic Info */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="font-heading font-semibold text-sm text-foreground flex items-center gap-2"><Type className="w-4 h-4 text-primary" /> Profile Text</h2>
          <div>
            <Label className="text-xs">Display Name</Label>
            <Input className="mt-1 h-9 rounded-lg text-sm" value={form.full_name} onChange={(e) => upd("full_name", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Profile Tagline <span className="text-muted-foreground font-normal">(shown under your name)</span></Label>
            <Input className="mt-1 h-9 rounded-lg text-sm" value={form.profile_tagline} onChange={(e) => upd("profile_tagline", e.target.value)} placeholder="e.g. Helping you heal, one session at a time." />
          </div>
          <div>
            <Label className="text-xs">Bio</Label>
            <Textarea className="mt-1 text-sm rounded-lg resize-none" rows={4} value={form.bio} onChange={(e) => upd("bio", e.target.value)} placeholder="Tell potential clients about your approach, style, and how you help..." />
          </div>
          <div>
            <Label className="text-xs">Languages <span className="text-muted-foreground font-normal">(comma-separated, first is main)</span></Label>
            <Input className="mt-1 h-9 rounded-lg text-sm" value={form.languages.join(", ")} onChange={(e) => upd("languages", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="English, Tamil, Hindi" />
            {form.languages.length > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Main: <span className="text-primary font-medium">{form.languages[0]}</span>
                {form.languages.length > 1 && <span>, Others: {form.languages.slice(1).join(", ")}</span>}
              </p>
            )}
          </div>
        </div>

        {/* Slug */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <h2 className="font-heading font-semibold text-sm text-foreground flex items-center gap-2"><Link2 className="w-4 h-4 text-primary" /> Profile URL Slug</h2>
          <div>
            <Label className="text-xs">Custom Slug</Label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded-lg border border-border whitespace-nowrap">breathingplace.com/therapist/</span>
              <Input className="flex-1 h-9 rounded-lg text-sm" value={form.slug} onChange={(e) => upd("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="your-name" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Only lowercase letters, numbers, and hyphens. No spaces.</p>
          </div>
        </div>

        {/* Color */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <h2 className="font-heading font-semibold text-sm text-foreground flex items-center gap-2"><Palette className="w-4 h-4 text-primary" /> Profile Color</h2>
          <div className="flex items-center gap-3 flex-wrap">
            {PALETTE.map((c) => (
              <button key={c} onClick={() => upd("profile_color", c)} style={{ backgroundColor: c }} className={`w-8 h-8 rounded-lg border-2 transition-all ${form.profile_color === c ? "border-gray-900 scale-110" : "border-transparent"}`}>
                {form.profile_color === c && <Check className="w-4 h-4 text-white mx-auto" />}
              </button>
            ))}
            <div className="flex items-center gap-2 ml-2">
              <Label className="text-xs text-muted-foreground">Custom:</Label>
              <input type="color" value={form.profile_color} onChange={(e) => upd("profile_color", e.target.value)} className="w-8 h-8 rounded-lg border border-border cursor-pointer" />
            </div>
          </div>
          <div className="rounded-xl p-3 text-white text-sm font-medium text-center mt-2" style={{ backgroundColor: form.profile_color }}>
            Preview: {form.full_name || "Your Name"}
          </div>
        </div>

        {/* Note about fee */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 flex items-center justify-between">
          <div>
            <strong>Note:</strong> Consultation fee can only be changed by a Super Admin. Please contact the admin team to update your session fee.
          </div>
          <div className="text-right ml-4">
            <p className="text-[10px] text-amber-600 uppercase font-bold tracking-wider">Your Base Fee</p>
            <p className="text-lg font-bold">₹{profile.consultation_fee || 0}</p>
          </div>
        </div>

        <div className="flex justify-end pb-8">
          <Button className="rounded-lg gap-2 px-6" onClick={handleSave} disabled={mutation.isPending}>
            <Save className="w-4 h-4" /> {mutation.isPending ? "Saving..." : "Save All Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}