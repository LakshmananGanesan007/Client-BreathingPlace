import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Check, ArrowLeft, Heart, Upload, Camera, Loader2, 
  CheckCircle2, Info, AlertCircle, Pencil, MessageCircle, 
  Phone, Video, ShieldAlert
} from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";

const TOTAL_STEPS = 9;

// Removed OCD and ADHD as requested
const SPECIALIZATIONS = [
  "Anxiety", "Depression", "Relationship Counseling", "Couples Therapy",
  "Trauma Healing", "Career Guidance", "Youth Counseling", "Child Psychology",
  "Addiction Recovery", "Grief & Loss", "Other"
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

const COUNTRY_CODES = [
  { code: "+91", country: "India (IN)" },
  { code: "+1", country: "US/Canada" },
  { code: "+44", country: "UK" },
  { code: "+971", country: "UAE" },
  { code: "+65", country: "Singapore" },
  { code: "+61", country: "Australia" },
];

const TIMEZONES = [
  "Asia/Kolkata", "America/New_York", "America/Los_Angeles", "Europe/London", 
  "Europe/Paris", "Asia/Dubai", "Asia/Singapore", "Australia/Sydney", "UTC"
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

// --- Custom Hook for Debounced Saving ---
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// --- Shared Components ---
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

function FileUploadField({ label, value, onChange, required, hint, accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png" }) {
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
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const isImage = value && (value.match(/\.(jpg|jpeg|png|gif|webp)$/i) || value.includes("image"));

  return (
    <div>
      <div className="flex items-center gap-1 mb-1">
        <Label className="text-xs text-gray-600 font-medium">{label}</Label>
        {required && <span className="text-red-500 text-xs">*</span>}
      </div>
      {hint && <p className="text-[10px] text-gray-400 mb-2 leading-tight">{hint}</p>}
      
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
          className="flex flex-col items-center justify-center gap-2 px-3 py-5 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 hover:border-primary hover:text-primary hover:bg-primary/5 cursor-pointer transition-all text-xs"
        >
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          <span className="font-medium">{uploading ? "Uploading securely..." : `Click to upload`}</span>
          <span className="text-[10px] text-gray-400">PDF, JPG, PNG allowed (Max 10MB)</span>
        </div>
      )}
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={handleFile} disabled={uploading} />
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
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div onClick={() => !uploading && ref.current?.click()} className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-primary overflow-hidden relative flex-shrink-0">
        {value ? <img src={value} alt="Photo" className="w-full h-full object-cover" /> : <Camera className="w-5 h-5 text-gray-400" />}
        {uploading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 className="w-4 h-4 text-white animate-spin" /></div>}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
      <button type="button" disabled={uploading} onClick={() => ref.current?.click()} className="text-xs text-primary hover:underline disabled:opacity-50 font-medium">{value ? "Change Photo" : "Upload Professional Photo"}</button>
    </div>
  );
}

function CheckToggle({ label, selected, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left text-sm transition-all ${selected ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-gray-200 bg-white hover:border-gray-300 text-gray-700"}`}>
      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected ? "bg-primary border-primary" : "border-gray-300 bg-white"}`}>
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
          <p className="text-xs text-gray-500 font-medium">Step {step} of {TOTAL_STEPS}</p>
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
              Our administrative team will review your profile and verify your uploaded documents. You will be notified once your profile is approved.
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

  // Form States
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  
  const [qualification, setQualification] = useState("");
  const [certificationNumber, setCertificationNumber] = useState("");
  const [experience, setExperience] = useState("");
  const [specializations, setSpecializations] = useState([]);
  
  const [selectedLangs, setSelectedLangs] = useState([]);
  const [langSearch, setLangSearch] = useState("");
  const [otherLangText, setOtherLangText] = useState("");
  
  const [alwaysAvailable, setAlwaysAvailable] = useState(false);
  const [daySlots, setDaySlots] = useState({});
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  
  const [acceptChatTerms, setAcceptChatTerms] = useState(false);
  const [videoPrice, setVideoPrice] = useState("");
  
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  
  const [degreeUrl, setDegreeUrl] = useState("");
  const [certUrl, setCertUrl] = useState("");
  const [govIdUrl, setGovIdUrl] = useState("");
  const [profLicenseUrl, setProfLicenseUrl] = useState(""); // Optional

  const [tcAccepted, setTcAccepted] = useState(false);
  const [tcContent, setTcContent] = useState("");

  // Object tracking all fields for auto-save
  const currentFormData = {
    fullName, email, countryCode, phone, country, city,
    qualification, certificationNumber, experience, specializations,
    selectedLangs, otherLangText,
    alwaysAvailable, daySlots, timezone,
    acceptChatTerms, videoPrice,
    bio, photoUrl,
    degreeUrl, certUrl, govIdUrl, profLicenseUrl, tcAccepted
  };

  const debouncedData = useDebounce(currentFormData, 1500);

  // Background Auto-save Effect
  useEffect(() => {
    if (!initialized || !user) return;
    const autoSave = async () => {
      try {
        await supabase.from('user_profiles').update({
          step_data: debouncedData,
          updated_at: new Date().toISOString()
        }).eq('user_id', user.id);
      } catch (err) {
        console.error("Auto-save failed", err);
      }
    };
    autoSave();
  }, [debouncedData, initialized, user]);

  // Load Saved Data on Mount
  useEffect(() => {
    if (!userProfile || initialized) return;
    const saved = (userProfile.step_data && typeof userProfile.step_data === "object") ? userProfile.step_data : {};
    const lastCompleted = userProfile.last_completed_step || 0;

    if (saved.fullName) setFullName(saved.fullName);
    if (saved.email) setEmail(saved.email);
    if (saved.countryCode) setCountryCode(saved.countryCode);
    if (saved.phone) setPhone(saved.phone);
    if (saved.country) setCountry(saved.country);
    if (saved.city) setCity(saved.city);
    
    if (saved.qualification) setQualification(saved.qualification);
    if (saved.certificationNumber) setCertificationNumber(saved.certificationNumber);
    if (saved.experience) setExperience(saved.experience);
    if (saved.specializations) setSpecializations(saved.specializations);
    
    if (saved.selectedLangs) setSelectedLangs(saved.selectedLangs);
    if (saved.otherLangText) setOtherLangText(saved.otherLangText);
    
    if (saved.alwaysAvailable !== undefined) setAlwaysAvailable(saved.alwaysAvailable);
    if (saved.daySlots) setDaySlots(saved.daySlots);
    if (saved.timezone) setTimezone(saved.timezone);
    
    if (saved.acceptChatTerms) setAcceptChatTerms(saved.acceptChatTerms);
    if (saved.videoPrice) setVideoPrice(saved.videoPrice);
    
    if (saved.bio) setBio(saved.bio);
    if (saved.photoUrl) setPhotoUrl(saved.photoUrl);
    
    if (saved.degreeUrl) setDegreeUrl(saved.degreeUrl);
    if (saved.certUrl) setCertUrl(saved.certUrl);
    if (saved.govIdUrl) setGovIdUrl(saved.govIdUrl);
    if (saved.profLicenseUrl) setProfLicenseUrl(saved.profLicenseUrl);
    if (saved.tcAccepted) setTcAccepted(saved.tcAccepted);

    // Calculate Resume Step
    let nextStep = 1;
    if (saved.fullName && saved.email && saved.phone && saved.country) {
      nextStep = 2;
      if (saved.qualification && saved.experience) {
        nextStep = 3;
        if (saved.selectedLangs && saved.selectedLangs.length >= 2) {
          nextStep = 4;
          if (saved.alwaysAvailable || (saved.daySlots && Object.keys(saved.daySlots).length >= 2)) {
            nextStep = 5;
            if (saved.acceptChatTerms && saved.videoPrice) {
              nextStep = 6;
              if (saved.bio && saved.bio.length >= 100 && saved.photoUrl) {
                nextStep = 7;
                if (saved.degreeUrl && saved.certUrl && saved.govIdUrl) {
                  nextStep = 8;
                  if (lastCompleted >= 8) nextStep = 9;
                }
              }
            }
          }
        }
      }
    }

    setStep(lastCompleted > 0 && lastCompleted > nextStep ? lastCompleted : nextStep);
    setInitialized(true);
  }, [userProfile, initialized]);

  // Fetch Terms and Conditions
  useEffect(() => {
    async function fetchTc() {
      const { data } = await supabase.from('terms_and_conditions')
        .select('content').eq('audience_type', 'therapist').eq('is_published', true)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data) setTcContent(data.content);
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

  const getLangLabel = (code) => LANGUAGES_LIST.find((l) => l.code === code)?.label || code;
  const allSelectedLangLabels = selectedLangs.map(getLangLabel);
  if (selectedLangs.includes("other") && otherLangText) {
    const extras = otherLangText.split(",").map((s) => s.trim()).filter(Boolean);
    allSelectedLangLabels.push(...extras);
  }

  // Regex validations
  const isQualificationValid = (qual) => /^(?![0-9]+$)(?![^a-zA-Z0-9]+$)[a-zA-Z0-9\s.,'-]{2,}$/.test(qual);
  const isPhoneValid = (num) => /^[0-9]{7,15}$/.test(num.replace(/\D/g, ''));

  const back = () => { if (step === 1) navigate("/complete-profile"); else setStep((s) => s - 1); };

  const continueStep = async (stepNum) => {
    if (!user) { navigate("/login"); return; }
    
    // Hard Validation checks before proceeding
    if (stepNum === 1 && !isPhoneValid(phone)) {
      toast.error("Please enter a valid international phone number.");
      return;
    }
    if (stepNum === 2 && !isQualificationValid(qualification)) {
      toast.error("Please enter a valid qualification degree.");
      return;
    }

    setSaving(true);
    const currentLastStep = userProfile?.last_completed_step || 0;
    const newLastStep = Math.max(currentLastStep, stepNum);

    try {
      await supabase.from('user_profiles').update({
        step_data: currentFormData,
        last_completed_step: newLastStep,
        updated_at: new Date().toISOString()
      }).eq('user_id', user.id);

      if (userProfile) {
        userProfile.step_data = currentFormData;
        userProfile.last_completed_step = newLastStep;
      }
      setStep(stepNum + 1);
    } catch (err) {
      toast.error("Failed to save progress to server.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) { navigate("/login"); return; }
    setSaving(true);
    try {
      const slug = fullName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const availDays = alwaysAvailable ? ["Always Available"] : Object.keys(daySlots);
      const availTimes = alwaysAvailable ? ["24/7"] : Object.entries(daySlots).map(([d, t]) => `${d}: ${t.from}–${t.to}`);

      const langLabels = selectedLangs.filter((c) => c !== "other").map(getLangLabel);
      if (selectedLangs.includes("other") && otherLangText) {
        otherLangText.split(",").map((s) => s.trim()).filter(Boolean).forEach((l) => langLabels.push(l));
      }

      const fullPhone = `${countryCode}${phone}`;

      const { error: tError } = await supabase.from('therapist_profiles').upsert({
        user_id: user.id,
        full_name: fullName,
        phone: fullPhone,
        qualification,
        certification_number: certificationNumber,
        experience_years: parseInt(experience) || 0,
        specializations,
        languages: langLabels,
        always_available: alwaysAvailable,
        available_days: availDays,
        available_times: availTimes,
        bio,
        profile_photo_url: photoUrl,
        gov_id_url: govIdUrl,
        certificates_url: certUrl, // Primary certification
        degree_url: degreeUrl, // Degree mapped
        license_url: profLicenseUrl || null, // Optional
        video_price: parseInt(videoPrice) || 0,
        chat_price: 0, // Managed strictly by system now
        voice_price: 0, // Disabled
        currency: "INR",
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
      toast.error("Unable to submit application. " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // --- Render Views ---

  if (step === 10) return <TherapistSuccessScreen navigate={navigate} />;

  if (step === 1) return (
    <Layout step={step}>
      <StepCard stepNum={1} title="Let's Get to Know You" subtitle="Please enter your basic details."
        onBack={back}
        onContinue={() => continueStep(1)}
        continueDisabled={saving || !fullName || !email || !phone}
        continueLabel={saving ? "Saving..." : "Continue"}
        hideBack>
        <div className="space-y-4">
          <div><Label className="text-xs">Full Name *</Label><Input className="mt-1 text-sm h-10 rounded-lg" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name" /></div>
          <div><Label className="text-xs">Email Address *</Label><Input className="mt-1 text-sm h-10 rounded-lg bg-gray-50" type="email" value={email} readOnly /></div>
          <div><Label className="text-xs">Phone Number *</Label>
            <div className="flex gap-2 mt-1">
              <select 
                className="text-sm border border-gray-200 rounded-lg px-2 h-10 bg-white w-[110px]"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
              >
                {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.code} {c.country}</option>)}
              </select>
              <Input className="flex-1 text-sm h-10 rounded-lg" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your number" />
            </div>
            <p className="text-[10px] text-gray-500 mt-1">We will use this to notify you about bookings.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Country *</Label><Input className="mt-1 text-sm h-10 rounded-lg" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" /></div>
            <div><Label className="text-xs">City</Label><Input className="mt-1 text-sm h-10 rounded-lg" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" /></div>
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
        continueDisabled={saving || !qualification || !experience}
        continueLabel={saving ? "Saving..." : "Continue"}>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Qualification *</Label>
            <Input className="mt-1 text-sm h-10 rounded-lg" value={qualification} onChange={(e) => setQualification(e.target.value)} placeholder="e.g. M.A. Psychology, MSW" />
            <p className="text-[10px] text-gray-400 mt-1">Provide your full official degree name. Admin verification required.</p>
          </div>
          <div>
            <Label className="text-xs">Certification Number</Label>
            <Input className="mt-1 text-sm h-10 rounded-lg" value={certificationNumber} onChange={(e) => setCertificationNumber(e.target.value)} placeholder="Enter certification number (if any)" />
          </div>
          <div>
            <Label className="text-xs">Years of Experience *</Label>
            <Input type="number" min="0" className="mt-1 text-sm h-10 rounded-lg" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="e.g. 5" />
          </div>
          <div>
            <Label className="text-xs mb-2 block">Specialization (select all that apply)</Label>
            <div className="grid grid-cols-2 gap-2">
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
    const filtered = LANGUAGES_LIST.filter((l) => l.label.toLowerCase().includes(langSearch.toLowerCase()));
    const totalSelectedCount = selectedLangs.length;
    
    return (
      <Layout step={step}>
        <StepCard stepNum={3} title="Languages You Speak" subtitle="Select all languages you are comfortable conducting sessions in."
          onBack={back}
          onContinue={() => continueStep(3)}
          continueDisabled={saving || totalSelectedCount < 2}
          continueLabel={saving ? "Saving..." : "Continue"}>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 leading-relaxed">
                Please select only the languages you can professionally communicate in. Clients will be assigned based on your selected languages. Minimum 2 languages required.
              </p>
            </div>

            <Input
              className="text-sm h-10 rounded-lg bg-gray-50 border-gray-200"
              placeholder="Search languages..."
              value={langSearch}
              onChange={(e) => setLangSearch(e.target.value)}
            />
            
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
              {filtered.map((l) => (
                <CheckToggle key={l.code} label={l.label} selected={selectedLangs.includes(l.code)} onClick={() => toggleLang(l.code)} />
              ))}
            </div>
            
            {selectedLangs.includes("other") && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <Label className="text-xs text-gray-700">Enter other languages (comma-separated)</Label>
                <Input
                  className="mt-1.5 text-sm h-9 rounded-md bg-white"
                  placeholder="e.g. Tulu, Konkani, Dogri"
                  value={otherLangText}
                  onChange={(e) => setOtherLangText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                />
              </div>
            )}
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 font-medium">Selected Languages: {totalSelectedCount}</span>
              {totalSelectedCount < 2 && <span className="text-red-500 font-medium">Select at least {2 - totalSelectedCount} more</span>}
            </div>
          </div>
        </StepCard>
      </Layout>
    );
  }

  if (step === 4) {
    const selectedDays = Object.keys(daySlots);
    const hasEnoughDays = selectedDays.length >= 2;
    const canProceed = alwaysAvailable || hasEnoughDays;

    return (
      <Layout step={step}>
        <StepCard stepNum={4} title="Your Availability & Timezone" subtitle="Set your available hours to match with clients."
          onBack={back}
          onContinue={() => continueStep(4)}
          continueDisabled={saving || !canProceed}
          continueLabel={saving ? "Saving..." : "Continue"}>
          <div className="space-y-5">
            
            <div>
              <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Your Timezone</Label>
              <select className="w-full text-sm border border-gray-200 rounded-xl px-3 h-10 bg-white focus:ring-primary focus:border-primary" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>)}
              </select>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <Label className="text-xs font-semibold text-gray-700 mb-2 block">Weekly Availability</Label>
              
              <label className={`flex items-center gap-3 p-3 rounded-xl border mb-3 cursor-pointer transition-all ${alwaysAvailable ? "bg-primary/5 border-primary" : "bg-white border-gray-200 hover:border-gray-300"}`}>
                <input 
                  type="checkbox" 
                  className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                  checked={alwaysAvailable}
                  onChange={(e) => {
                    setAlwaysAvailable(e.target.checked);
                    if (e.target.checked) setDaySlots({}); // clear specific slots
                  }}
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 block">I am Always Available</span>
                  <span className="text-[10px] text-gray-500">I will manage my own schedule dynamically</span>
                </div>
              </label>

              {!alwaysAvailable && (
                <>
                  {!hasEnoughDays && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2 mb-3">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">Please select at least two days with available hours to proceed.</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {DAYS_FULL.map(({ short, full }) => {
                      const isActive = !!daySlots[short];
                      return (
                        <div key={short} className={`rounded-xl border transition-all ${isActive ? "border-primary bg-primary/5 shadow-sm" : "border-gray-200 bg-white"}`}>
                          <div className="flex items-center gap-3 px-3 py-2.5">
                            <button
                              onClick={() => toggleDaySlot(short)}
                              className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${isActive ? "bg-primary border-primary" : "border-gray-300 bg-white"}`}
                            >
                              {isActive && <Check className="w-3 h-3 text-white" />}
                            </button>
                            <span className={`text-sm font-medium flex-1 ${isActive ? "text-primary" : "text-gray-700"}`}>{full}</span>
                            {isActive && (
                              <span className="text-xs text-primary font-medium bg-white px-2 py-0.5 rounded border border-primary/20">
                                {daySlots[short].from} – {daySlots[short].to}
                              </span>
                            )}
                          </div>
                          {isActive && (
                            <div className="px-3 pb-3 pt-1 flex items-center gap-3">
                              <div className="flex-1">
                                <Label className="text-[10px] text-gray-500 font-medium">From</Label>
                                <select
                                  className="mt-0.5 w-full text-xs border border-gray-200 rounded-lg px-2 h-9 bg-white focus:border-primary"
                                  value={daySlots[short].from}
                                  onChange={(e) => updateDaySlot(short, "from", e.target.value)}
                                >
                                  {TIME_HOURS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                              </div>
                              <span className="text-xs text-gray-400 mt-5">to</span>
                              <div className="flex-1">
                                <Label className="text-[10px] text-gray-500 font-medium">To</Label>
                                <select
                                  className="mt-0.5 w-full text-xs border border-gray-200 rounded-lg px-2 h-9 bg-white focus:border-primary"
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
                </>
              )}
            </div>
          </div>
        </StepCard>
      </Layout>
    );
  }

  if (step === 5) return (
    <Layout step={step}>
      <StepCard stepNum={5} title="Service & Compensation Details" subtitle="Review platform policies and set your base video fee."
        onBack={back}
        onContinue={() => continueStep(5)}
        continueDisabled={saving || !acceptChatTerms || !videoPrice}
        continueLabel={saving ? "Saving..." : "Continue"}>
        <div className="space-y-5">
          
          {/* Chat Service Details */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              <Label className="text-sm font-semibold text-gray-900">Chat Support Policy</Label>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-700 leading-relaxed space-y-2">
              <p>• You must provide a free <strong>15-minute chat session</strong> for all first-time customers.</p>
              <p>• After the first 15 minutes, if the customer chooses to continue, you will earn <strong>₹110 for every additional 20-minute chat session.</strong></p>
              <p>• The amount is controlled by the Super Admin and may be updated in the future.</p>
              <p>• Once a paid 20-minute chat session ends, the system will automatically close the chat.</p>
              <p>• For returning customers, only a <strong>10-minute free chat</strong> is provided. If they continue after the free period, the same paid 20-minute session rules apply.</p>
            </div>
            <label className="flex items-start gap-3 mt-3 cursor-pointer group">
              <input 
                type="checkbox" 
                className="mt-0.5 w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                checked={acceptChatTerms}
                onChange={(e) => setAcceptChatTerms(e.target.checked)}
              />
              <span className="text-sm text-gray-800 font-medium group-hover:text-primary transition-colors">I accept the Chat Support Policy & Fee Structure *</span>
            </label>
          </div>

          <hr className="border-gray-100" />

          {/* Voice Service Details */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <Label className="text-sm font-semibold text-gray-500">Voice Support</Label>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <span className="text-xs font-medium text-gray-500 italic">Voice Support will be enabled soon.</span>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Video Service Details */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Video className="w-4 h-4 text-primary" />
              <Label className="text-sm font-semibold text-gray-900">Video Support Setup</Label>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-gray-800 mb-3 space-y-1.5 leading-relaxed">
              <p>• Video consultation sessions are strictly limited to <strong>45–50 minutes.</strong></p>
              <p>• Sessions exceeding 50 minutes will automatically end. You will be notified at the 45-minute mark.</p>
              <p>• Chating is disabled during active video calls.</p>
              <p className="text-primary font-medium mt-2">Enter your professional consultation fee below. (Subject to admin approval/adjustment to set base pricing).</p>
            </div>
            
            <div>
              <Label className="text-xs font-medium mb-1 block">Video Consultation Fee (per 45-50 min session) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                <Input 
                  className="pl-8 text-sm h-10 rounded-lg" 
                  type="number" 
                  min="0"
                  value={videoPrice} 
                  onChange={(e) => setVideoPrice(e.target.value)} 
                  placeholder="Amount in INR" 
                />
              </div>
            </div>
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
          <div className="space-y-4">
            <PhotoUpload value={photoUrl} onChange={setPhotoUrl} />
            {!photoUrl && <p className="text-[10px] text-red-500 font-medium">A clear, professional profile photo is required.</p>}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 leading-relaxed">
              <p className="font-semibold mb-1.5 flex items-center gap-1.5"><Info className="w-4 h-4" /> Tips for a great bio:</p>
              <ul className="space-y-1 list-disc list-inside text-blue-700 ml-1">
                <li>Mention your therapeutic approach (CBT, mindfulness, etc.)</li>
                <li>Share what types of clients you specialize in</li>
                <li>Describe what a typical session with you looks like</li>
                <li>Use a warm, approachable, and professional tone</li>
              </ul>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs font-semibold text-gray-800">Short Professional Bio *</Label>
                <span className={`text-[10px] font-medium ${bioLen < BIO_MIN ? "text-red-500" : bioLen > BIO_MAX ? "text-amber-500" : "text-primary"}`}>
                  {bioLen} / {BIO_MAX}
                </span>
              </div>
              <Textarea
                className="text-sm rounded-lg resize-none h-32 focus:ring-primary focus:border-primary"
                maxLength={BIO_MAX}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write your professional introduction here..."
              />
              {bioLen < BIO_MIN && <p className="text-[10px] text-red-500 mt-1 font-medium">Minimum {BIO_MIN} characters required. ({BIO_MIN - bioLen} more needed)</p>}
            </div>
          </div>
        </StepCard>
      </Layout>
    );
  }

  if (step === 7) {
    const requiredDocsUploaded = degreeUrl && certUrl && govIdUrl;
    return (
      <Layout step={step}>
        <StepCard stepNum={7} title="Document Verification" subtitle="Upload documents to verify your credentials."
          onBack={back}
          onContinue={() => continueStep(7)}
          continueDisabled={saving || !requiredDocsUploaded}
          continueLabel={saving ? "Saving..." : "Continue"}>
          <div className="space-y-5">
            
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div className="text-xs text-red-800 leading-relaxed">
                <p className="font-semibold mb-0.5">Strict Upload Policy</p>
                <p>Only valid official documents will be accepted. Selfies, social media pictures, screenshots, or irrelevant files will result in immediate rejection during the admin review phase.</p>
              </div>
            </div>

            {!requiredDocsUploaded && (
              <p className="text-xs font-medium text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                Please upload all 3 required documents below to continue.
              </p>
            )}

            <div className="space-y-4">
              <FileUploadField 
                label="Degree / Education Certificate" 
                hint="Upload your primary psychological or medical degree."
                value={degreeUrl} onChange={setDegreeUrl} required />
              
              <FileUploadField 
                label="Upload Certification" 
                hint="Official certificate linking to the Certification Number provided earlier."
                value={certUrl} onChange={setCertUrl} required />
              
              <FileUploadField 
                label="Government ID" 
                hint="Aadhar, Passport, or equivalent official ID."
                value={govIdUrl} onChange={setGovIdUrl} required />

              <div className="pt-3 border-t border-gray-100">
                <FileUploadField 
                  label="Professional License (Optional)" 
                  hint="If you have a Professional License, please upload it to become eligible for additional premium earning opportunities."
                  value={profLicenseUrl} onChange={setProfLicenseUrl} />
              </div>
            </div>

            <div className="flex justify-center gap-1.5 mt-2">
              <span className="text-[10px] text-gray-500 font-medium">🔒 All documents are encrypted and stored securely.</span>
            </div>
          </div>
        </StepCard>
      </Layout>
    );
  }

  if (step === 8) {
    const availDays = alwaysAvailable ? ["Always Available"] : Object.keys(daySlots);
    
    const sections = [
      {
        title: "Basic Details", goTo: 1,
        rows: [
          { label: "Name", value: fullName },
          { label: "Email", value: email },
          { label: "Phone", value: `${countryCode} ${phone}` },
        ],
      },
      {
        title: "Professional Info", goTo: 2,
        rows: [
          { label: "Qualification", value: qualification },
          { label: "Experience", value: experience ? `${experience} years` : "—" },
          { label: "Languages", value: selectedLangs.length },
        ],
      },
      {
        title: "Availability", goTo: 4,
        rows: [
          { label: "Schedule", value: alwaysAvailable ? "24/7 Available" : availDays.join(", ") },
          { label: "Timezone", value: timezone.replace('_', ' ') },
        ],
      },
      {
        title: "Services", goTo: 5,
        rows: [
          { label: "Chat Support", value: "Accepted Policy" },
          { label: "Video Fee", value: videoPrice ? `₹${videoPrice}` : "—" },
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
              <p className="text-xs text-gray-500 mb-4">Please review your information before final submission.</p>

              <div className="space-y-5">
                {photoUrl && (
                  <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                    <img src={photoUrl} alt="Profile" className="w-14 h-14 rounded-full object-cover border-2 border-primary/20 shadow-sm" />
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{fullName}</p>
                      <p className="text-xs text-gray-500 font-medium">{qualification}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sections.map((section) => (
                    <div key={section.title} className="bg-gray-50 rounded-xl p-3 border border-gray-100 relative group">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{section.title}</h3>
                        <button onClick={() => setStep(section.goTo)} className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <Pencil className="w-2.5 h-2.5" /> Edit
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {section.rows.map((row) => (
                          <div key={row.label} className="flex justify-between items-end gap-2">
                            <span className="text-[11px] text-gray-500 truncate w-20">{row.label}</span>
                            <span className="text-[11px] font-semibold text-gray-800 truncate text-right flex-1">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-shrink-0 rounded-lg" onClick={back}>
                <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
              <Button className="flex-1 rounded-lg bg-primary text-white font-semibold text-sm" size="sm" onClick={() => continueStep(8)} disabled={saving}>
                Proceed to Terms
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
        <StepCard stepNum={9} title="Terms & Conditions" subtitle="Please accept our platform rules to finalize your application."
          onBack={back}
          onContinue={handleSubmit}
          continueDisabled={saving || !tcAccepted}
          continueLabel={saving ? "Submitting Application..." : "Accept & Submit Application"}>
          
          <div className="space-y-4">
            <div className="h-64 overflow-y-auto bg-gray-50 p-5 border border-gray-200 rounded-xl text-xs text-gray-700 leading-relaxed custom-scrollbar shadow-inner">
              {tcContent ? (
                <ol className="list-decimal list-outside pl-4 space-y-2.5">
                  {tcContent.split('\n').map((line, idx) => {
                    const trimmed = line.trim();
                    if (!trimmed) return null;
                    const cleanText = trimmed.replace(/^\d+[\.\)]\s*/, '');
                    return <li key={idx} className="pl-1">{cleanText}</li>;
                  })}
                </ol>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin"/> 
                  <span>Loading official terms...</span>
                </div>
              )}
            </div>

            <label className="flex items-start gap-3 p-4 border-2 border-transparent bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors focus-within:border-primary/30">
              <input 
                type="checkbox" 
                className="mt-0.5 w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary focus:ring-offset-1"
                checked={tcAccepted} 
                onChange={e => setTcAccepted(e.target.checked)} 
              />
              <span className="text-xs font-semibold text-gray-900 leading-relaxed">
                I confirm that I have read, understood, and agree to all Therapist Terms & Conditions. I understand that I am personally responsible for maintaining professional conduct, ethical practices, and compliance with all applicable regulations while providing services through the platform.
              </span>
            </label>
          </div>
        </StepCard>
      </Layout>
    );
  }
}