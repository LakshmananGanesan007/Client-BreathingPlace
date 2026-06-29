import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, ArrowLeft, Heart, User, Video, Star, ShieldCheck, Globe, Clock, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const SUPPORT_TYPES = [
  { label: "Professional Counsellor", icon: "🧠" },
  { label: "Relationship Support", icon: "💑" },
  { label: "Career & Life Guidance", icon: "🧭" },
  { label: "Emotional Support", icon: "💚" },
  { label: "Anxiety & Stress Support", icon: "🌿" },
];

const CONCERNS = [
  "Anxiety & Panic Attacks",
  "Depression & Low Mood",
  "Relationship Conflicts",
  "Work-Life Stress",
  "Grief & Loss",
  "Trauma & Past Wounds",
  "Self-Esteem & Confidence",
  "Family Pressure",
  "Breakup / Heartbreak",
  "Career Confusion",
  "Loneliness & Isolation",
  "Others",
];

const INTERNATIONAL_LANGUAGES = [
  "English", "Hindi (हिंदी)", "Tamil (தமிழ்)", "Telugu (తెలుగు)", "Malayalam (മലയാളം)",
  "Kannada (ಕನ್ನಡ)", "Bengali (বাংলা)", "Marathi (मराठी)", "Gujarati (ગુજરાતી)",
  "Punjabi (ਪੰਜਾਬੀ)", "Urdu (اردو)", "Odia (ଓଡ଼ିଆ)", "Assamese (অসমীয়া)",
  "Spanish", "French", "German", "Portuguese", "Italian", "Dutch", "Russian",
  "Arabic (عربي)", "Chinese (中文)", "Japanese (日本語)", "Korean (한국어)",
  "Turkish", "Persian (فارسی)", "Swahili", "Other",
];

const THERAPIST_PREF = [
  { label: "Male Therapist", icon: "👨" },
  { label: "Female Therapist", icon: "👩" },
  { label: "No Preference", icon: "🤝" },
];

const AVAILABILITY = [
  { label: "Morning", sub: "6 AM – 12 PM" },
  { label: "Afternoon", sub: "12 PM – 5 PM" },
  { label: "Evening", sub: "5 PM – 10 PM" },
  { label: "Night", sub: "10 PM – 1 AM" },
  { label: "Anytime", sub: "Flexible Scheduling" },
];

function LanguageSelector({ selected, onChange }) {
  const [search, setSearch] = useState("");
  const filtered = INTERNATIONAL_LANGUAGES.filter(l => l.toLowerCase().includes(search.toLowerCase()));

  const toggle = (lang) => {
    if (selected.includes(lang)) {
      onChange(selected.filter(l => l !== lang));
    } else if (selected.length < 3) {
      onChange([...selected, lang]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 flex-wrap min-h-[32px]">
        {selected.map(l => (
          <span key={l} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
            {l}
            <button onClick={() => onChange(selected.filter(x => x !== l))}><X className="w-3 h-3" /></button>
          </span>
        ))}
        {selected.length === 0 && <span className="text-xs text-slate-400">Select at least 2 languages</span>}
      </div>
      <p className="text-[11px] text-slate-500">
        {selected.length === 0 ? "1st language required" : selected.length === 1 ? "2nd language required" : selected.length === 2 ? "3rd language optional (max 3)" : "Maximum 3 languages selected"}
      </p>
      <div className="relative">
        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          type="text" placeholder="Search language..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
        {filtered.map(l => {
          const isSelected = selected.includes(l);
          const isDisabled = !isSelected && selected.length >= 3;
          return (
            <button key={l} onClick={() => !isDisabled && toggle(l)} disabled={isDisabled}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${isSelected ? "border-blue-500 bg-blue-50 text-blue-900 font-semibold" : isDisabled ? "border-gray-100 text-gray-300 cursor-not-allowed" : "border-slate-200 text-slate-700 hover:border-blue-300"}`}>
              <span>{l}</span>
              {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const SESSION_DURATIONS = ["45 mins"]; // Enforced Premium Rule

const TOTAL_STEPS = 9;

function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-1.5 rounded-full flex-1 transition-all ${i < current ? "bg-blue-600" : "bg-blue-100"}`} />
      ))}
    </div>
  );
}

function StepCard({ stepNum, title, subtitle, children, onBack, onContinue, continueDisabled, continueLabel = "Continue", hideBack }) {
  return (
    <div className="max-w-md mx-auto w-full">
      <div className="bg-white rounded-2xl border border-blue-100 shadow-xl shadow-blue-900/5 overflow-hidden">
        <div className="bg-blue-50/80 border-b border-blue-100 px-6 py-4 flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-sm">{stepNum}</span>
          <p className="text-[11px] text-blue-800 font-bold uppercase tracking-widest flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Premium Support
          </p>
        </div>
        <div className="px-6 pt-6 pb-6">
          <h2 className="font-display text-xl font-bold text-slate-900 leading-snug mb-1">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 mb-6">{subtitle}</p>}
          <div className="mt-4">{children}</div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          {!hideBack && (
            <Button variant="outline" className="flex-shrink-0 rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <Button className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-600/20" onClick={onContinue} disabled={continueDisabled}>
            {continueLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SelectOption({ label, icon, selected, onClick, sub }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left text-sm transition-all duration-200 ${selected ? "border-blue-500 bg-blue-50 font-semibold text-blue-900 shadow-sm" : "border-slate-200 hover:border-blue-300 text-slate-700 bg-white hover:bg-slate-50"}`}>
      {icon && <span className="text-xl flex-shrink-0">{icon}</span>}
      <span className="flex-1">
        {label}
        {sub && <span className={`block text-xs mt-0.5 ${selected ? "text-blue-600 font-medium" : "text-slate-400 font-normal"}`}>{sub}</span>}
      </span>
      {selected && <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />}
    </button>
  );
}

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}`} />
      ))}
    </div>
  );
}

async function upgradeToCustomer(user) {
  if (!user || user.role === "customer" || user.role === "therapist" || user.role === "admin" || user.role === "super_admin") return;
  await supabase.from("user_profiles").update({ selected_role: "customer" }).eq("user_id", user.id);
}

export default function FindSupportFlow() {
  const navigate = useNavigate();
  const { user, userProfile, isLoadingAuth, checkUserAuth } = useAuth();

  // Block therapists and admins from customer-only flow
  useEffect(() => {
    if (isLoadingAuth) return;
    if (!user) return;
    const role = userProfile?.selected_role;
    const metaRole = user?.user_metadata?.role || "";
    if (role === "therapist") { navigate("/therapist", { replace: true }); return; }
    if (role === "super_admin" || metaRole === "super_admin" || metaRole === "admin") {
      navigate("/admin", { replace: true });
    }
  }, [user, userProfile, isLoadingAuth, navigate]);

  const [step, setStep] = useState(1);
  const [supportType, setSupportType] = useState("");
  const [concerns, setConcerns] = useState([]);
  const [otherConcern, setOtherConcern] = useState("");
  const [languages, setLanguages] = useState([]);
  const [therapistPref, setTherapistPref] = useState("");
  const [sessionType] = useState("Video Session");
  const [availability, setAvailability] = useState("");
  const [selectedTherapist, setSelectedTherapist] = useState(null);

  // Fetch customer profile to use for country-based matching
  const { data: customerProfile } = useQuery({
    queryKey: ["customer-profile-for-matching", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("customer_profiles").select("country").eq("user_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id && step >= 7,
  });

  const { data: allTherapists = [] } = useQuery({
    queryKey: ["approved-therapists-find-flow"],
    queryFn: async () => {
      const { data } = await supabase.from("therapist_profiles").select("*").eq("approval_status", "approved");
      return data || [];
    },
    enabled: step >= 7,
  });

  const { data: reviewsMap = {} } = useQuery({
    queryKey: ["therapist-ratings-find-flow", allTherapists.map(t => t.user_id).join(",")],
    queryFn: async () => {
      if (!allTherapists.length) return {};
      const userIds = allTherapists.map(t => t.user_id).filter(Boolean);
      const { data } = await supabase.from("session_reviews").select("therapist_id,rating").in("therapist_id", userIds);
      const map = {};
      (data || []).forEach(r => {
        if (!map[r.therapist_id]) map[r.therapist_id] = [];
        map[r.therapist_id].push(r.rating);
      });
      return map;
    },
    enabled: allTherapists.length > 0,
  });

  // Priority Matching Logic: Language > Country > Specialization > Availability > Status
  const therapists = (() => {
    if (!allTherapists.length) return [];

    const langKeys = languages.map(l => l.split(" ")[0].toLowerCase());
    const customerCountry = customerProfile?.country?.toLowerCase();

    const score = (t) => {
      let s = 0;
      const matchLang = langKeys.length === 0 || langKeys.some(key => (t.languages || []).some(l => l.toLowerCase().includes(key)));
      if (matchLang) s += 40;
      if (customerCountry && t.country?.toLowerCase() === customerCountry) s += 30;
      const matchSpec = concerns.length === 0 || concerns.some(c => (t.specializations || []).includes(c));
      if (matchSpec) s += 20;
      const matchAvail = !availability || availability === "Anytime" || (t.available_times || []).includes(availability);
      if (matchAvail) s += 10;
      if (t.approval_status === "approved") s += 5;
      return s;
    };

    const matched = allTherapists.filter(t => {
      if (!langKeys.length) return true;
      return langKeys.some(key => (t.languages || []).some(l => l.toLowerCase().includes(key)));
    });

    const pool = matched.length > 0 ? matched : allTherapists;
    return [...pool].sort((a, b) => score(b) - score(a));
  })();

  const next = () => setStep((s) => s + 1);
  const back = () => { if (step === 1) navigate("/complete-profile"); else setStep((s) => s - 1); };

  const toggleConcern = (c) => {
    if (c === "Others") {
      setConcerns(prev => prev.includes("Others") ? prev.filter(x => x !== "Others") : [...prev, "Others"]);
      return;
    }
    setConcerns(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  const Layout = ({ children }) => (
    <div className="min-h-screen py-12 px-4 bg-slate-50">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold tracking-wide mb-3 shadow-sm border border-blue-200">
            <Heart className="w-3.5 h-3.5 fill-blue-800" /> Premium Matching
          </div>
          <p className="text-sm font-medium text-slate-500">Step {step} of {TOTAL_STEPS}</p>
        </div>
        <StepIndicator current={step} total={TOTAL_STEPS} />
        {children}
      </div>
    </div>
  );

  if (step === 1) return (
    <Layout>
      <StepCard stepNum={1} title="What type of support are you looking for?" subtitle="Select the professional support you need." onBack={back} onContinue={next} continueDisabled={!supportType} hideBack>
        <div className="space-y-3">
          {SUPPORT_TYPES.map((s) => <SelectOption key={s.label} label={s.label} icon={s.icon} selected={supportType === s.label} onClick={() => setSupportType(s.label)} />)}
        </div>
      </StepCard>
    </Layout>
  );

  if (step === 2) return (
    <Layout>
      <StepCard stepNum={2} title="What have you been going through recently?" subtitle="Select all that apply." onBack={back} onContinue={next} continueDisabled={concerns.length === 0}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {CONCERNS.map((c) => (
            <button key={c} onClick={() => toggleConcern(c)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border text-left text-sm transition-all duration-200 ${concerns.includes(c) ? "border-blue-500 bg-blue-50 text-blue-900 font-semibold" : "border-slate-200 text-slate-700 bg-white"}`}>
              <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border ${concerns.includes(c) ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
                {concerns.includes(c) && <Check className="w-3.5 h-3.5 text-white" />}
              </div>
              {c}
            </button>
          ))}
        </div>
        {concerns.includes("Others") && (
          <div className="mt-3">
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Describe your concern</label>
            <Textarea placeholder="Tell us what you're going through..." value={otherConcern} onChange={e => setOtherConcern(e.target.value)}
              className="resize-none text-sm min-h-[80px] rounded-xl border-slate-200" maxLength={300} />
          </div>
        )}
      </StepCard>
    </Layout>
  );

  if (step === 3) return (
    <Layout>
      <StepCard stepNum={3} title="Preferred Languages" subtitle="Select 2 languages (required). A 3rd is optional." onBack={back} onContinue={next} continueDisabled={languages.length < 2}>
        <LanguageSelector selected={languages} onChange={setLanguages} />
      </StepCard>
    </Layout>
  );

  if (step === 4) return (
    <Layout>
      <StepCard stepNum={4} title="Therapist Preference" subtitle="Who do you feel most comfortable with?" onBack={back} onContinue={next} continueDisabled={!therapistPref}>
        <div className="space-y-3">
          {THERAPIST_PREF.map((p) => <SelectOption key={p.label} label={p.label} icon={p.icon} selected={therapistPref === p.label} onClick={() => setTherapistPref(p.label)} />)}
        </div>
      </StepCard>
    </Layout>
  );

  if (step === 5) return (
    <Layout>
      <StepCard stepNum={5} title="Session Medium" subtitle="Premium sessions are conducted via secure video call." onBack={back} onContinue={next} continueDisabled={false}>
        <div className="space-y-3">
          <div className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border border-blue-500 bg-blue-50 shadow-sm">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-600">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-base font-bold text-blue-900">Video Session</p>
              <p className="text-xs text-blue-600 mt-0.5">45–50 minutes · Secure & Encrypted</p>
            </div>
            <Check className="w-5 h-5 text-blue-600 ml-auto" />
          </div>
          <p className="text-xs text-slate-500 text-center">Premium Find Support sessions are video-only for the best therapeutic experience.</p>
        </div>
      </StepCard>
    </Layout>
  );

  if (step === 6) return (
    <Layout>
      <StepCard stepNum={6} title="Availability" subtitle="When do you usually prefer sessions?" onBack={back} onContinue={next} continueDisabled={!availability}>
        <div className="space-y-3">
          {AVAILABILITY.map((a) => <SelectOption key={a.label} label={a.label} sub={a.sub} selected={availability === a.label} onClick={() => setAvailability(a.label)} />)}
        </div>
      </StepCard>
    </Layout>
  );

  if (step === 7) return (
    <Layout>
      <StepCard stepNum={7} title="Your Best Matches" subtitle="We found professionals matching your exact criteria." onBack={back} onContinue={() => { if (selectedTherapist) next(); }} continueDisabled={!selectedTherapist} continueLabel="Proceed with Selected">
        {therapists.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-slate-500 font-medium">Curating your matches...</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            {therapists.map((t) => {
              const finalPrice = t.final_customer_price || t.video_price || 499;

              return (
                <button key={t.id} onClick={() => setSelectedTherapist(t)} className={`w-full flex items-start gap-4 p-4 rounded-2xl border text-left transition-all duration-200 ${selectedTherapist?.id === t.id ? "border-blue-500 bg-blue-50 shadow-md ring-1 ring-blue-500/20" : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm"}`}>
                  <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-slate-100 border border-slate-200 shadow-sm">
                    {t.profile_photo_url ? <img src={t.profile_photo_url} alt={t.full_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><User className="w-6 h-6 text-slate-400" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-slate-900 truncate">{t.full_name}</p>
                    <p className="text-xs font-medium text-blue-700 truncate mb-1">{t.qualification}</p>
                    {(() => {
                      const rList = reviewsMap[t.user_id] || [];
                      const avg = rList.length ? (rList.reduce((a,b) => a+b, 0) / rList.length).toFixed(1) : null;
                      return (
                        <div className="flex items-center gap-1.5 mb-2">
                          <StarRating rating={avg ? parseFloat(avg) : 0} />
                          {avg && <span className="text-[10px] font-bold text-slate-600">{avg}</span>}
                          {rList.length > 0 && <span className="text-[10px] text-slate-400">({rList.length})</span>}
                          <span className="text-[10px] text-slate-400 px-1">•</span>
                          <span className="text-[10px] font-medium text-slate-600">{t.experience_years || "—"} Yrs Exp</span>
                        </div>
                      );
                    })()}
                    {/* Languages */}
                    {(t.languages || []).length > 0 && (
                      <div className="flex items-center gap-1 mb-1">
                        <Globe className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="text-[10px] text-slate-500 truncate">{(t.languages || []).slice(0, 3).join(", ")}</span>
                      </div>
                    )}
                    {/* Availability */}
                    {(t.available_times || []).length > 0 && (
                      <div className="flex items-center gap-1 mb-1">
                        <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="text-[10px] text-slate-500 truncate">{(t.available_times || []).slice(0, 2).join(", ")}</span>
                      </div>
                    )}
                    {/* Specializations */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(t.specializations || []).slice(0, 2).map(spec => (
                        <span key={spec} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold uppercase tracking-wider rounded-md">{spec}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 flex flex-col justify-between h-full">
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Session Fee</p>
                      <p className="text-lg font-black text-blue-900">₹{finalPrice}</p>
                    </div>
                    {selectedTherapist?.id === t.id && (
                      <div className="mt-2 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center ml-auto">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
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
      <StepCard stepNum={8} title="Review Selection" subtitle="Confirm your chosen therapist to proceed to scheduling." onBack={back} onContinue={next} continueLabel="Confirm & Continue" continueDisabled={!selectedTherapist}>
        {selectedTherapist && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-blue-100 shadow-sm">
              <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 bg-slate-100 shadow-inner">
                {selectedTherapist.profile_photo_url ? <img src={selectedTherapist.profile_photo_url} alt={selectedTherapist.full_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><User className="w-8 h-8 text-slate-400" /></div>}
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg">{selectedTherapist.full_name}</p>
                <p className="text-sm font-medium text-blue-700 mb-1">{selectedTherapist.qualification}</p>
                {(() => {
                  const rList = reviewsMap[selectedTherapist?.user_id] || [];
                  const avg = rList.length ? (rList.reduce((a,b) => a+b, 0) / rList.length).toFixed(1) : null;
                  return avg ? (
                    <div className="flex items-center gap-1.5"><StarRating rating={parseFloat(avg)} /><span className="text-xs font-bold text-slate-600">{avg} ({rList.length} reviews)</span></div>
                  ) : <div className="text-xs text-slate-400">No reviews yet</div>;
                })()}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
               <div className="bg-blue-50 rounded-xl p-3 border border-blue-100/50">
                 <p className="text-[10px] uppercase font-bold text-blue-800/60 mb-1">Languages</p>
                 <p className="text-xs font-semibold text-blue-900">{(selectedTherapist.languages || []).join(", ")}</p>
               </div>
               <div className="bg-blue-50 rounded-xl p-3 border border-blue-100/50">
                 <p className="text-[10px] uppercase font-bold text-blue-800/60 mb-1">Session Medium</p>
                 <p className="text-xs font-semibold text-blue-900">{sessionType}</p>
               </div>
            </div>

            <Button variant="outline" className="w-full rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50 font-bold" onClick={() => {
              const slug = selectedTherapist.slug || selectedTherapist.full_name?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || selectedTherapist.id;
              navigate(`/therapist/${slug}?id=${selectedTherapist.id}`);
            }}>View Full Profile & Reviews</Button>
          </div>
        )}
      </StepCard>
    </Layout>
  );

  if (step === 9) {
    const finalPrice = selectedTherapist?.final_customer_price || selectedTherapist?.video_price || 499;

    return (
      <Layout>
        <div className="max-w-md mx-auto w-full">
          <div className="bg-white rounded-2xl border border-blue-100 shadow-xl shadow-blue-900/5 overflow-hidden">
            <div className="bg-blue-600 px-6 py-5 text-white">
              <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mb-1">Step 9 · Secure Checkout</p>
              <p className="font-display font-bold text-2xl leading-tight">Proceed to Booking</p>
            </div>
            <div className="p-6 space-y-6">
              
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                 <div>
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Session Duration</p>
                   <p className="text-sm font-bold text-slate-900">45 - 50 Minutes</p>
                 </div>
                 <div className="text-right">
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Final Price</p>
                   <p className="text-xl font-black text-blue-600">₹{finalPrice}</p>
                 </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Included in Premium</p>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li className="flex gap-2 items-center"><Check className="w-4 h-4 text-green-500" /> Dedicated {sessionType}</li>
                  <li className="flex gap-2 items-center"><Check className="w-4 h-4 text-green-500" /> Post-session resources</li>
                  <li className="flex gap-2 items-center"><Check className="w-4 h-4 text-green-500" /> 100% Confidential & Secure</li>
                </ul>
              </div>

              <Button
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base py-6 shadow-lg shadow-blue-600/30 transition-all"
                onClick={async () => {
                  if (!user) {
                    sessionStorage.setItem("pending_intent", "/find-support");
                    navigate("/login");
                    return;
                  }
                  await upgradeToCustomer(user);
                  await checkUserAuth();
                  navigate(`/book?therapist=${selectedTherapist.id}&type=${encodeURIComponent(sessionType)}&price=${finalPrice}`);
                }}
              >
                Continue to Scheduling & Payment
              </Button>
            </div>
            <div className="px-6 pb-6">
              <Button variant="ghost" className="w-full rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100" onClick={back}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Change Therapist
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }
}