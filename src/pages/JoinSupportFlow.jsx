import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, ArrowLeft, Heart, Upload, Camera, Loader2, CheckCircle2, Info, AlertCircle, Pencil, MessageCircle, Phone, Video } from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";

const TOTAL_STEPS = 9;

const SPECIALIZATIONS = [
  "Anxiety", "Depression", "Relationship Counseling", "Couples Therapy",
  "Trauma Healing", "Career Guidance", "Youth Counseling", "Child Psychology",
  "Addiction Recovery", "Grief & Loss", "OCD", "ADHD", "Other"
];

const LANGUAGES_LIST = [
  { code: "en", label: "English" }, { code: "hi", label: "Hindi" }, { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" }, { code: "ml", label: "Malayalam" }, { code: "kn", label: "Kannada" },
  { code: "bn", label: "Bengali" }, { code: "mr", label: "Marathi" }, { code: "gu", label: "Gujarati" },
  { code: "pa", label: "Punjabi" }, { code: "or", label: "Odia" }, { code: "as", label: "Assamese" },
  { code: "ur", label: "Urdu" }, { code: "ar", label: "Arabic" }, { code: "fr", label: "French" },
  { code: "de", label: "German" }, { code: "es", label: "Spanish" }, { code: "pt", label: "Portuguese" },
  { code: "zh", label: "Chinese" }, { code: "ja", label: "Japanese" }, { code: "other", label: "Other" },
];

const CURRENCIES = [
  { code: "INR", symbol: "₹", label: "Indian Rupee (INR)" },
  { code: "USD", symbol: "$", label: "US Dollar (USD)" },
  { code: "EUR", symbol: "€", label: "Euro (EUR)" },
  { code: "GBP", symbol: "£", label: "British Pound (GBP)" },
];

const DAYS_FULL = [
  { short: "Mon", full: "Monday" }, { short: "Tue", full: "Tuesday" }, { short: "Wed", full: "Wednesday" },
  { short: "Thu", full: "Thursday" }, { short: "Fri", full: "Friday" }, { short: "Sat", full: "Saturday" },
  { short: "Sun", full: "Sunday" },
];

const TIME_HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 === 0 ? 12 : i % 12;
  const ampm = i < 12 ? "AM" : "PM";
  return { value: `${String(i).padStart(2, "0")}:00`, label: `${h}:00 ${ampm}` };
});

const uploadToCloudinary = async (file) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  
  if (!cloudName || !uploadPreset) {
    throw new Error("Missing Cloudinary configuration in .env");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: formData,
  });
  
  const data = await res.json();
  if (!res.ok || !data.secure_url) {
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
    <div className="max-w-lg mx-auto w-full">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-primary/5 border-b border-gray-100 px-5 py-3 flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] text-primary font-semibold uppercase tracking-wide">BreathingPlace</span>
          </div>
          <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 ml-auto">{stepNum}</span>
        </div>
        <div className="px-5 pt-4 pb-3">
          <h2 className="font-display text-base font-bold text-gray-900 leading-snug mb-0.5">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mb-3">{subtitle}</p>}
          <div className="mt-3">{children}</div>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          {!hideBack && (
            <Button variant="outline" size="sm" className="flex-shrink-0 rounded-lg" onClick={onBack}>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button className="flex-1 rounded-lg bg-primary text-white font-semibold text-sm" size="sm" onClick={onContinue} disabled={continueDisabled}>
            {continueLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FileUploadField({ label, value, onChange, required, accept = "image/*,.pdf" }) {
  const ref = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      onChange(url);
      toast.success(`${label} uploaded successfully!`);
    } catch (err) {
      toast.error(err.message || `Failed to upload ${label}`);
    }
    setUploading(false);
  };

  const isImage = value && (value.match(/\.(jpg|jpeg|png|gif|webp)$/i) || value.includes("image"));

  return (
    <div>
      <div className="flex items-center gap-1 mb-1">
        <Label className="text-xs text-gray-600">{label}</Label>
        {required && <span className="text-red-500 text-xs">*</span>}
      </div>
      {value ? (
        <div className="rounded-lg border border-primary overflow-hidden">
          {isImage ? (
            <img src={value} alt={label} className="w-full h-28 object-cover" />
          ) : (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-primary/5">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="text-xs text-primary font-medium flex-1">Uploaded successfully</span>
            </div>
          )}
          <button
            onClick={() => ref.current?.click()}
            className="w-full py-1.5 text-xs text-gray-500 hover:text-primary border-t border-gray-100 bg-white transition-colors"
          >
            Replace Document
          </button>
        </div>
      ) : (
        <div
          onClick={() => ref.current?.click()}
          className="flex items-center gap-2 px-3 py-3 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-primary hover:text-primary cursor-pointer transition-all text-xs"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          <span>{uploading ? "Uploading..." : `Click to upload ${label}`}</span>
        </div>
      )}
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={handleFile} />
    </div>
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
  };

  return (
    <div className="flex items-center gap-3">
      <div onClick={() => ref.current?.click()} className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-primary overflow-hidden relative flex-shrink-0">
        {value ? <img src={value} alt="Photo" className="w-full h-full object-cover" /> : <Camera className="w-5 h-5 text-gray-400" />}
        {uploading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 className="w-4 h-4 text-white animate-spin" /></div>}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button type="button" onClick={() => ref.current?.click()} className="text-xs text-primary hover:underline">{value ? "Change Photo" : "Upload Photo"}</button>
    </div>
  );
}

function CheckToggle({ label, selected, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left text-sm transition-all ${selected ? "border-primary bg-primary/5 text-primary" : "border-gray-100 hover:border-gray-200 text-gray-700"}`}>
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selected ? "bg-primary border-primary" : "border-gray-300"}`}>
        {selected && <Check className="w-2.5 h-2.5 text-white" />}
      </div>
      {label}
    </button>
  );
}

function Layout({ step, children }) {
  return (
    <div className="min-h-screen py-10 px-4" style={{ backgroundColor: "#F0F0E0" }}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
            <Heart className="w-3.5 h-3.5" /> Join Support Network
          </div>
          <p className="text-xs text-gray-500">Step {step} of {TOTAL_STEPS}</p>
        </div>
        <StepIndicator current={step} total={TOTAL_STEPS} />
        {children}
      </div>
    </div>
  );
}

function TherapistSuccessScreen({ navigate }) {
  useEffect(() => {
    const duration = 3000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors: ["#4CAF50","#2E8B57","#FFD700","#64B5F6","#F48FB1"] });
      confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors: ["#4CAF50","#2E8B57","#FFD700","#64B5F6","#F48FB1"] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();

    const timer = setTimeout(() => navigate("/therapist"), 5000);
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
          <h2 className="font-display text-xl font-bold text-gray-900 mb-2">Profile Submitted Successfully</h2>
          <p className="text-sm text-gray-500 mb-4 leading-relaxed">
            Thank you for joining our support network. Your application is now under review.
          </p>
          <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 text-left mb-4">
            <p className="text-xs text-primary font-semibold mb-1">What happens next?</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              Our team will review your profile and documents. You will be notified once your profile is approved.
            </p>
          </div>
          <p className="text-xs text-gray-400">Redirecting to your dashboard…</p>
          <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ animation: "shrink 5s linear forwards" }} />
          </div>
        </div>
      </div>
      <style>{`@keyframes shrink { from { width: 100%; } to { width: 0%; } }`}</style>
    </div>
  );
}

export default function JoinSupportFlow() {
  const navigate = useNavigate();
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [qualification, setQualification] = useState("");
  const [license, setLicense] = useState("");
  const [experience, setExperience] = useState("");
  const [specializations, setSpecializations] = useState([]);
  const [selectedLangs, setSelectedLangs] = useState([]);
  const [langSearch, setLangSearch] = useState("");
  const [otherLangText, setOtherLangText] = useState("");
  const [daySlots, setDaySlots] = useState({});
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  
  const SESSION_MODES = ["Chat", "Voice Call", "Video Call"];
  const [chatPrice, setChatPrice] = useState("");
  const [voicePrice, setVoicePrice] = useState("");
  const [videoPrice, setVideoPrice] = useState("");
  const [currency, setCurrency] = useState("INR");
  
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [degreeUrl, setDegreeUrl] = useState("");
  const [licenseUrl, setLicenseUrl] = useState("");
  const [govIdUrl, setGovIdUrl] = useState("");

  const [tcAccepted, setTcAccepted] = useState(false);
  const [tcContent, setTcContent] = useState("");

  useEffect(() => {
    if (!userProfile || initialized) return;
    const saved = (userProfile.step_data && typeof userProfile.step_data === "object") ? userProfile.step_data : {};
    const lastCompleted = userProfile.last_completed_step || 0;

    if (saved.fullName) setFullName(saved.fullName);
    if (saved.email) setEmail(saved.email);
    if (saved.phone) setPhone(saved.phone);
    if (saved.country) setCountry(saved.country);
    if (saved.city) setCity(saved.city);
    if (saved.qualification) setQualification(saved.qualification);
    if (saved.license) setLicense(saved.license);
    if (saved.experience) setExperience(saved.experience);
    if (saved.specializations) setSpecializations(saved.specializations);
    if (saved.selectedLangs) setSelectedLangs(saved.selectedLangs);
    if (saved.otherLangText) setOtherLangText(saved.otherLangText);
    if (saved.daySlots) setDaySlots(saved.daySlots);
    if (saved.timezone) setTimezone(saved.timezone);
    if (saved.chatPrice) setChatPrice(saved.chatPrice);
    if (saved.voicePrice) setVoicePrice(saved.voicePrice);
    if (saved.videoPrice) setVideoPrice(saved.videoPrice);
    if (saved.currency) setCurrency(saved.currency);
    if (saved.bio) setBio(saved.bio);
    if (saved.photoUrl) setPhotoUrl(saved.photoUrl);
    if (saved.degreeUrl) setDegreeUrl(saved.degreeUrl);
    if (saved.licenseUrl) setLicenseUrl(saved.licenseUrl);
    if (saved.govIdUrl) setGovIdUrl(saved.govIdUrl);

    // Strict calculation of resume state to prevent jumping forward or backward incorrectly
    let nextStep = 1;
    if (saved.fullName && saved.email && saved.country) {
      nextStep = 2;
      if (saved.qualification) {
        nextStep = 3;
        if (saved.selectedLangs && saved.selectedLangs.length > 0) {
          nextStep = 4;
          if (saved.daySlots && Object.keys(saved.daySlots).length > 0) {
            nextStep = 5;
            if (saved.chatPrice && saved.voicePrice && saved.videoPrice) {
              nextStep = 6;
              if (saved.bio && saved.bio.length >= 100 && saved.photoUrl) {
                nextStep = 7;
                if (saved.degreeUrl && saved.licenseUrl && saved.govIdUrl) {
                  nextStep = 8;
                  if (lastCompleted >= 8) {
                    nextStep = 9;
                  }
                }
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
        .select('content').eq('audience_type', 'therapist').eq('is_published', true)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data) setTcContent(data.content);
      else setTcContent("Please agree to our standard platform terms and conditions.");
    }
    fetchTc();
  }, []);

  const toggleLang = (code) => setSelectedLangs((prev) =>
    prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code]
  );
  const toggleSpec = (s) => setSpecializations((prev) =>
    prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
  );

  const toggleDaySlot = (day) => {
    setDaySlots((prev) => {
      if (prev[day]) {
        const next = { ...prev };
        delete next[day];
        return next;
      }
      return { ...prev, [day]: { from: "09:00", to: "17:00" } };
    });
  };

  const updateDaySlot = (day, field, value) => {
    setDaySlots((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };

  const currencySymbol = CURRENCIES.find((c) => c.code === currency)?.symbol || "₹";
  const getLangLabel = (code) => LANGUAGES_LIST.find((l) => l.code === code)?.label || code;
  const allSelectedLangLabels = selectedLangs.map(getLangLabel);
  if (selectedLangs.includes("other") && otherLangText) {
    const extras = otherLangText.split(",").map((s) => s.trim()).filter(Boolean);
    allSelectedLangLabels.push(...extras);
  }

  const back = () => { if (step === 1) navigate("/complete-profile"); else setStep((s) => s - 1); };

  const continueStep = async (stepNum) => {
    if (!user) { navigate("/login"); return; }
    setSaving(true);

    const mergedStepData = {
      fullName, email, phone, country, city,
      qualification, license, experience, specializations,
      selectedLangs, otherLangText,
      daySlots, timezone,
      chatPrice, voicePrice, videoPrice, currency,
      bio, photoUrl,
      degreeUrl, licenseUrl, govIdUrl
    };

    // Ensure we never reduce the last_completed_step if they go back to edit
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

  const handleSubmit = async () => {
    if (!user) { navigate("/login"); return; }
    setSaving(true);
    try {
      const slug = fullName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const availDays = Object.keys(daySlots);
      const availTimes = Object.entries(daySlots).map(([d, t]) => `${d}: ${t.from}–${t.to}`);

      const langLabels = selectedLangs.filter((c) => c !== "other").map(getLangLabel);
      if (selectedLangs.includes("other") && otherLangText) {
        otherLangText.split(",").map((s) => s.trim()).filter(Boolean).forEach((l) => langLabels.push(l));
      }

      const { error: tError } = await supabase.from('therapist_profiles').upsert({
        user_id: user.id,
        full_name: fullName,
        phone,
        qualification,
        experience_years: parseInt(experience) || 0,
        specializations,
        languages: langLabels,
        available_days: availDays,
        available_times: availTimes,
        bio,
        profile_photo_url: photoUrl,
        gov_id_url: govIdUrl,
        certificates_url: degreeUrl,
        license_url: licenseUrl,
        chat_price: parseInt(chatPrice) || 0,
        voice_price: parseInt(voicePrice) || 0,
        video_price: parseInt(videoPrice) || 0,
        currency,
        approval_status: "pending",
        profile_complete: true,
        slug,
      }, { onConflict: 'user_id' });

      if (tError) throw tError;

      await supabase.from('user_profiles').update({
        selected_role: "therapist",
        profile_status: "completed",
        approval_status: "pending",
        last_completed_step: TOTAL_STEPS,
        total_steps: TOTAL_STEPS,
      }).eq('user_id', user.id);

      await refreshUserProfile();
      setStep(10); 
    } catch (err) {
      toast.error("Unable to insert record into therapist_profiles. " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (step === 10) return <TherapistSuccessScreen navigate={navigate} />;

  if (step === 1) return (
    <Layout step={step}>
      <StepCard stepNum={1} title="Let's Get to Know You" subtitle="Please enter your basic details."
        onBack={back}
        onContinue={() => continueStep(1)}
        continueDisabled={saving || !fullName || !email}
        continueLabel={saving ? "Saving..." : "Continue"}
        hideBack>
        <div className="space-y-3">
          <div><Label className="text-xs">Full Name *</Label><Input className="mt-1 text-sm h-9 rounded-lg" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name" /></div>
          <div><Label className="text-xs">Email Address *</Label><Input className="mt-1 text-sm h-9 rounded-lg" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" /></div>
          <div><Label className="text-xs">Phone Number</Label>
            <div className="flex gap-2 mt-1">
              <select className="text-xs border border-gray-200 rounded-lg px-2 h-9 bg-white w-20"><option>+91</option><option>+1</option><option>+44</option><option>+971</option><option>+65</option></select>
              <Input className="flex-1 text-sm h-9 rounded-lg" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your number" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Country</Label><Input className="mt-1 text-sm h-9 rounded-lg" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" /></div>
            <div><Label className="text-xs">City</Label><Input className="mt-1 text-sm h-9 rounded-lg" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" /></div>
          </div>
        </div>
      </StepCard>
    </Layout>
  );

  if (step === 2) return (
    <Layout step={step}>
      <StepCard stepNum={2} title="Your Professional Information" subtitle="Help us understand your expertise."
        onBack={back}
        onContinue={() => continueStep(2)}
        continueDisabled={saving || !qualification}
        continueLabel={saving ? "Saving..." : "Continue"}>
        <div className="space-y-3">
          <div><Label className="text-xs">Qualification *</Label><Input className="mt-1 text-sm h-9 rounded-lg" value={qualification} onChange={(e) => setQualification(e.target.value)} placeholder="e.g. M.A. Psychology" /></div>
          <div><Label className="text-xs">License / Certification (if applicable)</Label><Input className="mt-1 text-sm h-9 rounded-lg" value={license} onChange={(e) => setLicense(e.target.value)} placeholder="Enter license number" /></div>
          <div><Label className="text-xs">Years of Experience</Label><Input type="number" className="mt-1 text-sm h-9 rounded-lg" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="e.g. 5" /></div>
          <div>
            <Label className="text-xs">Specialization (select all that apply)</Label>
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {SPECIALIZATIONS.map((s) => (
                <CheckToggle key={s} label={s} selected={specializations.includes(s)} onClick={() => toggleSpec(s)} />
              ))}
            </div>
          </div>
        </div>
      </StepCard>
    </Layout>
  );

  if (step === 3) {
    const filtered = LANGUAGES_LIST.filter((l) =>
      l.label.toLowerCase().includes(langSearch.toLowerCase())
    );
    return (
      <Layout step={step}>
        <StepCard stepNum={3} title="Languages You Speak" subtitle="Select all languages you are comfortable conducting sessions in."
          onBack={back}
          onContinue={() => continueStep(3)}
          continueDisabled={saving || selectedLangs.filter((c) => c !== "other").length === 0}
          continueLabel={saving ? "Saving..." : "Continue"}>
          <div className="space-y-3">
            <Input
              className="text-sm h-9 rounded-lg"
              placeholder="Search languages..."
              value={langSearch}
              onChange={(e) => setLangSearch(e.target.value)}
            />
            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
              {filtered.map((l) => (
                <CheckToggle key={l.code} label={l.label} selected={selectedLangs.includes(l.code)} onClick={() => toggleLang(l.code)} />
              ))}
            </div>
            {selectedLangs.includes("other") && (
              <div>
                <Label className="text-xs">Enter other languages (comma-separated)</Label>
                <Input
                  className="mt-1 text-sm h-9 rounded-lg"
                  placeholder="e.g. Tulu, Konkani, Dogri"
                  value={otherLangText}
                  onChange={(e) => setOtherLangText(e.target.value)}
                />
              </div>
            )}
            {selectedLangs.length > 0 && (
              <div className="p-2.5 bg-primary/5 rounded-lg text-xs text-primary">
                <span className="font-semibold">Selected: </span>
                {allSelectedLangLabels.join(", ")}
              </div>
            )}
          </div>
        </StepCard>
      </Layout>
    );
  }

  if (step === 4) {
    const selectedDays = Object.keys(daySlots);
    return (
      <Layout step={step}>
        <StepCard stepNum={4} title="Your Availability" subtitle="Set your available hours for each day. This step is required."
          onBack={back}
          onContinue={() => continueStep(4)}
          continueDisabled={saving || selectedDays.length === 0}
          continueLabel={saving ? "Saving..." : "Continue"}>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">Please select at least one day with available hours to proceed.</p>
            </div>

            <div className="space-y-2">
              {DAYS_FULL.map(({ short, full }) => {
                const isActive = !!daySlots[short];
                return (
                  <div key={short} className={`rounded-xl border transition-all ${isActive ? "border-primary bg-primary/5" : "border-gray-200 bg-white"}`}>
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <button
                        onClick={() => toggleDaySlot(short)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${isActive ? "bg-primary border-primary" : "border-gray-300"}`}
                      >
                        {isActive && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <span className={`text-sm font-medium flex-1 ${isActive ? "text-primary" : "text-gray-700"}`}>{full}</span>
                      {isActive && (
                        <span className="text-xs text-primary">{daySlots[short].from} – {daySlots[short].to}</span>
                      )}
                    </div>
                    {isActive && (
                      <div className="px-3 pb-3 flex items-center gap-2">
                        <div className="flex-1">
                          <Label className="text-[10px] text-gray-500">From</Label>
                          <select
                            className="mt-0.5 w-full text-xs border border-gray-200 rounded-lg px-2 h-8 bg-white"
                            value={daySlots[short].from}
                            onChange={(e) => updateDaySlot(short, "from", e.target.value)}
                          >
                            {TIME_HOURS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                        <span className="text-xs text-gray-400 mt-4">to</span>
                        <div className="flex-1">
                          <Label className="text-[10px] text-gray-500">To</Label>
                          <select
                            className="mt-0.5 w-full text-xs border border-gray-200 rounded-lg px-2 h-8 bg-white"
                            value={daySlots[short].to}
                            onChange={(e) => updateDaySlot(short, "to", e.target.value)}
                          >
                            {TIME_HOURS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div>
              <Label className="text-xs">Timezone</Label>
              <select className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 h-9 bg-white" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
              </select>
            </div>
          </div>
        </StepCard>
      </Layout>
    );
  }

  if (step === 5) return (
    <Layout step={step}>
      <StepCard stepNum={5} title="Session Pricing" subtitle="Set your fees for different support methods."
        onBack={back}
        onContinue={() => continueStep(5)}
        continueDisabled={saving || !chatPrice || !voicePrice || !videoPrice}
        continueLabel={saving ? "Saving..." : "Continue"}>
        <div className="space-y-4">
          <div>
            <Label className="text-xs mb-2 block">Service Availability Details</Label>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between border-b border-primary/10 pb-2">
                <span className="text-sm font-medium text-gray-800 flex items-center gap-1"><MessageCircle className="w-4 h-4 text-primary" /> Chat Package</span>
                <span className="text-xs text-gray-500">Valid for 7 days</span>
              </div>
              <div className="flex items-center justify-between border-b border-primary/10 pb-2">
                <span className="text-sm font-medium text-gray-800 flex items-center gap-1"><Phone className="w-4 h-4 text-primary" /> Voice Package</span>
                <span className="text-xs text-gray-500">Chat + 4 calls in 7 days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800 flex items-center gap-1"><Video className="w-4 h-4 text-primary" /> Video Package</span>
                <span className="text-xs text-gray-500">Chat + Voice + 3 days Video</span>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1 block">Set Your Pricing</Label>
            <select className="text-xs border border-gray-200 rounded-lg px-2 h-9 bg-white w-full mb-3" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} {c.symbol}</option>)}
            </select>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Label className="text-xs w-24">Chat Support *</Label>
                <Input className="flex-1 text-sm h-9 rounded-lg" type="number" value={chatPrice} onChange={(e) => setChatPrice(e.target.value)} placeholder="Amount" />
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-xs w-24">Voice Support *</Label>
                <Input className="flex-1 text-sm h-9 rounded-lg" type="number" value={voicePrice} onChange={(e) => setVoicePrice(e.target.value)} placeholder="Amount" />
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-xs w-24">Video Support *</Label>
                <Input className="flex-1 text-sm h-9 rounded-lg" type="number" value={videoPrice} onChange={(e) => setVideoPrice(e.target.value)} placeholder="Amount" />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">Pricing is subject to Super Admin approval. You may negotiate this during the review phase.</p>
          </div>
        </div>
      </StepCard>
    </Layout>
  );

  if (step === 6) {
    const BIO_MIN = 100;
    const BIO_MAX = 500;
    const bioLen = bio.length;
    return (
      <Layout step={step}>
        <StepCard stepNum={6} title="Tell Us About Yourself" subtitle="Write a professional bio that helps clients connect with you."
          onBack={back}
          onContinue={() => continueStep(6)}
          continueDisabled={saving || bioLen < BIO_MIN || !photoUrl}
          continueLabel={saving ? "Saving..." : "Continue"}>
          <div className="space-y-3">
            <PhotoUpload value={photoUrl} onChange={setPhotoUrl} />
            {!photoUrl && <p className="text-[10px] text-red-500">Profile photo is required.</p>}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
              <p className="font-semibold mb-1.5 flex items-center gap-1"><Info className="w-3.5 h-3.5" /> Tips for a great bio:</p>
              <ul className="space-y-1 list-disc list-inside text-blue-600">
                <li>Mention your therapeutic approach (CBT, mindfulness, etc.)</li>
                <li>Share what types of clients you specialize in</li>
                <li>Describe what a typical session with you looks like</li>
                <li>Use a warm, approachable tone</li>
              </ul>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Short Bio *</Label>
                <span className={`text-[10px] ${bioLen < BIO_MIN ? "text-red-400" : bioLen > BIO_MAX ? "text-amber-500" : "text-primary"}`}>
                  {bioLen} / {BIO_MAX}
                </span>
              </div>
              <Textarea
                className="text-sm rounded-lg resize-none"
                rows={5}
                maxLength={BIO_MAX}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write your professional introduction here..."
              />
              {bioLen < BIO_MIN && <p className="text-[10px] text-red-400 mt-1">Minimum {BIO_MIN} characters required. ({BIO_MIN - bioLen} more needed)</p>}
            </div>
          </div>
        </StepCard>
      </Layout>
    );
  }

  if (step === 7) {
    const allUploaded = degreeUrl && licenseUrl && govIdUrl;
    return (
      <Layout step={step}>
        <StepCard stepNum={7} title="Document Verification" subtitle="All three documents are required to proceed."
          onBack={back}
          onContinue={() => continueStep(7)}
          continueDisabled={saving || !allUploaded}
          continueLabel={saving ? "Saving..." : "Continue"}>
          <div className="space-y-4">
            {!allUploaded && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">Please upload all 3 required documents to continue.</p>
              </div>
            )}

            <FileUploadField label="Degree / Education Certificate" value={degreeUrl} onChange={setDegreeUrl} required />
            <FileUploadField label="Professional License / Certification" value={licenseUrl} onChange={setLicenseUrl} required />
            <FileUploadField label="Government ID" value={govIdUrl} onChange={setGovIdUrl} required />

            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <span>🔒</span>
              <span>All documents are encrypted and stored securely. Only reviewed by our admin team.</span>
            </div>
          </div>
        </StepCard>
      </Layout>
    );
  }

  if (step === 8) {
    const availDays = Object.keys(daySlots);
    const availTimes = Object.entries(daySlots).map(([d, t]) => `${d}: ${t.from}–${t.to}`);

    const sections = [
      {
        title: "Basic Details",
        goTo: 1,
        rows: [
          { label: "Name", value: fullName },
          { label: "Email", value: email },
          { label: "Phone", value: phone || "—" },
        ],
      },
      {
        title: "Professional Info",
        goTo: 2,
        rows: [
          { label: "Qualification", value: qualification },
          { label: "Experience", value: experience ? `${experience} years` : "—" },
          { label: "Specializations", value: specializations.join(", ") || "—" },
        ],
      },
      {
        title: "Availability",
        goTo: 4,
        rows: [
          { label: "Available Days", value: availDays.join(", ") || "—" },
          { label: "Timezone", value: timezone },
        ],
      },
      {
        title: "Pricing",
        goTo: 5,
        rows: [
          { label: "Chat Support", value: chatPrice ? `${currencySymbol}${chatPrice}` : "—" },
          { label: "Voice Support", value: voicePrice ? `${currencySymbol}${voicePrice}` : "—" },
          { label: "Video Support", value: videoPrice ? `${currencySymbol}${videoPrice}` : "—" },
        ],
      },
    ];

    return (
      <Layout step={step}>
        <div className="max-w-lg mx-auto w-full">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-primary/5 border-b border-gray-100 px-5 py-3 flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] text-primary font-semibold uppercase tracking-wide">BreathingPlace</span>
              </div>
              <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 ml-auto">8</span>
            </div>
            <div className="px-5 pt-4 pb-3">
              <h2 className="font-display text-base font-bold text-gray-900 mb-0.5">Review Profile</h2>
              <p className="text-xs text-gray-500 mb-4">Please review your information. Click the edit icon to make changes.</p>

              <div className="space-y-4">
                {photoUrl && (
                  <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                    <img src={photoUrl} alt="Profile" className="w-12 h-12 rounded-xl object-cover border border-gray-200" />
                    <div>
                      <p className="font-semibold text-sm">{fullName}</p>
                      <p className="text-xs text-gray-400">{qualification}</p>
                    </div>
                  </div>
                )}

                {sections.map((section) => (
                  <div key={section.title}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">{section.title}</h3>
                      <button
                        onClick={() => setStep(section.goTo)}
                        className="text-[10px] text-primary flex items-center gap-0.5 hover:underline"
                      >
                        <Pencil className="w-2.5 h-2.5" /> Edit
                      </button>
                    </div>
                    <div className="bg-gray-50 rounded-lg overflow-hidden">
                      {section.rows.map((row) => (
                        <div key={row.label} className="flex items-start justify-between gap-2 px-3 py-2 border-b border-gray-100 last:border-0">
                          <span className="text-[11px] text-gray-400 flex-shrink-0 w-24">{row.label}</span>
                          <span className="text-[11px] font-medium text-gray-800 text-right">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2 pt-4">
              <Button variant="outline" size="sm" className="flex-shrink-0 rounded-lg" onClick={back}>
                <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                className="flex-1 rounded-lg bg-primary text-white font-semibold text-sm"
                size="sm"
                onClick={() => continueStep(8)}
                disabled={saving}
              >
                Continue to Terms
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Step 9 — Terms & Conditions
  if (step === 9) {
    return (
      <Layout step={step}>
        <StepCard stepNum={9} title="Terms & Conditions" subtitle="Please read and accept our platform terms before submitting."
          onBack={back}
          onContinue={handleSubmit}
          continueDisabled={saving || !tcAccepted}
          continueLabel={saving ? "Submitting..." : "Accept & Submit Application"}>
          
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
                I have read and agree to the Therapist Terms & Conditions.
              </span>
            </label>
          </div>
        </StepCard>
      </Layout>
    );
  }
}