import { useRef, useState } from "react";
import { Camera, Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";

/**
 * Reusable Cloudinary profile photo uploader.
 * Completely independent of Base44.
 */
export default function CloudinaryUpload({ value, onChange, label = "Profile Photo", size = "w-24 h-24" }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

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

    try {
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
      
      if (data.secure_url) {
        onChange(data.secure_url);
      } else {
        throw new Error(data.error?.message || "Upload failed");
      }
    } catch (err) {
      console.error("Cloudinary Upload Error:", err);
      setError("Upload failed. Please check your network or configuration.");
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
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