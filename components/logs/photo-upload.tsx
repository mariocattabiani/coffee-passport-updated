"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { resizeImageToJpeg } from "@/lib/drink-logs/resize-image";

interface PhotoUploadProps {
  preview: string | null;
  onChange: (file: File | null, preview: string | null) => void;
}

export function PhotoUpload({ preview, onChange }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);

  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setProcessing(true);
    try {
      const blob = await resizeImageToJpeg(file);
      const jpegFile = new File([blob], "drink-photo.jpg", { type: "image/jpeg" });
      onChange(jpegFile, URL.createObjectURL(blob));
    } catch {
      // If processing fails for any reason, simply don't attach a photo
      // rather than blocking the rest of the log.
    } finally {
      setProcessing(false);
    }
  }

  function handleRemove() {
    if (preview) URL.revokeObjectURL(preview);
    onChange(null, null);
  }

  if (preview) {
    return (
      <div>
        <div className="relative overflow-hidden rounded-lg border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="max-h-72 w-full object-cover" />
        </div>
        <div className="mt-2 flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            Replace
          </Button>
          <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={handleRemove}>
            <X className="h-3.5 w-3.5" />
            Remove
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleSelect}
          aria-label="Replace photo"
        />
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={processing}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-white py-8 text-charcoal/50 transition-colors hover:border-espresso/40 hover:text-espresso"
      >
        <ImagePlus className="h-6 w-6" />
        <span className="text-sm font-medium">
          {processing ? "Processing..." : "Add a photo"}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleSelect}
        aria-label="Add a photo"
      />
    </div>
  );
}
