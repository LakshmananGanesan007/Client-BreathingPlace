import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Star, Search, Clock, User, Heart, ChevronDown, ChevronUp, ArrowLeft, Globe } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? "text-yellow-500 fill-yellow-500" : "text-gray-200 fill-gray-200"}`}
        />
      ))}
    </div>
  );
}

function TherapistCard({ therapist, reviews }) {
  const [showReviews, setShowReviews] = useState(false);
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length
      : null;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col">
      {/* Photo */}
      <div className="relative h-52 bg-muted overflow-hidden flex-shrink-0">
        {therapist.profile_photo_url ? (
          <img
            src={therapist.profile_photo_url}
            alt={therapist.full_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-10 h-10 text-primary" />
            </div>
          </div>
        )}
        {avgRating && (
          <div className="absolute top-3 right-3 bg-white/95 shadow-sm rounded-full px-2.5 py-1 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
            <span className="text-xs font-bold text-gray-800">{avgRating.toFixed(1)}</span>
            <span className="text-[10px] text-gray-500">({reviews.length})</span>
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-heading font-semibold text-foreground text-base">{therapist.full_name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5 mb-3">{therapist.qualification}</p>

        {/* Specializations */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(therapist.specializations || []).slice(0, 3).map((s) => (
            <Badge key={s} className="bg-secondary text-secondary-foreground border-0 text-[10px]">{s}</Badge>
          ))}
          {(therapist.specializations || []).length > 3 && (
            <Badge variant="outline" className="text-[10px]">
              +{(therapist.specializations || []).length - 3}
            </Badge>
          )}
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {therapist.experience_years || 0} yrs exp
          </span>
          {therapist.languages?.length > 0 && (
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3" /> {therapist.languages.join(", ")}
            </span>
          )}
          {therapist.consultation_fee && (
            <span className="font-semibold text-foreground">
              {"\u20B9"}{therapist.consultation_fee}/session
            </span>
          )}
        </div>

        {therapist.bio && (
          <p className="text-xs text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{therapist.bio}</p>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowReviews((s) => !s)}
              className="flex items-center gap-2 text-xs text-primary font-medium hover:underline mb-2"
            >
              <StarRating rating={avgRating} />
              <span>{reviews.length} review{reviews.length !== 1 ? "s" : ""}</span>
              {showReviews ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showReviews && (
              <div className="space-y-2">
                {reviews.map((r) => (
                  <div key={r.id} className="bg-background rounded-xl p-3 border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <StarRating rating={r.rating} />
                      <span className="text-[10px] text-muted-foreground">{r.customer_name || "Client"}</span>
                    </div>
                    {r.comment && (
                      <p className="text-xs text-muted-foreground italic leading-relaxed">{r.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-auto">
          <Link to="/sessions">
            <Button className="w-full rounded-full gap-2 text-sm" size="sm">
              <Heart className="w-3.5 h-3.5" /> Book a Session
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function TherapySelection() {
  const navigate = useNavigate();
  const [mood, setMood] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const m = sessionStorage.getItem("pendingMood");
    if (m) setMood(m);
  }, []);

  const { data: therapists = [], isLoading } = useQuery({
    queryKey: ["approved-therapists-browse"],
    queryFn: () => base44.entities.TherapistProfile.filter({ approval_status: "approved" }),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["all-reviews-browse"],
    queryFn: () => base44.entities.Review.list(),
  });

  const filtered = therapists.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.full_name?.toLowerCase().includes(q) ||
      (t.specializations || []).some((s) => s.toLowerCase().includes(q)) ||
      (t.languages || []).some((l) => l.toLowerCase().includes(q)) ||
      t.bio?.toLowerCase().includes(q)
    );
  });

  const getReviews = (tid) => reviews.filter((r) => r.therapist_id === tid);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm mb-5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="text-center">
            {mood && (
              <div className="inline-block bg-white/20 rounded-full px-4 py-1.5 text-sm font-medium text-white mb-3">
                You are feeling: {mood}
              </div>
            )}
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">
              Find Your Support
            </h1>
            <p className="text-white/80 text-sm max-w-md mx-auto">
              Connect with a verified therapist who understands you and makes you feel heard.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Search */}
        <div className="relative mb-8 max-w-lg mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-11 rounded-full bg-card border-border"
            placeholder="Search by name, specialization, or language..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden animate-pulse">
                <div className="h-52 bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="flex gap-2">
                    <div className="h-5 bg-muted rounded-full w-20" />
                    <div className="h-5 bg-muted rounded-full w-16" />
                  </div>
                  <div className="h-9 bg-muted rounded-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <User className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-heading font-semibold text-foreground mb-1">
              {therapists.length === 0 ? "No therapists available yet" : "No results found"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {therapists.length === 0
                ? "Our team is growing. Check back soon."
                : "Try a different search term."}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground text-center mb-6">
              {filtered.length} therapist{filtered.length !== 1 ? "s" : ""} available
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((t) => (
                <TherapistCard key={t.id} therapist={t} reviews={getReviews(t.id)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}