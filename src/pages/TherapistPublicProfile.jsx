import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star, Clock, Globe, ArrowLeft, Copy, Check,
  Video, User, GraduationCap, Briefcase, Heart, ChevronDown, ChevronUp
} from "lucide-react";

function StarRating({ rating, size = "sm" }) {
  const s = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${s} ${i <= Math.round(rating) ? "text-yellow-500 fill-yellow-500" : "text-gray-200 fill-gray-200"}`} />
      ))}
    </div>
  );
}

export default function TherapistPublicProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const idFromQuery = urlParams.get("id");

  const [copied, setCopied] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  // Fetch therapist directly from Supabase
  const { data: therapist, isLoading: loadingTherapist } = useQuery({
    queryKey: ["public-therapist-profile", slug, idFromQuery],
    queryFn: async () => {
      if (idFromQuery) {
        const { data } = await supabase.from("therapist_profiles").select("*").eq("id", idFromQuery).eq("approval_status", "approved").maybeSingle();
        return data || null;
      }
      // Find by slug
      const { data: bySlug } = await supabase.from("therapist_profiles").select("*").eq("slug", slug).eq("approval_status", "approved").maybeSingle();
      if (bySlug) return bySlug;
      // Fallback: search all approved and match by name slug
      const { data: all } = await supabase.from("therapist_profiles").select("*").eq("approval_status", "approved");
      return (all || []).find(t => t.full_name?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") === slug) || null;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Real reviews from session_reviews table
  const { data: reviews = [] } = useQuery({
    queryKey: ["therapist-reviews-public", therapist?.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("session_reviews")
        .select("*")
        .eq("therapist_id", therapist.user_id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!therapist?.user_id,
  });

  const avgRating = reviews.length > 0 ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : null;

  const profileUrl = `${window.location.origin}/therapist/${slug || therapist?.full_name?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || therapist?.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loadingTherapist) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F0F0E0" }}>
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!therapist) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F0F0E0" }}>
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">Therapist Not Found</h2>
          <p className="text-gray-500 mb-4">This profile does not exist or is no longer available.</p>
          <Button onClick={() => navigate("/")} className="rounded-lg">Back to Home</Button>
        </div>
      </div>
    );
  }

  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F0F0E0" }}>
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-1.5">
          <Heart className="w-4 h-4 text-primary" />
          <span className="font-display font-semibold text-gray-900 text-sm">BreathingPlace</span>
        </div>
        {/* Share / copy */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:border-primary hover:text-primary transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 grid lg:grid-cols-3 gap-6">
        {/* LEFT — Profile card */}
        <div className="lg:col-span-1 space-y-4">
          {/* Profile Photo — rectangular */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
              {therapist.profile_photo_url ? (
                <img src={therapist.profile_photo_url} alt={therapist.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-16 h-16 text-gray-300" />
                </div>
              )}
            </div>
            <div className="p-4">
              <h1 className="font-display text-xl font-bold text-gray-900 mb-0.5">{therapist.full_name}</h1>
              <p className="text-sm text-gray-500 mb-3">{therapist.qualification}</p>

              {avgRating && (
                <div className="flex items-center gap-2 mb-3">
                  <StarRating rating={parseFloat(avgRating)} size="md" />
                  <span className="font-bold text-gray-900 text-sm">{avgRating}</span>
                  <span className="text-xs text-gray-400">({reviews.length} reviews)</span>
                </div>
              )}

              <div className="space-y-2 text-xs text-gray-600 mb-4">
                {therapist.experience_years && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span>{therapist.experience_years} years of experience</span>
                  </div>
                )}
                {therapist.languages?.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span>{therapist.languages[0]}{therapist.languages.length > 1 ? `, ${therapist.languages.slice(1).join(", ")}` : ""}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-400">Consultation Fee</p>
                  <p className="font-bold text-gray-900 text-base">₹{therapist.final_customer_price || therapist.consultation_fee || 299}<span className="text-xs font-normal text-gray-400">/session</span></p>
                </div>
                <Button className="rounded-lg bg-primary text-white text-xs px-4" size="sm" onClick={() => navigate("/find-support")}>
                  Book Now
                </Button>
              </div>
            </div>
          </div>

          {/* Session modes */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Available via</p>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                <Video className="w-3.5 h-3.5 text-primary" />
              </div>
              Video Session (Premium)
            </div>
          </div>

          {/* Share card */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-700 mb-2">Share This Profile</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={profileUrl}
                className="flex-1 text-[10px] bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-gray-500 overflow-hidden"
              />
              <button onClick={handleCopy} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${copied ? "bg-green-100 text-green-700" : "bg-primary text-white"}`}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Bio */}
          {therapist.bio && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-2"><Heart className="w-4 h-4 text-primary" /> About</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{therapist.bio}</p>
            </div>
          )}

          {/* Specializations */}
          {therapist.specializations?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2"><GraduationCap className="w-4 h-4 text-primary" /> Specializations</h2>
              <div className="flex flex-wrap gap-2">
                {therapist.specializations.map((s) => (
                  <Badge key={s} className="bg-primary/10 text-primary border-0 text-xs rounded-md px-2.5 py-1">{s}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Availability */}
          {(therapist.available_days?.length > 0 || therapist.available_times?.length > 0) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Availability</h2>
              {therapist.available_days?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Days</p>
                  <div className="flex flex-wrap gap-1.5">
                    {therapist.available_days.map((d) => (
                      <span key={d} className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-700 font-medium">{d}</span>
                    ))}
                  </div>
                </div>
              )}
              {therapist.available_times?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Time Slots</p>
                  <div className="flex flex-wrap gap-1.5">
                    {therapist.available_times.map((t) => (
                      <span key={t} className="px-2.5 py-1 bg-primary/5 border border-primary/20 rounded-md text-xs text-primary font-medium">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reviews */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              Client Reviews
              {avgRating && <span className="ml-1 text-yellow-600 font-bold">{avgRating}</span>}
              <span className="text-gray-400 font-normal text-xs">({reviews.length})</span>
            </h2>
            {reviews.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No reviews yet. Be the first to share your experience!</p>
            ) : (
              <div className="space-y-3">
                {visibleReviews.map((r) => (
                  <div key={r.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{r.customer_name || "Client"}</p>
                          <StarRating rating={r.rating} />
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400">{(r.created_at || r.created_date) ? new Date(r.created_at || r.created_date).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : ""}</span>
                    </div>
                    {r.comment && <p className="text-xs text-gray-600 leading-relaxed italic">"{r.comment}"</p>}
                  </div>
                ))}
                {reviews.length > 3 && (
                  <button onClick={() => setShowAllReviews((s) => !s)} className="w-full text-xs text-primary font-medium flex items-center justify-center gap-1 py-2 hover:underline">
                    {showAllReviews ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</> : <><ChevronDown className="w-3.5 h-3.5" /> Show all {reviews.length} reviews</>}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="bg-primary rounded-xl p-5 text-white text-center">
            <p className="font-display font-bold text-lg mb-1">Ready to begin?</p>
            <p className="text-white/80 text-sm mb-4">Book a session with {therapist.full_name?.split(" ")[0]} today.</p>
            <Button className="bg-white text-primary hover:bg-white/90 rounded-lg font-semibold px-6" onClick={() => navigate("/find-support")}>
              Book a Session
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}