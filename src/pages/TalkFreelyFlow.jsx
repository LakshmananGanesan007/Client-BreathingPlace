import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, ArrowLeft, Heart, MessageCircle, Phone, Video, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";

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

const LANGUAGES = ["English", "Spanish", "French", "German", "Chinese", "Arabic", "Russian", "Portuguese", "Japanese", "தமிழ் (Tamil)", "हिंदी (Hindi)", "മലയാളം (Malayalam)", "తెలుగు (Telugu)", "ಕನ್ನಡ (Kannada)", "Other Language"];

const COMM_MODES = [
  { label: "Chat Only", sub: "Text chat with a listener", icon: MessageCircle },
  { label: "Voice Call", sub: "Talk over a voice call", icon: Phone },
  { label: "Video Session", sub: "Talk face-to-face", icon: Video },
];

const URGENCY = [
  { label: "I'm okay, just need support", color: "bg-green-50 border-green-300 text-green-800" },
  { label: "Feeling emotionally overwhelmed", color: "bg-yellow-50 border-yellow-300 text-yellow-800" },
  { label: "Need urgent emotional help", color: "bg-red-50 border-red-300 text-red-800" },
];

const TOTAL_STEPS = 8;

function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full flex-1 transition-all ${i < current ? "bg-primary" : i === current - 1 ? "bg-primary" : "bg-gray-200"}`}
        />
      ))}
    </div>
  );
}

function StepCard({ stepNum, title, subtitle, children, onBack, onContinue, continueDisabled, continueLabel = "Continue", hideBack }) {
  return (
    <div className="max-w-sm mx-auto w-full">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-primary/5 border-b border-gray-100 px-5 py-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{stepNum}</span>
          <div>
            <p className="text-[10px] text-primary font-semibold uppercase tracking-wide">BreathingPlace</p>
          </div>
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
          <Button
            className="flex-1 rounded-full bg-primary text-white font-semibold text-sm"
            size="sm"
            onClick={onContinue}
            disabled={continueDisabled}
          >
            {continueLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SelectOption({ label, icon, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left text-sm transition-all ${selected ? "border-primary bg-primary/5 font-medium text-primary" : "border-gray-200 hover:border-gray-300 text-gray-700"}`}
    >
      {icon && <span className="text-base flex-shrink-0">{icon}</span>}
      <span className="flex-1">{label}</span>
      {selected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
    </button>
  );
}

async function upgradeToCustomer(user) {
  if (!user || user.role === "customer" || user.role === "therapist" || user.role === "admin" || user.role === "super_admin") return;
  await supabase.from('user_profiles').update({ selected_role: 'customer' }).eq('user_id', user.id);
}

export default function TalkFreelyFlow() {
  const navigate = useNavigate();
  const { user, checkUserAuth } = useAuth();
  const [step, setStep] = useState(1);
  const [mood, setMood] = useState("");
  const [supportType, setSupportType] = useState("");
  const [language, setLanguage] = useState("");
  const [commMode, setCommMode] = useState("");
  const [shareText, setShareText] = useState("");
  const [urgency, setUrgency] = useState("");
  const [hasUsedFreeSupport, setHasUsedFreeSupport] = useState(false);
  const [isProcessingFree, setIsProcessingFree] = useState(false);
  const [isProcessingPro, setIsProcessingPro] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (user) {
      const checkUsage = async () => {
        try {
          const { data: profiles } = await supabase.from('customer_profiles').select('free_support_used').eq('user_id', user.id);
          const { data: sessions } = await supabase.from('support_sessions').select('id').eq('customer_id', user.id);
          
          const profileUsed = profiles?.length > 0 && profiles[0].free_support_used;
          const hasSession = sessions?.length > 0;
          if (profileUsed || hasSession) {
            setHasUsedFreeSupport(true);
          }
        } catch (e) {
          console.warn("Failed to check free support usage", e);
        }
      };
      checkUsage();
    }
  }, [user]);

  if (hasUsedFreeSupport) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#F0F0E0" }}>
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm text-center border border-gray-200">
          <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6 text-sm">
            Free Talk Freely support has already been used for this account. To continue receiving support, please use Find Support to connect with a therapist.
          </p>
          <Button onClick={() => navigate("/dashboard")} className="w-full rounded-full bg-primary hover:bg-primary/90">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const next = () => setStep((s) => s + 1);
  const back = () => { if (step === 1) navigate("/complete-profile"); else setStep((s) => s - 1); };

  if (step === 1) return (
    <Layout step={1} title="Talk Freely Flow">
      <StepCard stepNum={1} title="How are you feeling today?" subtitle="There's no right or wrong feeling. We're here for you." onBack={back} onContinue={next} continueDisabled={!mood} hideBack>
        <div className="space-y-2">
          {MOODS.map((m) => <SelectOption key={m.label} label={m.label} selected={mood === m.label} onClick={() => setMood(m.label)} />)}
        </div>
      </StepCard>
    </Layout>
  );

  if (step === 2) return (
    <Layout step={2} title="Talk Freely Flow">
      <StepCard stepNum={2} title="What kind of support do you need?" subtitle="Choose what feels right for you." onBack={back} onContinue={next} continueDisabled={!supportType}>
        <div className="space-y-2">
          {SUPPORT_TYPES.map((s) => <SelectOption key={s.label} label={s.label} icon={s.icon} selected={supportType === s.label} onClick={() => setSupportType(s.label)} />)}
        </div>
      </StepCard>
    </Layout>
  );

  if (step === 3) return (
    <Layout step={3} title="Talk Freely Flow">
      <StepCard stepNum={3} title="Which language feels most comfortable for you?" subtitle="You can change this later." onBack={back} onContinue={next} continueDisabled={!language}>
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {LANGUAGES.map((l) => <SelectOption key={l} label={l} selected={language === l || (language !== "" && !LANGUAGES.includes(language) && l === "Other Language")} onClick={() => setLanguage(l === "Other Language" ? " " : l)} />)}
          {(language === " " || (language !== "" && !LANGUAGES.includes(language))) && (
            <div className="mt-4">
              <label className="text-xs font-semibold text-gray-700 mb-1 block">Enter Language(s) separated by commas</label>
              <Textarea 
                placeholder="e.g. Tamil, Hindi, English, French" 
                value={language === " " ? "" : language}
                onChange={(e) => setLanguage(e.target.value)}
                className="resize-none text-sm min-h-[80px]"
              />
            </div>
          )}
        </div>
      </StepCard>
    </Layout>
  );

  if (step === 4) return (
    <Layout step={4} title="Talk Freely Flow">
      <StepCard stepNum={4} title="How would you like to talk?" subtitle="Talk Freely is chat-only. Video & Audio are available in Find Support Premium." onBack={back} onContinue={next} continueDisabled={!commMode}>
        <div className="space-y-3">
          {COMM_MODES.map((c) => {
            const isDisabled = c.label !== "Chat Only";
            return (
              <button
                key={c.label}
                onClick={() => !isDisabled && setCommMode(c.label)}
                disabled={isDisabled}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${isDisabled ? "opacity-50 cursor-not-allowed border-gray-100 bg-gray-50" : commMode === c.label ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${commMode === c.label && !isDisabled ? "bg-primary" : "bg-gray-100"}`}>
                  <c.icon className={`w-4 h-4 ${commMode === c.label && !isDisabled ? "text-white" : "text-gray-500"}`} />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${commMode === c.label && !isDisabled ? "text-primary" : "text-gray-800"}`}>{c.label}</p>
                  <p className="text-xs text-gray-500">{isDisabled ? "Available in Find Support Premium" : c.sub}</p>
                </div>
                {commMode === c.label && !isDisabled && <Check className="w-4 h-4 text-primary ml-auto" />}
                {isDisabled && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Premium</span>}
              </button>
            );
          })}
        </div>
      </StepCard>
    </Layout>
  );

  if (step === 5) return (
    <Layout step={5} title="Talk Freely Flow">
      <StepCard stepNum={5} title="Want to share what's on your mind?" subtitle="Share only if you feel comfortable. You can skip this." onBack={back} onContinue={next} continueDisabled={false} continueLabel={shareText ? "Continue" : "Skip"}>
        <Textarea
          placeholder="Write here..."
          value={shareText}
          onChange={(e) => setShareText(e.target.value)}
          className="resize-none text-sm min-h-[120px] rounded-xl border-gray-200"
          maxLength={500}
        />
        <p className="text-right text-xs text-gray-400 mt-1">{shareText.length} / 500 characters</p>
      </StepCard>
    </Layout>
  );

  if (step === 6) return (
    <Layout step={6} title="Talk Freely Flow">
      <StepCard stepNum={6} title="How urgent is your situation?" subtitle="We'll prioritize your support based on your need." onBack={back} onContinue={next} continueDisabled={!urgency}>
        <div className="space-y-3">
          {URGENCY.map((u) => (
            <button
              key={u.label}
              onClick={() => setUrgency(u.label)}
              className={`w-full px-4 py-3 rounded-xl border-2 text-left text-sm font-medium transition-all ${urgency === u.label ? u.color + " border-current" : "border-gray-200 text-gray-700 hover:border-gray-300"}`}
            >
              {urgency === u.label && <Check className="inline w-4 h-4 mr-2 -mt-0.5" />}{u.label}
            </button>
          ))}
        </div>
      </StepCard>
    </Layout>
  );

  if (step === 7) return (
    <Layout step={7} title="Talk Freely Flow">
      <StepCard stepNum={7} title="Finding someone who understands you..." subtitle="Please wait while we match you with a suitable supporter." onBack={back} onContinue={next} continueLabel="Continue">
        <div className="py-4 space-y-3">
          {["Reviewing your needs", "Finding the right match", "Preparing your safe space"].map((item, i) => (
            <div key={item} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Check className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-sm text-gray-700">{item}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center mt-2">
          <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&q=80" alt="matching" className="w-40 h-32 object-cover rounded-xl opacity-80" />
        </div>
      </StepCard>
    </Layout>
  );

  const handleFreeSupport = async () => {
    if (!user) {
      sessionStorage.setItem("pending_intent", "/talk-freely");
      navigate("/login");
      return;
    }
    setIsProcessingFree(true);
    setErrorMsg("");
    try {
      upgradeToCustomer(user).catch(e => console.warn("Failed to upgrade role", e));
      
      const { data: profiles } = await supabase.from('customer_profiles').select('*').eq('user_id', user.id);
      if (!profiles || profiles.length === 0) {
        await supabase.from('customer_profiles').insert({
          user_id: user.id,
          full_name: user.full_name || user.email,
          preferred_language: language,
          main_concerns: supportType ? [supportType] : [],
          profile_complete: false,
        }).catch(e => console.warn("Profile creation failed", e));
      }
      
      // Directly insert into the support_sessions table instead of Base44
      const { data: newSession, error: sessionError } = await supabase.from('support_sessions').insert({
        customer_id: user.id,
        customer_name: user.full_name || user.email?.split("@")[0],
        status: 'pending',
        session_type: supportType || "General",
      }).select().single();

      if (sessionError) throw sessionError;

      // Ensure the first system message gets attached safely
      await supabase.from('support_messages').insert({
        session_id: newSession.id,
        sender_id: user.id,
        sender_type: 'customer',
        message: `Chat Details: Mood: ${mood} | Language: ${language} | Urgency: ${urgency}\nCustomer Note: ${shareText || "None"}`
      });

      navigate(`/free-chat?session=${newSession.id}`);
    } catch (error) {
      console.error("Free support error:", error);
      setErrorMsg("Something went wrong creating your session. Please try again.");
    } finally {
      setIsProcessingFree(false);
    }
  };

  const handleProfessionalSupport = async () => {
    if (!user) {
      sessionStorage.setItem("pending_intent", "/talk-freely");
      navigate("/login");
      return;
    }
    setIsProcessingPro(true);
    setErrorMsg("");
    try {
      try { await upgradeToCustomer(user); } catch (e) { console.warn("Failed to upgrade role", e); }
      await checkUserAuth();
      navigate("/find-support");
    } catch (error) {
      console.error("Professional support error:", error);
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setIsProcessingPro(false);
    }
  };

  if (step === 8) return (
    <Layout step={8} title="Talk Freely Flow">
      <div className="max-w-sm mx-auto w-full">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-primary px-5 py-3">
            <p className="text-white text-xs font-semibold uppercase tracking-wide">8 · Session Choice & Payment</p>
            <p className="text-white font-display font-bold text-base mt-0.5">Choose what feels right for you</p>
          </div>
          <div className="p-5 space-y-3">
            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-2 border border-red-200">
                {errorMsg}
              </div>
            )}
            {!hasUsedFreeSupport ? (
              <div className="border-2 border-primary rounded-xl p-4 bg-primary/5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-primary">Free Emotional Support <span className="text-xs font-normal text-gray-500">(Limited)</span></p>
                  <span className="text-lg font-extrabold text-primary">₹0</span>
                </div>
                <ul className="space-y-1 mb-3 text-xs text-gray-600">
                  {["10 minute listener support", "Text chat only", "Safe & confidential"].map((i) => (
                    <li key={i} className="flex items-center gap-1.5"><Check className="w-3 h-3 text-primary" /> {i}</li>
                  ))}
                </ul>
                <Button className="w-full rounded-full bg-primary text-white text-sm font-semibold" size="sm" onClick={handleFreeSupport} disabled={isProcessingFree || isProcessingPro}>
                  {isProcessingFree ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Please wait...</> : (user ? "Continue Free" : "Sign Up & Continue Free")}
                </Button>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 text-center">
                <Heart className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">Your complimentary emotional support session has already been used.</p>
                <p className="text-xs text-gray-500 mt-1">Please proceed with a Professional Session.</p>
              </div>
            )}

            <div className="text-center text-xs text-gray-400 font-medium">OR</div>

            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-gray-800">Professional Session</p>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400">Starts from</p>
                  <p className="text-base font-extrabold text-gray-900">₹299</p>
                </div>
              </div>
              <ul className="space-y-1 mb-3 text-xs text-gray-600">
                {["Therapist / Expert support", "Chat / Voice / Video", "Personalized care"].map((i) => (
                  <li key={i} className="flex items-center gap-1.5"><Check className="w-3 h-3 text-primary" /> {i}</li>
                ))}
              </ul>
              <Button className="w-full rounded-full bg-gray-900 text-white text-sm font-semibold mb-2" size="sm" onClick={handleProfessionalSupport} disabled={isProcessingFree || isProcessingPro}>
                {isProcessingPro ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Please wait...</> : (user ? "Find a Therapist" : "Sign Up & Find Therapist")}
              </Button>
            </div>

            <div className="pt-1">
              <p className="text-[10px] text-gray-400 mb-2 font-medium">Payment Methods</p>
              <div className="flex gap-2 flex-wrap">
                {["UPI", "GPay", "PhonePe", "Paytm", "Cash", "Net Banking"].map((p) => (
                  <span key={p} className="px-2 py-0.5 rounded bg-gray-100 text-[10px] text-gray-600 font-medium">{p}</span>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">🔒 Your payment is 100% secure and safe.</p>
            </div>
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

function Layout({ children, step, title }) {
  return (
    <div className="min-h-screen py-10 px-4" style={{ backgroundColor: "#F0F0E0" }}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
            <Heart className="w-3.5 h-3.5" /> Talk Freely Flow
          </div>
          <p className="text-xs text-gray-500">Step {step} of {TOTAL_STEPS} — Emotional-first flow</p>
        </div>
        <StepIndicator current={step} total={TOTAL_STEPS} />
        {children}
      </div>
    </div>
  );
}