"use client";

import { useRef, useState } from "react";
import { ImagePlus, X, Move } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DrinkPhotoPositionPicker } from "@/components/logs/drink-photo-position-picker";
import { resizeImageToJpeg } from "@/lib/drink-logs/resize-image";

export interface PhotoSelection {
  /** null means "the underlying photo is unchanged, only the focal
   *  point moved" (the Reposition path) — the caller should keep
   *  whatever file it already has (or, on an edit form, keep the
   *  existing uploaded photo as-is) and just update the position. A
   *  real File means a new/replacement photo was resized and is ready
   *  to upload. */
  file: File | null;
  preview: string;
  positionX: number;
  positionY: number;
}

interface PhotoUploadProps {
  preview: string | null;
  positionX: number;
  positionY: number;
  onChange: (selection: PhotoSelection | null) => void;
}

/**
 * The photo itself is only ever resized here (resizeImageToJpeg, the
 * same pre-existing "shrink, never crop" pipeline this project already
 * used before any crop/position UI existed) — never permanently
 * cropped to one aspect ratio. Selecting a file opens
 * DrinkPhotoPositionPicker first, purely to choose a focal point; the
 * picker's own 16:9 preview frame is a positioning AID, not the shape
 * the final upload gets baked into.
 *
 * "Reposition" (shown once a photo already exists) reopens the same
 * picker against the CURRENT preview rather than requiring a fresh
 * file selection — the picker only ever computes a percentage-based
 * focal point, never rasterizes pixels, so repositioning an
 * already-resized preview or an existing signed URL (on the edit form)
 * yields the identical focal point a from-scratch selection would,
 * with no re-upload needed.
 *
 * The preview shown here uses that same object-position, so what's
 * shown while filling out the rest of the log already echoes what
 * Discover/Passport will show at their own aspect ratios.
 */
export function PhotoUpload({ preview, positionX, positionY, onChange }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPendingFile(file);
    setPendingImageSrc(URL.createObjectURL(file));
  }

  function handleReposition() {
    if (!preview) return;
    setPendingFile(null);
    setPendingImageSrc(preview);
  }

  async function handlePositionSave(chosenX: number, chosenY: number) {
    if (!pendingImageSrc) return;

    if (pendingFile) {
      // A new/replacement file was selected: resize the raw original
      // (never crop) and hand up the result.
      setProcessing(true);
      try {
        const resizedBlob = await resizeImageToJpeg(pendingFile);
        const resizedFile = new File([resizedBlob], "drink-photo.jpg", { type: "image/jpeg" });
        const nextPreview = URL.createObjectURL(resizedBlob);

        if (preview) URL.revokeObjectURL(preview);
        URL.revokeObjectURL(pendingImageSrc);
        setPendingImageSrc(null);
        setPendingFile(null);

        onChange({ file: resizedFile, preview: nextPreview, positionX: chosenX, positionY: chosenY });
      } finally {
        setProcessing(false);
      }
      return;
    }

    // Reposition-only: pendingImageSrc IS the existing preview, the
    // underlying photo never changes, only where it's centered.
    setPendingImageSrc(null);
    onChange({ file: null, preview: pendingImageSrc, positionX: chosenX, positionY: chosenY });
  }

  function handlePositionCancel() {
    if (pendingFile && pendingImageSrc) URL.revokeObjectURL(pendingImageSrc);
    setPendingImageSrc(null);
    setPendingFile(null);
  }

  function handleRemove() {
    if (preview) URL.revokeObjectURL(preview);
    onChange(null);
  }

  const objectPosition = `${positionX}% ${positionY}%`;

  return (
    <div>
      {preview ? (
        <>
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-border bg-charcoal/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="h-full w-full object-cover" style={{ objectPosition }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              Replace
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={handleReposition}>
              <Move className="h-3.5 w-3.5" />
              Reposition
            </Button>
            <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={handleRemove}>
              <X className="h-3.5 w-3.5" />
              Remove
            </Button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-white py-8 text-charcoal/50 transition-colors hover:border-espresso/40 hover:text-espresso"
        >
          <ImagePlus className="h-6 w-6" />
          <span className="text-sm font-medium">Add a photo</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleSelect}
        aria-label={preview ? "Replace photo" : "Add a photo"}
      />

      {pendingImageSrc && (
        <DrinkPhotoPositionPicker
          imageSrc={pendingImageSrc}
          onCancel={handlePositionCancel}
          onSave={handlePositionSave}
        />
      )}

      {processing && <p className="mt-2 text-xs text-charcoal/40">Processing photo…</p>}
    </div>
  );
}
