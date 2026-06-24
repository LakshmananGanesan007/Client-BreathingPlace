import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Check, ArrowLeft, Heart, Camera, Loader2, CheckCircle2,
  MessageCircle, Phone, Video, User, MapPin, Activity,
  Shield, Star, Clock, Pencil, Upload
} from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";

const TOTAL_STEPS = 7; 

const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const COUNTRIES = [
  "India", "United States", "United Kingdom", "Canada", "Australia", "UAE",
  "Singapore", "Germany", "France", "New Zealand", "South Africa", "Other"
];
const TIMEZONES = [
  "Asia/Kolkata (IST)", "America/New_York (EST)", "America/Los_Angeles (PST)",
  "Europe/London (GMT)", "Asia/Dubai (GST)", "Asia/Singapore (SGT)",
  "Australia/Sydney (AEST)", "America/Toronto (EST)", "Europe/Berlin (CET)"
];
const CONCERNS = [
  "Anxiety", "Depression", "Stress", "Relationship Issues", "Trauma / PTSD",
  "Grief & Loss", "Self-esteem", "Career / Life Confusion", "Loneliness",
  "Anger Management", "Family Conflict", "Other"
];
const GOALS = [
  "Understand my emotions better", "Learn coping strategies", "Improve my relationships",
  "Overcome past trauma", "Manage stress and anxiety", "Gain clarity in life", "General mental wellness"
];
const THERAPIST_GENDERS = ["Male", "Female", "No Preference"];
const SLEEP_QUALITY = ["Good", "Fair", "Poor", "Very Poor"];
const STRESS_LEVELS = ["Low", "Moderate", "High", "Very High"];
const ANXIETY_LEVELS = ["None", "Mild", "Moderate", "Severe"];
const REL_STATUSES = ["Single", "In a Relationship", "Married", "Divorced", "Widowed"];
const PREF_TIMES = ["Morning", "Afternoon", "Evening", "Flexible"];

const LANGUAGES_LIST = [
  { code: "en", label: "English" }, { code: "hi", label: "Hindi" }, { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" }, { code: "ml", label: "Malayalam" }, { code: "kn", label: "Kannada" },
  { code: "bn", label: "Bengali" }, { code: "mr", label: "Marathi" }, { code: "gu", label: "Gujarati" },
  { code: "pa", label: "Punjabi" }, { code: "or", label: "Odia" }, { code: "ur", label: "Urdu" },
  { code: "ar", label: "Arabic" }, { code: "fr", label: "French" }, { code: "de", label: "German" },
  { code: "es", label: "Spanish" }, { code: "pt", label: "Portuguese" }, { code: "it", label: "Italian" },
  { code: "ru", label: "Russian" }, { code: "zh", label: "Chinese (Mandarin)" }, { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" }, { code: "tr", label: "Turkish" }, { code: "nl", label: "Dutch" },
  { code: "sv", label: "Swedish" }, { code: "id", label: "Indonesian" }, { code: "ms", label: "Malay" },
  { code: "th", label: "Thai" }, { code: "vi", label: "Vietnamese" }, { code: "sw", label: "Swahili" },
  { code: "he", label: "Hebrew" }, { code: "fa", label: "Persian (Farsi)" }, { code: "other", label: "Other" },
];

const safe = (val) => (val || "").toLowerCase().replace(/ /g, "_");

const uploadToCloudinary = async (file) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  
  if (!cloudName || !uploadPreset) {
    throw new Error("Missing Cloudinary configuration in .env");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });
  
  const data = await res.json();
  if (!res.ok || !data.secure_url) {
    console.error("Cloudinary Error:", data);
    throw new Error(data.error?.message || "Upload failed");
  }
  return data.secure_url;
};

function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center gap-1 mb-5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-1.5 rounded-full flex-1 transition-all ${i < current ? "bg-primary" : "bg-gray-200"}`} />
      ))}
    </div>
  );
}

function StepCard({ stepNum, title, subtitle, children, onBack, onContinue, continueDisabled, continueLabel = "Continue", hideBack }) {
  return (
    <div className="max-w-md mx-auto w-full">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-primary/5 border-b border-gray-100 px-5 py-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{stepNum}</span>
          <span className="text-[10px] text-primary font-semibold uppercase tracking-wide">BreathingPlace · Profile Setup</span>
        </div>
        <div className="px-5 pt-4 pb-3">
          <h2 className="font-display text-base font-bold text-gray-900 leading-snug mb-0.5">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mb-3">{subtitle}</p>}
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
            size="sm" onClick={onContinue} disabled={continueDisabled}
          >
            {continueDisabled && continueLabel.includes("Saving") ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />{continueLabel}</>
            ) : continueLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Layout({ step, children }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F0F0E0" }}>
      <div className="flex-1 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
              <Heart className="w-3.5 h-3.5" /> Customer Profile Setup
            </div>
            <p className="text-xs text-gray-500">Step {step} of {TOTAL_STEPS}</p>
          </div>
          <StepIndicator current={step} total={TOTAL_STEPS} />
          {children}
        </div>
      </div>
    </div>
  );
}

function SelectOption({ label, selected, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left text-sm transition-all ${selected ? "border-primary bg-primary/5 font-medium text-primary" : "border-gray-200 hover:border-gray-300 text-gray-700"}`}>
      <span className="flex-1">{label}</span>
      {selected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
    </button>
  );
}

function PhotoUpload({ value, onChange }) {
  const ref = useRef(null);
  const [uploading, setUploading] = useState(false);
  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      onChange(url);
      toast.success("Photo uploaded successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to upload photo");
    }
    setUploading(false);
    e.target.value = "";
  };
  return (
    <div className="flex items-center gap-4">
      <div onClick={() => ref.current?.click()} className="w-16 h-16 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-primary overflow-hidden relative flex-shrink-0">
        {value ? <img src={value} alt="Photo" className="w-full h-full object-cover" /> : <Camera className="w-6 h-6 text-gray-400" />}
        {uploading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 className="w-4 h-4 text-white animate-spin" /></div>}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
      <div>
        <button type="button" disabled={uploading} onClick={() => ref.current?.click()} className="text-sm text-primary hover:underline font-medium disabled:opacity-50">{value ? "Change Photo" : "Upload Profile Photo"}</button>
        <p className="text-xs text-gray-400 mt-0.5">JPG or PNG, max 5MB</p>
      </div>
    </div>
  );
}

function AssessmentCard({ icon: Icon, title, levels, selected, onSelect, colorClass = "text-primary" }) {
  const levelColors = {
    "None": "bg-green-100 text-green-700 border-green-200",
    "Good": "bg-green-100 text-green-700 border-green-200",
    "Low": "bg-green-100 text-green-700 border-green-200",
    "Mild": "bg-blue-100 text-blue-700 border-blue-200",
    "Fair": "bg-blue-100 text-blue-700 border-blue-200",
    "Moderate": "bg-amber-100 text-amber-700 border-amber-200",
    "High": "bg-orange-100 text-orange-700 border-orange-200",
    "Poor": "bg-orange-100 text-orange-700 border-orange-200",
    "Severe": "bg-red-100 text-red-700 border-red-200",
    "Very High": "bg-red-100 text-red-700 border-red-200",
    "Very Poor": "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className={`w-3.5 h-3.5 ${colorClass}`} />
        </div>
        <span className="text-xs font-bold text-gray-800">{title}</span>
        {selected && (
          <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full border ${levelColors[selected] || "bg-primary/10 text-primary border-primary/20"}`}>
            {selected}
          </span>
        )}
      </div>
      <div className="p-3 grid grid-cols-2 gap-1.5">
        {levels.map((l) => (
          <button key={l} onClick={() => onSelect(l)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all text-left ${selected === l ? "border-primary bg-primary/5 text-primary" : "border-gray-100 text-gray-600 hover:border-gray-200"}`}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

function CustomerSuccessScreen({ navigate }) {
  useEffect(() => {
    const duration = 3000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors: ["#4CAF50","#8BC34A","#FFD700","#FF6B6B","#64B5F6"] });
      confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors: ["#4CAF50","#8BC34A","#FFD700","#FF6B6B","#64B5F6"] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();

    const timer = setTimeout(() => navigate("/dashboard"), 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#F0F0E0" }}>
      <div className="max-w-sm w-full text-center">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-lg p-8">
          <div className="flex items-center justify-center mb-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <CheckCircle2 className="w-12 h-12 text-primary" />
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping opacity-40" />
            </div>
          </div>
          <h2 className="font-display text-xl font-bold text-gray-900 mb-2">Congratulations! 🎉</h2>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            Your profile has been completed successfully. You're all set to start your wellness journey.
          </p>
          <div className="my-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
            <p className="text-sm text-gray-600 italic leading-relaxed">
              "The curious paradox is that when I accept myself just as I am, then I can change."
            </p>
            <p className="text-xs text-primary font-semibold mt-2">— Carl Rogers</p>
          </div>
          <p className="text-xs text-gray-400">Redirecting to your dashboard in a few seconds…</p>
          <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ animation: "shrink 5s linear forwards" }} />
          </div>
        </div>
      </div>
      <style>{`@keyframes shrink { from { width: 100%; } to { width: 0%; } }`}</style>
    </div>
  );
}

export default function CustomerOnboarding() {
  const navigate = useNavigate();
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [timezone, setTimezone] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [occupation, setOccupation] = useState("");
  const [relationshipStatus, setRelationshipStatus] = useState("");

  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [prefLanguage, setPrefLanguage] = useState("");
  const [langSearch, setLangSearch] = useState("");
  const [otherLangText, setOtherLangText] = useState("");

  const [primaryConcern, setPrimaryConcern] = useState("");
  const [problemDesc, setProblemDesc] = useState("");
  const [therapyGoal, setTherapyGoal] = useState("");
  const [previousTherapy, setPreviousTherapy] = useState(null);
  const [currentMedication, setCurrentMedication] = useState("");
  const [anxietyLevel, setAnxietyLevel] = useState("");
  const [stressLevel, setStressLevel] = useState("");
  const [sleepQuality, setSleepQuality] = useState("");
  const [depressionHistory, setDepressionHistory] = useState(null);

  const [emergencyContact, setEmergencyContact] = useState("");

  const [prefTherapistGender, setPrefTherapistGender] = useState("");
  const [prefSessionTime, setPrefSessionTime] = useState("");

  // T&C State
  const [tcAccepted, setTcAccepted] = useState(false);
  const [tcContent, setTcContent] = useState("");

  useEffect(() => {
    if (!userProfile || initialized) return;
    const saved = (userProfile.step_data && typeof userProfile.step_data === "object") ? userProfile.step_data : {};
    const lastCompleted = userProfile.last_completed_step || 0;

    if (saved.fullName) setFullName(saved.fullName);
    if (saved.gender) setGender(saved.gender);
    if (saved.dob) setDob(saved.dob);
    if (saved.country) setCountry(saved.country);
    if (saved.state) setState(saved.state);
    if (saved.city) setCity(saved.city);
    if (saved.timezone) setTimezone(saved.timezone);
    if (saved.photoUrl) setPhotoUrl(saved.photoUrl);
    if (saved.occupation) setOccupation(saved.occupation);
    if (saved.relationshipStatus) setRelationshipStatus(saved.relationshipStatus);
    if (saved.email) setEmail(saved.email);
    if (saved.phone) setPhone(saved.phone);
    if (saved.prefLanguage) setPrefLanguage(saved.prefLanguage);
    if (saved.otherLangText) setOtherLangText(saved.otherLangText);
    if (saved.primaryConcern) setPrimaryConcern(saved.primaryConcern);
    if (saved.problemDesc) setProblemDesc(saved.problemDesc);
    if (saved.therapyGoal) setTherapyGoal(saved.therapyGoal);
    if (saved.previousTherapy !== undefined) setPreviousTherapy(saved.previousTherapy);
    if (saved.currentMedication) setCurrentMedication(saved.currentMedication);
    if (saved.anxietyLevel) setAnxietyLevel(saved.anxietyLevel);
    if (saved.stressLevel) setStressLevel(saved.stressLevel);
    if (saved.sleepQuality) setSleepQuality(saved.sleepQuality);
    if (saved.depressionHistory !== undefined) setDepressionHistory(saved.depressionHistory);
    if (saved.emergencyContact) setEmergencyContact(saved.emergencyContact);
    if (saved.prefTherapistGender) setPrefTherapistGender(saved.prefTherapistGender);
    if (saved.prefSessionTime) setPrefSessionTime(saved.prefSessionTime);

    let nextStep = 1;
    if (saved.fullName && saved.gender && saved.country && saved.photoUrl) {
      nextStep = 2;
      if (saved.email && saved.phone && saved.prefLanguage) {
        nextStep = 3;
        if (saved.primaryConcern && saved.previousTherapy !== null && saved.previousTherapy !== undefined) {
          nextStep = 4;
          if (lastCompleted >= 4) { 
            nextStep = 5;
            if (saved.prefTherapistGender && saved.prefSessionTime) {
              nextStep = 6;
              if (lastCompleted >= 6) {
                nextStep = 7;
              }
            }
          }
        }
      }
    }

    setStep(nextStep);
    setInitialized(true);
  }, [userProfile, initialized]);

  useEffect(() => {
    async function fetchTc() {
      const { data } = await supabase.from('terms_and_conditions')
        .select('content').eq('audience_type', 'customer').eq('is_published', true)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data) setTcContent(data.content);
      else setTcContent("Please agree to our standard platform terms and conditions.");
    }
    fetchTc();
  }, []);

  const back = () => { if (step === 1) navigate("/complete-profile"); else setStep((s) => s - 1); };

  const continueStep = async (stepNum) => {
    if (!user) { navigate("/login"); return; }
    setSaving(true);

    const mergedStepData = {
      fullName, gender, dob, country, state, city, timezone, photoUrl, occupation, relationshipStatus,
      email, phone, prefLanguage, otherLangText,
      primaryConcern, problemDesc, therapyGoal, previousTherapy, currentMedication, anxietyLevel, stressLevel, sleepQuality, depressionHistory,
      emergencyContact,
      prefTherapistGender, prefSessionTime
    };

    const currentLastStep = userProfile?.last_completed_step || 0;
    const newLastStep = Math.max(currentLastStep, stepNum);

    try {
      await supabase.from('user_profiles').update({
        step_data: mergedStepData,
        last_completed_step: newLastStep,
        updated_at: new Date().toISOString()
      }).eq('user_id', user.id);
      
      if (userProfile) {
        userProfile.step_data = mergedStepData;
        userProfile.last_completed_step = newLastStep;
      }
    } catch (err) {
      toast.error("Failed to save progress.");
    }
    setSaving(false);
    setStep(stepNum + 1);
  };

  const getLangLabel = () => {
    const langObj = LANGUAGES_LIST.find((l) => l.code === prefLanguage);
    if (!langObj) return prefLanguage || "";
    if (langObj.code === "other") return otherLangText || "Other";
    return langObj.label;
  };

  const handleSubmit = async () => {
    if (!user) { navigate("/login"); return; }
    setSaving(true);
    try {
      const profileData = {
        full_name: fullName || "",
        gender: safe(gender) || "prefer_not_to_say",
        dob: dob || "",
        address: [city, state, country].filter(Boolean).join(", "),
        phone: phone || "",
        occupation: occupation || "",
        relationship_status: safe(relationshipStatus) || "",
        preferred_language: getLangLabel(),
        profile_photo_url: photoUrl || "",
        main_concerns: primaryConcern ? [primaryConcern] : [],
        previous_therapy: previousTherapy === "yes",
        current_medication: currentMedication || "",
        anxiety_level: safe(anxietyLevel) || "none",
        stress_level: safe(stressLevel) || "low",
        sleep_quality: safe(sleepQuality) || "good",
        depression_history: depressionHistory === "yes",
        emergency_contact: emergencyContact || "",
        preferred_therapist_gender: safe(prefTherapistGender) || "no_preference",
        preferred_session_time: safe(prefSessionTime) || "flexible",
        profile_complete: true,
      };

      const { error: cError } = await supabase.from('customer_profiles').upsert({
        user_id: user.id,
        ...profileData
      }, { onConflict: 'user_id' });

      if (cError) throw cError;

      await supabase.from('user_profiles').update({
        selected_role: "customer",
        profile_status: "completed",
        last_completed_step: TOTAL_STEPS,
        total_steps: TOTAL_STEPS,
        updated_at: new Date().toISOString()
      }).eq('user_id', user.id);

      await refreshUserProfile();
      setStep(8);
    } catch (err) {
      toast.error("Unable to insert record into customer_profiles. " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (step === 8) return <CustomerSuccessScreen navigate={navigate} />;

  if (step === 1) return (
    <Layout step={step}>
      <StepCard stepNum={1} title="Personal Information" subtitle="Tell us a little about yourself."
        onBack={back} hideBack
        onContinue={() => continueStep(1)}
        continueDisabled={saving || !fullName || !gender || !country || !photoUrl}
        continueLabel={saving ? "Saving..." : "Continue"}>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Full Name *</Label>
            <Input className="mt-1 text-sm h-9 rounded-lg" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
          </div>
          <div>
            <Label className="text-xs">Profile Photo *</Label>
            <div className="mt-1"><PhotoUpload value={photoUrl} onChange={setPhotoUrl} /></div>
            {!photoUrl && <p className="text-[10px] text-red-500 mt-1">Profile photo is required.</p>}
          </div>
          <div>
            <Label className="text-xs">Gender *</Label>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {GENDERS.map((g) => <SelectOption key={g} label={g} selected={gender === g} onClick={() => setGender(g)} />)}
            </div>
          </div>
          <div>
            <Label className="text-xs">Date of Birth</Label>
            <Input type="date" className="mt-1 text-sm h-9 rounded-lg" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Occupation</Label>
            <Input className="mt-1 text-sm h-9 rounded-lg" value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="e.g. Software Engineer, Student" />
          </div>
          <div>
            <Label className="text-xs">Relationship Status</Label>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {REL_STATUSES.map((r) => <SelectOption key={r} label={r} selected={relationshipStatus === r} onClick={() => setRelationshipStatus(r)} />)}
            </div>
          </div>
          <div>
            <Label className="text-xs">Country *</Label>
            <select className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 h-9 bg-white" value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="">Select Country</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">State / Province</Label>
              <Input className="mt-1 text-sm h-9 rounded-lg" value={state} onChange={(e) => setState(e.target.value)} placeholder="State" />
            </div>
            <div>
              <Label className="text-xs">City</Label>
              <Input className="mt-1 text-sm h-9 rounded-lg" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Time Zone</Label>
            <select className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 h-9 bg-white" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              <option value="">Select Timezone</option>
              {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </StepCard>
    </Layout>
  );

  if (step === 2) {
    const filteredLangs = LANGUAGES_LIST.filter((l) => l.label.toLowerCase().includes(langSearch.toLowerCase()));
    return (
      <Layout step={step}>
        <StepCard stepNum={2} title="Contact & Language" subtitle="How can we reach you and what language do you prefer?"
          onBack={back}
          onContinue={() => continueStep(2)}
          continueDisabled={saving || !email || !phone || !prefLanguage}
          continueLabel={saving ? "Saving..." : "Continue"}>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Email Address *</Label>
              <Input type="email" className="mt-1 text-sm h-9 rounded-lg" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
            </div>
            <div>
              <Label className="text-xs">Mobile Number *</Label>
              <div className="flex gap-2 mt-1">
                <select className="text-xs border border-gray-200 rounded-lg px-2 h-9 bg-white w-20">
                  <option>+91</option><option>+1</option><option>+44</option><option>+971</option><option>+65</option>
                </select>
                <Input className="flex-1 text-sm h-9 rounded-lg" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Preferred Language *</Label>
              <p className="text-[10px] text-gray-400 mb-1">We'll use this to match you with therapists who speak your language.</p>
              <Input className="mt-0.5 text-sm h-9 rounded-lg" placeholder="Search languages..." value={langSearch} onChange={(e) => setLangSearch(e.target.value)} />
              <div className="mt-1.5 max-h-40 overflow-y-auto space-y-1 pr-0.5">
                {filteredLangs.map((l) => (
                  <SelectOption key={l.code} label={l.label} selected={prefLanguage === l.code} onClick={() => setPrefLanguage(l.code)} />
                ))}
              </div>
              {prefLanguage === "other" && (
                <div className="mt-2">
                  <Label className="text-xs">Specify language</Label>
                  <Input className="mt-1 text-sm h-9 rounded-lg" value={otherLangText} onChange={(e) => setOtherLangText(e.target.value)} placeholder="e.g. Tulu, Konkani" />
                </div>
              )}
              {prefLanguage && prefLanguage !== "other" && (
                <div className="mt-1.5 p-2 bg-primary/5 rounded-lg text-xs text-primary">
                  Selected: <span className="font-semibold">{LANGUAGES_LIST.find((l) => l.code === prefLanguage)?.label}</span>
                </div>
              )}
            </div>
          </div>
        </StepCard>
      </Layout>
    );
  }

  if (step === 3) return (
    <Layout step={step}>
      <div className="max-w-md mx-auto w-full">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-primary/5 border-b border-gray-100 px-5 py-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
            <span className="text-[10px] text-primary font-semibold uppercase tracking-wide">BreathingPlace · Profile Setup</span>
          </div>
          <div className="px-5 pt-4 pb-3">
            <h2 className="font-display text-base font-bold text-gray-900 mb-0.5">Well-Being Assessment</h2>
            <p className="text-xs text-gray-500 mb-4">This information helps your therapist understand your situation better and provide the right support.</p>

            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                    <Heart className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  <span className="text-xs font-bold text-gray-800">Primary Concern *</span>
                  {primaryConcern && <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{primaryConcern}</span>}
                </div>
                <div className="p-3 grid grid-cols-2 gap-1.5">
                  {CONCERNS.map((c) => (
                    <button key={c} onClick={() => setPrimaryConcern(c)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all text-left ${primaryConcern === c ? "border-primary bg-primary/5 text-primary" : "border-gray-100 text-gray-600 hover:border-gray-200"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-600">Describe Your Situation <span className="text-gray-400">(optional)</span></Label>
                <Textarea className="mt-1 text-sm rounded-lg resize-none" rows={3} value={problemDesc} onChange={(e) => setProblemDesc(e.target.value)} placeholder="Tell us briefly what you're going through..." />
                <p className="text-[10px] text-gray-400 mt-0.5">Visible to your assigned therapist only.</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Star className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <span className="text-xs font-bold text-gray-800">Therapy Goal</span>
                </div>
                <div className="p-3 space-y-1.5">
                  {GOALS.map((g) => (
                    <button key={g} onClick={() => setTherapyGoal(g)}
                      className={`w-full px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left ${therapyGoal === g ? "border-primary bg-primary/5 text-primary" : "border-gray-100 text-gray-600 hover:border-gray-200"}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <AssessmentCard icon={Activity} title="Anxiety Level" levels={ANXIETY_LEVELS} selected={anxietyLevel} onSelect={setAnxietyLevel} />
              <AssessmentCard icon={Activity} title="Stress Level" levels={STRESS_LEVELS} selected={stressLevel} onSelect={setStressLevel} colorClass="text-orange-500" />
              <AssessmentCard icon={Clock} title="Sleep Quality" levels={SLEEP_QUALITY} selected={sleepQuality} onSelect={setSleepQuality} colorClass="text-indigo-500" />

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-3.5 h-3.5 text-green-500" />
                  </div>
                  <span className="text-xs font-bold text-gray-800">Previous Therapy Experience *</span>
                </div>
                <div className="p-3 grid grid-cols-2 gap-1.5">
                  <button onClick={() => setPreviousTherapy("yes")}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${previousTherapy === "yes" ? "border-primary bg-primary/5 text-primary" : "border-gray-100 text-gray-600 hover:border-gray-200"}`}>
                    Yes, I have
                  </button>
                  <button onClick={() => setPreviousTherapy("no")}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${previousTherapy === "no" ? "border-primary bg-primary/5 text-primary" : "border-gray-100 text-gray-600 hover:border-gray-200"}`}>
                    No, first time
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <Activity className="w-3.5 h-3.5 text-purple-500" />
                  </div>
                  <span className="text-xs font-bold text-gray-800">History of Depression?</span>
                </div>
                <div className="p-3 grid grid-cols-2 gap-1.5">
                  <button onClick={() => setDepressionHistory("yes")}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${depressionHistory === "yes" ? "border-primary bg-primary/5 text-primary" : "border-gray-100 text-gray-600 hover:border-gray-200"}`}>Yes</button>
                  <button onClick={() => setDepressionHistory("no")}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${depressionHistory === "no" ? "border-primary bg-primary/5 text-primary" : "border-gray-100 text-gray-600 hover:border-gray-200"}`}>No</button>
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-600">Current Medication <span className="text-gray-400">(if any)</span></Label>
                <Input className="mt-1 text-sm h-9 rounded-lg" value={currentMedication} onChange={(e) => setCurrentMedication(e.target.value)} placeholder="Enter medication name or leave blank" />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
                <span className="font-semibold">🔒 Confidential:</span> All well-being data is shared only with your assigned therapist to help them support you better.
              </div>
            </div>
          </div>
          <div className="px-5 pb-5 flex gap-2">
            <Button variant="outline" size="sm" className="flex-shrink-0 rounded-full" onClick={back}>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              className="flex-1 rounded-full bg-primary text-white font-semibold text-sm" size="sm"
              onClick={() => continueStep(3)}
              disabled={saving || !primaryConcern || previousTherapy === null}
            >
              {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Saving...</> : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );

  if (step === 4) return (
    <Layout step={step}>
      <StepCard stepNum={4} title="Emergency Contact" subtitle="This helps us reach someone in case of a crisis situation."
        onBack={back}
        onContinue={() => continueStep(4)}
        continueDisabled={saving}
        continueLabel={saving ? "Saving..." : "Continue"}>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Emergency Contact (Name & Phone)</Label>
            <Input className="mt-1 text-sm h-9 rounded-lg" value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} placeholder="e.g. Jane Doe – +91 98765 43210" />
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            This information is kept confidential and only used in genuine emergency situations.
          </div>
        </div>
      </StepCard>
    </Layout>
  );

  if (step === 5) return (
    <Layout step={step}>
      <StepCard stepNum={5} title="Therapist Preferences" subtitle="These help us find the best match for you."
        onBack={back}
        onContinue={() => continueStep(5)}
        continueDisabled={saving}
        continueLabel={saving ? "Saving..." : "Continue"}>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Preferred Therapist Gender</Label>
            <div className="grid grid-cols-3 gap-1.5 mt-1">
              {THERAPIST_GENDERS.map((g) => <SelectOption key={g} label={g} selected={prefTherapistGender === g} onClick={() => setPrefTherapistGender(g)} />)}
            </div>
          </div>
          <div>
            <Label className="text-xs">Preferred Session Time</Label>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {PREF_TIMES.map((t) => <SelectOption key={t} label={t} selected={prefSessionTime === t} onClick={() => setPrefSessionTime(t)} />)}
            </div>
          </div>

          <div>
            <Label className="text-xs mb-2 block">Session Types Available</Label>
            <div className="bg-gradient-to-br from-primary/5 to-green-50 border border-primary/20 rounded-2xl p-4">
              <p className="text-xs text-gray-700 leading-relaxed mb-3 font-medium">
                🎉 Great news! Your therapist is ready to support you through Chat, Voice Call, and Video Call. Choose the method that feels most comfortable whenever you begin your journey.
              </p>
              <div className="space-y-2">
                {[
                  { icon: MessageCircle, label: "Chat", desc: "Text-based messaging" },
                  { icon: Phone, label: "Voice Call", desc: "Audio-only session" },
                  { icon: Video, label: "Video Call", desc: "Face-to-face session" },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-primary/20">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{label}</p>
                      <p className="text-[10px] text-gray-400">{desc}</p>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </StepCard>
    </Layout>
  );

  if (step === 6) {
    const langLabel = getLangLabel();
    const sections = [
      {
        icon: User, title: "Personal Information", goTo: 1,
        rows: [
          { label: "Full Name", value: fullName || "—" },
          { label: "Gender", value: gender || "—" },
          { label: "Date of Birth", value: dob || "—" },
          { label: "Occupation", value: occupation || "—" },
          { label: "Relationship", value: relationshipStatus || "—" },
          { label: "Location", value: [city, state, country].filter(Boolean).join(", ") || "—" },
          { label: "Timezone", value: timezone || "—" },
        ],
      },
      {
        icon: MapPin, title: "Contact & Language", goTo: 2,
        rows: [
          { label: "Email", value: email || "—" },
          { label: "Phone", value: phone || "—" },
          { label: "Language", value: langLabel || "—" },
        ],
      },
      {
        icon: Activity, title: "Well-Being Assessment", goTo: 3,
        rows: [
          { label: "Primary Concern", value: primaryConcern || "—" },
          { label: "Therapy Goal", value: therapyGoal || "—" },
          { label: "Anxiety Level", value: anxietyLevel || "—" },
          { label: "Stress Level", value: stressLevel || "—" },
          { label: "Sleep Quality", value: sleepQuality || "—" },
          { label: "Prev. Therapy", value: previousTherapy === "yes" ? "Yes" : previousTherapy === "no" ? "No" : "—" },
          { label: "Depression Hx", value: depressionHistory === "yes" ? "Yes" : depressionHistory === "no" ? "No" : "—" },
          { label: "Medication", value: currentMedication || "None" },
        ],
      },
      {
        icon: Shield, title: "Emergency Contact", goTo: 4,
        rows: [{ label: "Contact", value: emergencyContact || "—" }],
      },
      {
        icon: Star, title: "Therapist Preferences", goTo: 5,
        rows: [
          { label: "Therapist Gender", value: prefTherapistGender || "No Preference" },
          { label: "Session Time", value: prefSessionTime || "Flexible" },
          { label: "Session Types", value: "Chat · Voice Call · Video Call" },
        ],
      },
    ];

    return (
      <Layout step={step}>
        <div className="max-w-md mx-auto w-full">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-primary/5 border-b border-gray-100 px-5 py-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">6</span>
              <span className="text-[10px] text-primary font-semibold uppercase tracking-wide">BreathingPlace · Profile Setup</span>
            </div>
            <div className="px-5 pt-4 pb-3">
              <h2 className="font-display text-base font-bold text-gray-900 mb-0.5">Profile Summary</h2>
              <p className="text-xs text-gray-500 mb-4">Review your information before submitting. Click the edit icon on any section to make changes.</p>

              {(photoUrl || fullName) && (
                <div className="flex items-center gap-3 pb-3 mb-3 border-b border-gray-100">
                  {photoUrl
                    ? <img src={photoUrl} alt="Profile" className="w-12 h-12 rounded-xl object-cover border border-gray-200" />
                    : <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><User className="w-5 h-5 text-primary" /></div>
                  }
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{fullName}</p>
                    <p className="text-xs text-gray-400">{[gender, country].filter(Boolean).join(" · ")}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {sections.map((sec) => (
                  <div key={sec.title} className="rounded-xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center">
                          <sec.icon className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">{sec.title}</span>
                      </div>
                      <button onClick={() => setStep(sec.goTo)} className="flex items-center gap-1 text-[10px] text-primary hover:underline">
                        <Pencil className="w-2.5 h-2.5" /> Edit
                      </button>
                    </div>
                    {sec.rows.map((row) => (
                      <div key={row.label} className="flex items-start justify-between gap-2 px-3 py-1.5 border-b border-gray-50 last:border-0">
                        <span className="text-[11px] text-gray-400 flex-shrink-0 w-24">{row.label}</span>
                        <span className="text-[11px] font-medium text-gray-800 text-right">{row.value}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-shrink-0 rounded-full" onClick={back}>
                <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                className="flex-1 rounded-full bg-primary text-white font-semibold text-sm" size="sm"
                onClick={() => continueStep(6)} disabled={saving}
              >
                Continue to Terms
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Step 7 — Terms & Conditions
  if (step === 7) {
    return (
      <Layout step={step}>
        <StepCard stepNum={7} title="Terms & Conditions" subtitle="Please read and accept our platform terms before submitting."
          onBack={back}
          onContinue={handleSubmit}
          continueDisabled={saving || !tcAccepted}
          continueLabel={saving ? "Submitting..." : "Accept & Submit Profile"}>
          
          <div className="space-y-4">
            <div className="h-64 overflow-y-auto bg-gray-50 p-4 border border-gray-200 rounded-xl text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
              {tcContent ? tcContent : <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Loading terms...</div>}
            </div>

            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
              <input 
                type="checkbox" 
                className="mt-0.5 w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                checked={tcAccepted} 
                onChange={e => setTcAccepted(e.target.checked)} 
              />
              <span className="text-sm font-medium text-gray-800">
                I have read and agree to the Customer Terms & Conditions.
              </span>
            </label>
          </div>
        </StepCard>
      </Layout>
    );
  }
}