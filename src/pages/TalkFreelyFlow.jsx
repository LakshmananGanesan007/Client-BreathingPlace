import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, ArrowLeft, Heart, MessageCircle, Phone, Loader2, User, Star, Globe, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import logo from "@/assets/logo.png";

// ─── Constants ──────────────────────────────────────────────────────────────

const MOODS = [
  { label: "Feeling Low" },
  { label: "Lonely" },
  { label: "Overthinking" },
  { label: "Heartbroken" },
  { label: "Anxiety / Stress" },
  { label: "Just Need Someone to Talk" },
  { label: "Other" },
];

const SUPPORT_TYPES = [
  { label: "Just Someone to Listen", icon: "🎧" },
  { label: "Emotional Guidance", icon: "💚" },
  { label: "Relationship Support", icon: "💑" },
  { label: "Anxiety / Stress Support", icon: "🌿" },
  { label: "Personal Growth", icon: "🌱" },
  { label: "Trauma / Healing", icon: "🕊️" },
  { label: "Career / Life Confusion", icon: "🧭" },
];

const INTERNATIONAL_LANGUAGES = [
  "English", "Hindi (हिंदी)", "Tamil (தமிழ்)", "Telugu (తెలుగు)", "Malayalam (മലയാളം)",
  "Kannada (ಕನ್ನಡ)", "Bengali (বাংলা)", "Marathi (मराठी)", "Gujarati (ગુજરાતી)",
  "Punjabi (ਪੰਜਾਬੀ)", "Urdu (اردو)", "Odia (ଓଡ଼ିଆ)", "Assamese (অসমীয়া)",
  "Spanish", "French", "German", "Portuguese", "Italian", "Dutch", "Russian",
  "Arabic (عربي)", "Chinese (中文)", "Japanese (日本語)", "Korean (한국어)",
  "Turkish", "Persian (فارسی)", "Swahili", "Other",
];

const URGENCY = [
  { label: "I'm okay, just need support", color: "bg-green-50 border-green-300 text-green-800" },
  { label: "Feeling emotionally overwhelmed", color: "bg-yellow-50 border-yellow-300 text-yellow-800" },
  { label: "Need urgent emotional help", color: "bg-red-50 border-red-300 text-red-800" },
];

const TOTAL_STEPS = 8;

// ─── Shared UI Components ────────────────────────────────────────────────────

function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-1.5 rounded-full flex-1 transition-all ${i < current ? "bg-primary" : "bg-gray-200"}`} />
      ))}
    </div>
  );
}

function StepCard({ stepNum, title, subtitle, children, onBack, onContinue, continueDisabled, continueLabel = "Continue", hideBack }) {
  return (
    <div className="max-w-sm mx-auto w-full">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-primary/5 border-b border-gray-100 px-5 py-3 flex items-center gap-3">
          <img src={logo} alt="BreathingPlace" className="h-7 w-auto object-contain" />
          <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{stepNum}</span>
          <p className="text-[10px] text-primary font-semibold uppercase tracking-wide">Talk Freely</p>
        </div>
        <div className="px-5 pt-4 pb-5">
          <h2 className="font-display text-base font-bold text-gray-900 leading-snug mb-0.5">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mb-4">{subtitle}</p>}
          <div className="mt-3">{children}</div>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          {!hideBack && (
            <Button variant="outline" size="sm" className="flex-shrink-0 rounded-full" onClick={onBack}>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button className="flex-1 rounded-full bg-primary text-white font-semibold text-sm" size="sm" onClick={onContinue} disabled={continueDisabled}>
            {continueLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SelectOption({ label, icon, selected, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left text-sm transition-all ${selected ? "border-primary bg-primary/5 font-medium text-primary" : "border-gray-200 hover:border-gray-300 text-gray-700"}`}>
      {icon && <span className="text-base flex-shrink-0">{icon}</span>}
      <span className="flex-1">{label}</span>
      {selected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
    </button>
  );
}

// ─── Multi-Language Selector ─────────────────────────────────────────────────

function LanguageSelector({ selected, onChange }) {
  const [search, setSearch] = useState("");
  const [otherText, setOtherText] = useState("");

  const filtered = INTERNATIONAL_LANGUAGES.filter(l => l.toLowerCase().includes(search.toLowerCase()));

  const toggle = (lang) => {
    if (lang === "Other") {
      if (selected.includes("Other")) {
        onChange(selected.filter(l => l !== "Other"));
      } else if (selected.length < 3) {
        onChange([...selected, "Other"]);
      }
      return;
    }
    if (selected.includes(lang)) {
      onChange(selected.filter(l => l !== lang));
    } else if (selected.length < 3) {
      onChange([...selected, lang]);
    }
  };

  const remove = (lang) => onChange(selected.filter(l => l !== lang));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 flex-wrap min-h-[32px]">
        {selected.map(l => (
          <span key={l} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
            {l === "Other" && otherText ? otherText : l}
            <button onClick={() => remove(l)}><X className="w-3 h-3" /></button>
          </span>
        ))}
        {selected.length === 0 && <span className="text-xs text-gray-400">Select at least 2 languages</span>}
      </div>
      <p className="text-[11px] text-gray-500">
        {selected.length === 0 ? "1st language required" : selected.length === 1 ? "2nd language required" : selected.length === 2 ? "3rd language optional (max 3)" : "Maximum 3 languages selected"}
      </p>
      <div className="relative">
        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="text" placeholder="Search language..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {filtered.map(l => {
          const isSelected = selected.includes(l);
          const isDisabled = !isSelected && selected.length >= 3;
          return (
            <button key={l} onClick={() => !isDisabled && toggle(l)} disabled={isDisabled}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${isSelected ? "border-primary bg-primary/5 text-primary font-semibold" : isDisabled ? "border-gray-100 text-gray-300 cursor-not-allowed" : "border-gray-200 text-gray-700 hover:border-primary/40"}`}>
              <span>{l}</span>
              {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
            </button>
          );
        })}
      </div>
      {selected.includes("Other") && (
        <div>
          <label className="text-xs font-semibold text-gray-700 mb-1 block">Specify language</label>
          <input type="text" placeholder="e.g. Nepali, Sinhala..." value={otherText} onChange={e => setOtherText(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
      )}
    </div>
  );
}

// ─── Therapist Card (Step 7) ─────────────────────────────────────────────────

function TherapistCard({ therapist, selected, onSelect, isBusy }) {
  return (
    <button onClick={() => onSelect(therapist)}
      className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${selected ? "border-primary bg-primary/5 shadow-sm" : "border-gray-200 hover:border-primary/40 bg-white"}`}>
      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200 relative">
        {therapist.profile_photo_url
          ? <img src={therapist.profile_photo_url} alt={therapist.full_name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><User className="w-5 h-5 text-gray-400" /></div>}
        {isBusy && (
          <div className="absolute inset-0 bg-gray-500/40 flex items-center justify-center rounded-full">
            <span className="text-[7px] text-white font-bold uppercase">Busy</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-bold text-gray-900 truncate">{therapist.full_name}</p>
          {isBusy && <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">In Session</span>}
        </div>
        <p className="text-[11px] text-primary font-medium truncate">{therapist.qualification}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
          <span className="text-[10px] text-gray-600 font-semibold">4.8</span>
          <span className="text-[10px] text-gray-400 mx-1">·</span>
          <span className="text-[10px] text-gray-500">{therapist.experience_years || "—"} yrs exp</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {(therapist.languages || []).slice(0, 2).map(l => (
            <span key={l} className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">{l}</span>
          ))}
        </div>
      </div>
      {selected && <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1"><Check className="w-3 h-3 text-white" /></div>}
    </button>
  );
}

// ─── Layout ──────────────────────────────────────────────────────────────────

function Layout({ children, step }) {
  return (
    <div className="min-h-screen py-10 px-4" style={{ backgroundColor: "#F0F0E0" }}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <img src={logo} alt="BreathingPlace" className="h-10 w-auto object-contain" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
            <Heart className="w-3.5 h-3.5 fill-primary" /> Talk Freely
          </div>
          <p className="text-xs text-gray-500">Step {step} of {TOTAL_STEPS}</p>
        </div>
        <StepIndicator current={step} total={TOTAL_STEPS} />
        {children}
      </div>
    </div>
  );
}

async function upgradeToCustomer(user) {
  try {
    if (!user || ["customer", "therapist", "admin", "super_admin"].includes(user.role)) return;
    await supabase.from("user_profiles").update({ selected_role: "customer" }).eq("user_id", user.id);
  } catch (error) {
    console.error("Failed to upgrade user role:", error);
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TalkFreelyFlow() {
  const navigate = useNavigate();
  const { user, userProfile, isLoadingAuth } = useAuth();

  // Block therapists and admins from accessing the customer talk-freely flow
  useEffect(() => {
    if (isLoadingAuth) return;
    if (!user) return; // unauthenticated users can browse steps
    const role = userProfile?.selected_role;
    const metaRole = user?.user_metadata?.role || "";
    if (role === "therapist") { navigate("/therapist", { replace: true }); return; }
    if (role === "super_admin" || metaRole === "super_admin" || metaRole === "admin") {
      navigate("/admin", { replace: true });
    }
  }, [user, userProfile, isLoadingAuth, navigate]);

  const [step, setStep] = useState(1);
  const [mood, setMood] = useState("");
  const [supportType, setSupportType] = useState("");
  const [languages, setLanguages] = useState([]);
  const [commMode, setCommMode] = useState("Chat Only");
  const [shareText, setShareText] = useState("");
  const [urgency, setUrgency] = useState("");
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const next = () => setStep(s => s + 1);
  const back = () => { if (step === 1) navigate("/complete-profile"); else setStep(s => s - 1); };

  // Fetch chat config for pricing display dynamically from platform settings
  const { data: chatConfig } = useQuery({
    queryKey: ["platform-chat-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_settings").select("setting_value").eq("setting_type", "chat_config").maybeSingle();
      if (error) console.warn("Could not fetch chat config, using defaults.");
      return { free_minutes_new: 15, free_minutes_returning: 10, paid_duration_minutes: 20, paid_amount: 149, ...((data?.setting_value) || {}) };
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch approved therapists (lazy — only when step 7 reached)
  const { data: allTherapists = [], isLoading: loadingTherapists } = useQuery({
    queryKey: ["therapists-talk-freely"],
    queryFn: async () => {
      const { data, error } = await supabase.from("therapist_profiles").select("*").eq("approval_status", "approved");
      if (error) throw error;
      return data || [];
    },
    enabled: step >= 7,
  });

  // Fetch busy therapist IDs (those with active support sessions)
  const { data: busyTherapistIds = [] } = useQuery({
    queryKey: ["busy-therapists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_sessions")
        .select("assigned_therapist_id")
        .eq("status", "active");
      if (error) throw error;
      return (data || []).map(s => s.assigned_therapist_id).filter(Boolean);
    },
    enabled: step >= 7,
    refetchInterval: 30000,
  });

  // Match therapists based on language preference
  const matchedTherapists = (() => {
    if (!allTherapists.length) return [];
    const langKeys = languages.map(l => l.split(" ")[0].toLowerCase());
    const matched = allTherapists.filter(t =>
      langKeys.some(key => (t.languages || []).some(l => l.toLowerCase().includes(key)))
    );
    return matched.length > 0 ? matched : allTherapists;
  })();

  const handleStartChat = async () => {
    if (!user) {
      sessionStorage.setItem("pending_intent", "/talk-freely");
      navigate("/login");
      return;
    }
    setIsProcessing(true);
    setErrorMsg("");
    try {
      upgradeToCustomer(user);

      // Ensure customer profile exists
      const { data: existing, error: findProfileError } = await supabase.from("customer_profiles").select("id").eq("user_id", user.id).maybeSingle();
      
      if (!existing && !findProfileError) {
        const { error: profileError } = await supabase.from("customer_profiles").insert({
          user_id: user.id,
          full_name: user.user_metadata?.full_name || user.email,
          preferred_language: languages[0] || "",
          main_concerns: supportType ? [supportType] : [],
          profile_complete: false,
        });
        if (profileError) console.warn("Warning creating profile: ", profileError);
      }

      // Create support session assigned to selected therapist
      const { data: newSession, error: sessionError } = await supabase.from("support_sessions").insert({
        customer_id: user.id,
        customer_name: user.user_metadata?.full_name || user.email?.split("@")[0],
        assigned_therapist_id: selectedTherapist?.user_id || selectedTherapist?.id || null, // Updated robust ID check
        assigned_therapist_name: selectedTherapist?.full_name || null,
        status: "pending",
        session_type: supportType || "General",
      }).select().single();

      if (sessionError) throw sessionError;

      // Initial context message
      const { error: messageError } = await supabase.from("support_messages").insert({
        session_id: newSession.id,
        sender_id: user.id,
        sender_type: "customer",
        message: `Mood: ${mood} | Support: ${supportType} | Languages: ${languages.join(", ")} | Urgency: ${urgency}\nNote: ${shareText || "None"}`,
      });
      if (messageError) console.warn("Warning inserting message: ", messageError);

      navigate(`/free-chat?session=${newSession.id}`);
    } catch (error) {
      console.error("Failed to start chat: ", error);
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Steps ─────────────────────────────────────────────────────────────────

  if (step === 1) return (
    <Layout step={1}>
      <StepCard stepNum={1} title="How are you feeling today?" subtitle="There's no right or wrong feeling. We're here for you." onBack={back} onContinue={next} continueDisabled={!mood} hideBack>
        <div className="space-y-2">
          {MOODS.map(m => <SelectOption key={m.label} label={m.label} selected={mood === m.label} onClick={() => setMood(m.label)} />)}
        </div>
      </StepCard>
    </Layout>
  );

  if (step === 2) return (
    <Layout step={2}>
      <StepCard stepNum={2} title="What kind of support do you need?" subtitle="Choose what feels right for you." onBack={back} onContinue={next} continueDisabled={!supportType}>
        <div className="space-y-2">
          {SUPPORT_TYPES.map(s => <SelectOption key={s.label} label={s.label} icon={s.icon} selected={supportType === s.label} onClick={() => setSupportType(s.label)} />)}
        </div>
      </StepCard>
    </Layout>
  );

  if (step === 3) return (
    <Layout step={3}>
      <StepCard stepNum={3} title="Which languages do you prefer?" subtitle="Select 2 languages (required). A 3rd is optional." onBack={back} onContinue={next} continueDisabled={languages.length < 2}>
        <LanguageSelector selected={languages} onChange={setLanguages} />
      </StepCard>
    </Layout>
  );

  if (step === 4) return (
    <Layout step={4}>
      <StepCard stepNum={4} title="How would you like to connect?" subtitle="Talk Freely supports chat. Voice call coming soon." onBack={back} onContinue={next} continueDisabled={false}>
        <div className="space-y-3">
          {/* Chat — active */}
          <button onClick={() => setCommMode("Chat Only")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all border-primary bg-primary/5`}>
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary">Chat Only</p>
              <p className="text-xs text-gray-500">Text chat with a listener</p>
            </div>
            <Check className="w-4 h-4 text-primary" />
          </button>
          {/* Voice Call — coming soon */}
          <div className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed">
            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">Voice Call</p>
              <p className="text-xs text-gray-400">Coming soon</p>
            </div>
            <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-medium">Soon</span>
          </div>
        </div>
      </StepCard>
    </Layout>
  );

  if (step === 5) return (
    <Layout step={5}>
      <StepCard stepNum={5} title="Want to share what's on your mind?" subtitle="Share only if you feel comfortable. You can skip this." onBack={back} onContinue={next} continueLabel={shareText ? "Continue" : "Skip"}>
        <Textarea placeholder="Write here..." value={shareText} onChange={e => setShareText(e.target.value)}
          className="resize-none text-sm min-h-[120px] rounded-xl border-gray-200" maxLength={500} />
        <p className="text-right text-xs text-gray-400 mt-1">{shareText.length} / 500</p>
      </StepCard>
    </Layout>
  );

  if (step === 6) return (
    <Layout step={6}>
      <StepCard stepNum={6} title="How urgent is your situation?" subtitle="We'll prioritize your support based on your need." onBack={back} onContinue={next} continueDisabled={!urgency}>
        <div className="space-y-3">
          {URGENCY.map(u => (
            <button key={u.label} onClick={() => setUrgency(u.label)}
              className={`w-full px-4 py-3 rounded-xl border-2 text-left text-sm font-medium transition-all ${urgency === u.label ? u.color + " border-current" : "border-gray-200 text-gray-700 hover:border-gray-300"}`}>
              {urgency === u.label && <Check className="inline w-4 h-4 mr-2 -mt-0.5" />}{u.label}
            </button>
          ))}
        </div>
      </StepCard>
    </Layout>
  );

  const selectedTherapistIsBusy = selectedTherapist && busyTherapistIds.includes(selectedTherapist.user_id);

  if (step === 7) return (
    <Layout step={7}>
      <StepCard stepNum={7} title="Choose a therapist" subtitle={matchedTherapists.length < allTherapists.length ? "Showing therapists matching your language preference." : "Showing all available therapists."}
        onBack={back} onContinue={next} continueDisabled={!selectedTherapist} continueLabel="Confirm Therapist">
        {loadingTherapists ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : matchedTherapists.length === 0 ? (
          <p className="text-sm text-center text-gray-500 py-6">No therapists available right now. Please try again later.</p>
        ) : (
          <>
            {selectedTherapistIsBusy && (
              <div className="mb-2.5 p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-800">
                ⚠️ This therapist is currently busy with another session. Please wait 15 minutes or choose another therapist.
              </div>
            )}
            <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
              {matchedTherapists.map(t => (
                <TherapistCard key={t.id} therapist={t} selected={selectedTherapist?.id === t.id} onSelect={setSelectedTherapist} isBusy={busyTherapistIds.includes(t.user_id)} />
              ))}
            </div>
          </>
        )}
      </StepCard>
    </Layout>
  );

  if (step === 8) return (
    <Layout step={8}>
      <div className="max-w-sm mx-auto w-full">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-primary px-5 py-3 flex items-center gap-3">
            <img src={logo} alt="BreathingPlace" className="h-7 w-auto object-contain brightness-0 invert" />
            <div>
              <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Step 8 · Session Info</p>
              <p className="text-white font-display font-bold text-sm">Free Emotional Support</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {errorMsg && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">{errorMsg}</div>}

            {/* Selected therapist info */}
            {selectedTherapist && (
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                  {selectedTherapist.profile_photo_url
                    ? <img src={selectedTherapist.profile_photo_url} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><User className="w-5 h-5 text-gray-400" /></div>}
                </div>
                <div>
                  <p className="text-sm font-bold text-primary">{selectedTherapist.full_name}</p>
                  <p className="text-[11px] text-primary/70">{selectedTherapist.qualification}</p>
                </div>
              </div>
            )}

            {/* Timing info */}
            <div className="border-2 border-primary rounded-xl p-4 bg-primary/5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-primary">Free Emotional Support</p>
                <span className="text-lg font-extrabold text-primary">₹0</span>
              </div>
              <ul className="space-y-1.5 text-xs text-gray-600">
                <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-primary flex-shrink-0" />First time: <strong>{chatConfig?.free_minutes_new ?? 15} minutes free</strong></li>
                <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-primary flex-shrink-0" />Returning: <strong>{chatConfig?.free_minutes_returning ?? 10} minutes free (lifetime)</strong></li>
                <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-primary flex-shrink-0" />Text chat only · Safe & confidential</li>
              </ul>
              <div className="mt-3 pt-3 border-t border-primary/20">
                <p className="text-[11px] text-gray-500">After free time: ₹{chatConfig?.paid_amount ?? 149} for {chatConfig?.paid_duration_minutes ?? 20} more minutes (via Cashfree QR)</p>
              </div>
            </div>

            <Button className="w-full rounded-full bg-primary text-white text-sm font-semibold" onClick={handleStartChat} disabled={isProcessing}>
              {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting your session...</> : "Start Free Chat Now"}
            </Button>
          </div>
          <div className="px-5 pb-5">
            <Button variant="outline" size="sm" className="rounded-full" onClick={back}>
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}