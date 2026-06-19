import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, Heart, User, MessageCircle, Phone, Video, Star } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";

const SUPPORT_TYPES = [
  { label: "Therapist", icon: "🧠" },
  { label: "Listener", icon: "🎧" },
  { label: "Relationship Expert", icon: "💑" },
  { label: "Anxiety Support", icon: "🌿" },
  { label: "Career Guidance", icon: "🧭" },
  { label: "Emotional Healing", icon: "💚" },
];

const CONCERNS = ["Anxiety", "Depression", "Overthinking", "Breakup / Heartbreak", "Relationship Issues", "Family Problems", "Trauma", "Self-Esteem / Confidence"];

const LANGUAGES = ["English", "தமிழ் (Tamil)", "हिंदी (Hindi)", "മലയാളം (Malayalam)", "తెలుగు (Telugu)", "ಕನ್ನಡ (Kannada)", "Other"];

const THERAPIST_PREF = [
  { label: "Male Therapist", icon: "👨" },
  { label: "Female Therapist", icon: "👩" },
  { label: "No Preference", icon: "🤝" },
];

const SESSION_TYPES = [
  { label: "Chat", icon: MessageCircle },
  { label: "Voice Call", icon: Phone },
  { label: "Video Session", icon: Video },
];

const AVAILABILITY = [
  { label: "Morning", sub: "6 AM – 12 PM" },
  { label: "Afternoon", sub: "12 PM – 5 PM" },
  { label: "Evening", sub: "5 PM – 10 PM" },
  { label: "Night", sub: "10 PM – 1 AM" },
  { label: "Anytime", sub: "" },
];

const SESSION_DURATIONS = ["30 mins", "45 mins", "60 mins"];

const TOTAL_STEPS = 9;

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
        <div className="bg-primary/5 border-b border-gray-100 px-5 py-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{stepNum}</span>
          <p className="text-[10px] text-primary font-semibold uppercase tracking-wide">BreathingPlace</p>
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

function SelectOption({ label, icon, selected, onClick, sub }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left text-sm transition-all ${selected ? "border-primary bg-primary/5 font-medium text-primary" : "border-gray-200 hover:border-gray-300 text-gray-700"}`}>
      {icon && <span className="text-base flex-shrink-0">{icon}</span>}
      <span className="flex-1">
        {label}
        {sub && <span className="block text-xs text-gray-400 font-normal">{sub}</span>}
      </span>
      {selected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
    </button>
  );
}

function CheckOption({ label, selected, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left text-sm transition-all ${selected ? "border-primary bg-primary/5 text-primary" : "border-gray-100 hover:border-gray-200 text-gray-700"}`}>
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selected ? "bg-primary border-primary" : "border-gray-300"}`}>
        {selected && <Check className="w-2.5 h-2.5 text-white" />}
      </div>
      {label}
    </button>
  );
}

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-3 h-3 ${i <= Math.round(rating) ? "text-yellow-500 fill-yellow-500" : "text-gray-200 fill-gray-200"}`} />
      ))}
    </div>
  );
}

async function upgradeToCustomer(user) {
  if (!user || user.role === "customer" || user.role === "therapist" || user.role === "admin" || user.role === "super_admin") return;
  await base44.auth.updateMe({ role: "customer" });
}

export default function FindSupportFlow() {
  const navigate = useNavigate();
  const { user, checkUserAuth } = useAuth();
  const [step, setStep] = useState(1);
  const [supportType, setSupportType] = useState("");
  const [concerns, setConcerns] = useState([]);
  const [language, setLanguage] = useState("");
  const [therapistPref, setTherapistPref] = useState("");
  const [sessionType, setSessionType] = useState("");
  const [availability, setAvailability] = useState("");
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [duration, setDuration] = useState("45 mins");

  const { data: allTherapists = [] } = useQuery({
    queryKey: ["approved-therapists-find-flow"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getTherapistData", {
        action: "get_approved"
      });
      return res.data?.data || [];
    },
    enabled: step >= 7,
  });

  // Filter by language match first, fallback to all approved if no match
  const therapists = (() => {
    if (!allTherapists.length) return [];
    const langKey = language?.split(" ")[0]; // e.g. "English", "தமிழ்", "हिंदी"
    if (!langKey) return allTherapists;
    const matched = allTherapists.filter(t =>
      (t.languages || []).some(l => l.toLowerCase().includes(langKey.toLowerCase()))
    );
    return matched.length > 0 ? matched : allTherapists;
  })();

  const next = () => setStep((s) => s + 1);
  const back = () => { if (step === 1) navigate("/complete-profile"); else setStep((s) => s - 1); };

  const toggleConcern = (c) => setConcerns((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const Layout = ({ children }) => (
    <div className="min-h-screen py-10 px-4" style={{ backgroundColor: "#F0F0E0" }}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold mb-2">
            <Heart className="w-3.5 h-3.5" /> Find Support Flow
          </div>
          <p className="text-xs text-gray-500">Step {step} of {TOTAL_STEPS} — Intentional search flow</p>
        </div>
        <StepIndicator current={step} total={TOTAL_STEPS} />
        {children}
      </div>
    </div>
  );

  if (step === 1) return (
    <Layout>
      <StepCard stepNum={1} title="What type of support are you looking for?" subtitle="Select the support you want." onBack={back} onContinue={next} continueDisabled={!supportType} hideBack>
        <div className="space-y-2">
          {SUPPORT_TYPES.map((s) => <SelectOption key={s.label} label={s.label} icon={s.icon} selected={supportType === s.label} onClick={() => setSupportType(s.label)} />)}
        </div>
      </StepCard>
    </Layout>
  );

  if (step === 2) return (
    <Layout>
      <StepCard stepNum={2} title="What are you struggling with?" subtitle="You can choose more than one." onBack={back} onContinue={next} continueDisabled={concerns.length === 0}>
        <div className="space-y-1.5">
          {CONCERNS.map((c) => <CheckOption key={c} label={c} selected={concerns.includes(c)} onClick={() => toggleConcern(c)} />)}
        </div>
      </StepCard>
    </Layout>
  );

  if (step === 3) return (
    <Layout>
      <StepCard stepNum={3} title="Choose your preferred language." subtitle="You can change this later." onBack={back} onContinue={next} continueDisabled={!language}>
        <div className="space-y-2">
          {LANGUAGES.map((l) => <SelectOption key={l} label={l} selected={language === l} onClick={() => setLanguage(l)} />)}
        </div>
      </StepCard>
    </Layout>
  );

  if (step === 4) return (
    <Layout>
      <StepCard stepNum={4} title="Do you have a preference?" subtitle="You can change this later." onBack={back} onContinue={next} continueDisabled={!therapistPref}>
        <div className="space-y-2">
          {THERAPIST_PREF.map((p) => <SelectOption key={p.label} label={p.label} icon={p.icon} selected={therapistPref === p.label} onClick={() => setTherapistPref(p.label)} />)}
        </div>
      </StepCard>
    </Layout>
  );

  if (step === 5) return (
    <Layout>
      <StepCard stepNum={5} title="How would you like to take sessions?" subtitle="Premium: Chat, Voice Call, and Video Call all available." onBack={back} onContinue={next} continueDisabled={!sessionType}>
        <div className="space-y-3">
          {SESSION_TYPES.map((s) => (
            <button key={s.label} onClick={() => setSessionType(s.label)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${sessionType === s.label ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${sessionType === s.label ? "bg-primary" : "bg-gray-100"}`}>
                <s.icon className={`w-4 h-4 ${sessionType === s.label ? "text-white" : "text-gray-500"}`} />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${sessionType === s.label ? "text-primary" : "text-gray-800"}`}>{s.label}</p>
                <p className="text-xs text-gray-500">Premium · Available for all 7 days</p>
              </div>
              {sessionType === s.label && <Check className="w-4 h-4 text-primary ml-auto" />}
            </button>
          ))}
        </div>
      </StepCard>
    </Layout>
  );

  if (step === 6) return (
    <Layout>
      <StepCard stepNum={6} title="When are you usually available?" subtitle="Select your preferred time." onBack={back} onContinue={next} continueDisabled={!availability}>
        <div className="space-y-2">
          {AVAILABILITY.map((a) => <SelectOption key={a.label} label={a.label} sub={a.sub} selected={availability === a.label} onClick={() => setAvailability(a.label)} />)}
        </div>
      </StepCard>
    </Layout>
  );

  if (step === 7) return (
    <Layout>
      <StepCard stepNum={7} title="We found the best matches for you!" subtitle="Choose a therapist to continue." onBack={back} onContinue={() => { if (selectedTherapist) next(); }} continueDisabled={!selectedTherapist} continueLabel="Book Session">
        {therapists.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-500">Loading matches...</div>
        ) : (
          <div className="space-y-3">
            {therapists.slice(0, 3).map((t) => {
              const fee = t.consultation_fee ? `₹${t.consultation_fee}` : "₹299";
              return (
                <button key={t.id} onClick={() => setSelectedTherapist(t)} className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${selectedTherapist?.id === t.id ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}`}>
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                    {t.profile_photo_url ? <img src={t.profile_photo_url} alt={t.full_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><User className="w-5 h-5 text-gray-400" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{t.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{t.qualification || "Therapist"}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <StarRating rating={4.5} />
                      <span className="text-[10px] text-gray-500">4.5</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{(t.languages || []).join(", ")} · {(t.specializations || []).slice(0, 2).join(", ")}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">Starts from</p>
                    <p className="text-sm font-bold text-gray-900">{fee}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </StepCard>
    </Layout>
  );

  if (step === 8) return (
    <Layout>
      <StepCard stepNum={8} title="Choose Therapist" subtitle="Review your match and confirm." onBack={back} onContinue={next} continueLabel="Book Session" continueDisabled={!selectedTherapist}>
        {selectedTherapist && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
              <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                {selectedTherapist.profile_photo_url ? <img src={selectedTherapist.profile_photo_url} alt={selectedTherapist.full_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><User className="w-6 h-6 text-gray-400" /></div>}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{selectedTherapist.full_name}</p>
                <div className="flex items-center gap-1"><StarRating rating={4.9} /><span className="text-xs text-gray-500">4.9 (786)</span></div>
                <p className="text-xs text-gray-500">{selectedTherapist.experience_years || 5} Years exp</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">{(selectedTherapist.languages || []).join(", ")} · {(selectedTherapist.specializations || []).join(", ")}</p>
            <Button variant="outline" size="sm" className="w-full rounded-lg text-xs border-primary text-primary font-semibold" onClick={() => {
              const slug = selectedTherapist.slug || selectedTherapist.full_name?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || selectedTherapist.id;
              navigate(`/therapist/${slug}?id=${selectedTherapist.id}`);
            }}>View Full Profile</Button>
          </div>
        )}
      </StepCard>
    </Layout>
  );

  if (step === 9) return (
    <Layout>
      <div className="max-w-sm mx-auto w-full">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-primary px-5 py-3">
            <p className="text-white text-xs font-semibold uppercase tracking-wide">9 · Book & Payment</p>
            <p className="text-white font-display font-bold text-base mt-0.5">Book Your Session</p>
            <p className="text-white/70 text-xs">Choose session details and complete your payment.</p>
          </div>
          <div className="p-5 space-y-4">
            {selectedTherapist && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                  {selectedTherapist.profile_photo_url ? <img src={selectedTherapist.profile_photo_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><User className="w-5 h-5 text-gray-400" /></div>}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{selectedTherapist.full_name}</p>
                  <p className="text-xs text-gray-500">{sessionType} · {(selectedTherapist.languages || []).join(", ")}</p>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">Select Duration</p>
              <div className="flex gap-2">
                {SESSION_DURATIONS.map((d) => (
                  <button key={d} onClick={() => setDuration(d)} className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all ${duration === d ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-gray-600"}`}>{d}</button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">Session Type</p>
              <div className="flex gap-2">
                {["Chat", "Voice Call", "Video Call"].map((t) => (
                  <button key={t} onClick={() => setSessionType(t)} className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-all ${sessionType === t ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-gray-600"}`}>{t}</button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-semibold text-gray-800">Session Fee</p>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Starts from</p>
                  <p className="text-lg font-extrabold text-gray-900">₹{selectedTherapist?.final_customer_price || selectedTherapist?.consultation_fee || 499}</p>
                </div>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Total Amount</span>
                <span className="font-bold text-gray-800">₹{selectedTherapist?.final_customer_price || selectedTherapist?.consultation_fee || 499}</span>
              </div>
            </div>

            <div>
              <p className="text-[10px] text-gray-400 mb-2 font-medium">Payment Methods</p>
              <div className="flex gap-1.5 flex-wrap">
                {["UPI", "GPay", "PhonePe", "Razorpay", "Cash", "Net Banking"].map((p) => (
                  <span key={p} className="px-2 py-0.5 rounded bg-gray-100 text-[10px] text-gray-600 font-medium">{p}</span>
                ))}
              </div>
            </div>

            <Button
              className="w-full rounded-full bg-primary text-white font-bold text-sm"
              onClick={async () => {
                if (!user) {
                  sessionStorage.setItem("pending_intent", "/find-support");
                  navigate("/login");
                  return;
                }
                await upgradeToCustomer(user);
                await checkUserAuth();
                // Save customer profile data from this flow
                const existingProfiles = await base44.entities.CustomerProfile.filter({ user_id: user.id });
                if (existingProfiles.length === 0) {
                  await base44.entities.CustomerProfile.create({
                    user_id: user.id,
                    full_name: user.user_metadata?.full_name || user.email,
                    preferred_language: language,
                    preferred_therapist_gender: therapistPref === "Male Therapist" ? "male" : therapistPref === "Female Therapist" ? "female" : "no_preference",
                    preferred_session_time: availability === "Morning" ? "morning" : availability === "Afternoon" ? "afternoon" : availability === "Evening" ? "evening" : "flexible",
                    main_concerns: concerns,
                    assigned_therapist_id: selectedTherapist?.user_id || "",
                    profile_complete: false,
                  });
                }
                if (selectedTherapist) {
                  navigate(`/book?therapist=${selectedTherapist.id}&type=${encodeURIComponent(sessionType)}`);
                } else {
                  navigate("/sessions");
                }
              }}
            >
              Confirm Session
            </Button>
            <p className="text-[10px] text-gray-400 text-center flex items-center justify-center gap-1">🔒 Your payment is 100% secure and safe.</p>
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