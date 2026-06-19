import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useState } from "react";
import { Check, Heart, Star } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import MoodEntry from "@/components/landing/MoodEntry";
import Features from "@/components/landing/Features";
import HowItWorks, { TrustSection, TherapistsSection, BlogSection, FinalCTA, Footer } from "@/components/landing/HowItWorks";

const HERO_IMG = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80";
const HOW_WORKS_IMG = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=700&q=80";
const THERAPIST_IMG = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=700&q=80";
const THERAPIST_IMG2 = "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=400&q=80";
const SOFA_IMG = "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=700&q=80";

export default function Landing() {
  const { user, userProfile, isLoadingAuth } = useAuth();
  const [selectedMood, setSelectedMood] = useState(null);
  const navigate = useNavigate();

  // Show loading state while auth is being verified
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const profilePending = user && userProfile && userProfile.profile_status !== "completed";
  const noProfile = user && !userProfile;

  const getPendingRedirect = () => {
    if (!userProfile) return "/complete-profile";
    const { selected_role } = userProfile;
    if (!selected_role) return "/complete-profile";
    if (selected_role === "customer") return "/customer-onboarding";
    if (selected_role === "therapist") return "/join-support";
    return "/complete-profile";
  };

  const handleCTA = (intent) => {
    if (!user) {
      sessionStorage.setItem("pending_intent", `/${intent}`);
      navigate("/register");
      return;
    }
    if (!userProfile || userProfile.profile_status !== "completed") {
      navigate(getPendingRedirect());
      return;
    }
    navigate(`/${intent}`);
  };

  const handleMoodSelect = (mood) => {
    setSelectedMood(mood);
    sessionStorage.setItem("pendingMood", mood);
    handleCTA("find-support");
  };

  return (
    <div className="min-h-screen font-body overflow-x-hidden" style={{ backgroundColor: "#F0F0E0" }}>
      <Navbar user={user} userProfile={userProfile} profilePending={profilePending} noProfile={noProfile} />

      {/* Hero Section */}
      <section className="pt-24 pb-0" style={{ backgroundColor: "#F0F0E0" }}>
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-8 items-end">
          <div className="py-16 animate-fade-in-up">
            <h1 className="font-display text-4xl sm:text-5xl font-bold leading-tight mb-5" style={{ color: "#1F2937" }}>
              You don't have to carry everything alone.
            </h1>
            <p className="text-base leading-relaxed mb-8 max-w-md animate-fade-in-up" style={{ animationDelay: "0.2s", color: "#6B7280" }}>
              Life feels heavy sometimes. Whether you feel overwhelmed, unheard, emotionally tired, or simply need someone to talk to — BreathingPlace is here for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <button
                onClick={() => handleCTA("talk-freely")}
                className="px-8 py-3 rounded-full bg-primary text-white font-medium shadow-md hover:shadow-lg transition-all hover:scale-105"
              >
                Talk Freely
              </button>
              <button
                onClick={() => handleCTA("find-support")}
                className="px-8 py-3 rounded-full border border-gray-300 font-medium hover:shadow-md transition-all hover:scale-105"
              >
                Find Support
              </button>
              <Link to="/therapist-landing">
                <button className="px-8 py-3 rounded-full text-primary border border-primary/40 font-medium hover:bg-primary/5 transition-all hover:scale-105">
                  Join as Therapist
                </button>
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Safe and Confidential</span>
              <span className="flex items-center gap-1.5"><Heart className="w-4 h-4 text-primary" /> No Judgment</span>
              <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-primary" /> Here For You</span>
            </div>
          </div>
          <div className="flex items-end justify-center lg:justify-end animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <img
              src={HERO_IMG}
              alt="Woman sitting peacefully with a warm drink"
              className="w-full max-w-md h-[480px] object-cover object-top rounded-t-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]"
            />
          </div>
        </div>
      </section>

      {/* Mood Entry - customers and guests only */}
      {(!user || user.role === "customer" || user.role === "user") && (
        <MoodEntry selectedMood={selectedMood} onSelect={handleMoodSelect} />
      )}

      {/* Features */}
      <Features />

      {/* How It Works */}
      <HowItWorks howWorksImg={HOW_WORKS_IMG} />

      {/* Trust Section */}
      <TrustSection />

      {/* Therapists Section */}
      <TherapistsSection 
        therapistImg={THERAPIST_IMG} 
        therapistImg2={THERAPIST_IMG2} 
      />

      {/* Blog Section */}
      <BlogSection />

      {/* Final CTA */}
      <FinalCTA 
        sofaImg={SOFA_IMG} 
        onTalkFreely={() => handleCTA("talk-freely")} 
        onFindSupport={() => handleCTA("find-support")} 
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}