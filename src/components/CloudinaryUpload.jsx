import { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/lib/supabaseClient";
import { Camera, Upload, Loader2 } from "lucide-react";

/**
 * Reusable Cloudinary profile photo uploader.
 * Uses the uploadFile backend function (Cloudinary).
 *
 * Props:
 *   value       - current image URL string
 *   onChange    - callback(url: string)
 *   label       - button label text (default: "Profile Photo")
 *   size        - avatar size class (default: "w-24 h-24")
 */
export default function CloudinaryUpload({ value, onChange, label = "Profile Photo", size = "w-24 h-24" }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type & size (max 5MB)
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }

    setError(null);
    setUploading(true);

    const { data: { session } } = await supabase.auth.getSession();
    
    const formData = new FormData();
    formData.append("file", file);
    if (session?.access_token) {
      formData.append("supabaseToken", session.access_token);
    }

    const res = await base44.functions.invoke("uploadFile", formData);
    const url = res?.data?.url;
    if (url) {
      onChange(url);
    } else {
      setError("Upload failed. Please try again.");
    }
    setUploading(false);

    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        className={`${size} rounded-full border-2 border-dashed border-border bg-muted flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden relative`}
      >
        {value ? (
          <img src={value} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <Camera className="w-6 h-6" />
            <span className="text-[10px]">Add Photo</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
        disabled={uploading}
      />

      <button
        type="button"
        onClick={() => !uploading && fileRef.current?.click()}
        className="text-xs text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
        disabled={uploading}
      >
        <Upload className="w-3 h-3" />
        {uploading ? "Uploading..." : value ? `Change ${label}` : `Upload ${label}`}
      </button>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}