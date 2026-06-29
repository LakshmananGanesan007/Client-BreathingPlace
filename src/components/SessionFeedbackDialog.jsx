import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

/**
 * Feedback dialog shown after a chat or video session ends.
 * Collects star rating + optional comment, saves to session_reviews table.
 */
export default function SessionFeedbackDialog({ open, onClose, session, customerId, therapistId }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const sessionId = session?.id;

  const handleSubmit = async () => {
    if (rating === 0) { toast.error("Please select a rating."); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("session_reviews").insert({
        session_id: sessionId,
        customer_id: customerId,
        therapist_id: therapistId || session?.therapist_id,
        rating,
        comment: comment.trim() || null,
      });
      if (error) throw error;
      setDone(true);
    } catch (err) {
      toast.error("Failed to save feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setHovered(0);
    setComment("");
    setDone(false);
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {done ? "Thank You!" : "How was your session?"}
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center py-6 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-gray-600 text-sm">Your feedback has been submitted. It helps us improve your experience!</p>
            <Button className="rounded-full px-8 bg-primary text-white" onClick={handleClose}>Close</Button>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            <p className="text-sm text-gray-500 text-center">Your honest feedback helps therapists and the platform improve.</p>

            {/* Star Rating */}
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110">
                  <Star
                    className={`w-9 h-9 transition-colors ${(hovered || rating) >= star ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}`}
                  />
                </button>
              ))}
            </div>

            {rating > 0 && (
              <p className="text-center text-sm font-semibold text-amber-600">
                {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
              </p>
            )}

            {/* Comment */}
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 block">Share your experience (optional)</label>
              <Textarea
                placeholder="What did you like? What could be better?"
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="resize-none text-sm min-h-[90px] rounded-xl border-gray-200"
                maxLength={500}
              />
              <p className="text-right text-xs text-gray-400 mt-0.5">{comment.length}/500</p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-full" onClick={handleClose}>Skip</Button>
              <Button className="flex-1 rounded-full bg-primary text-white font-semibold" onClick={handleSubmit} disabled={submitting || rating === 0}>
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : "Submit Feedback"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
