"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { X, ZoomIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getCroppedImageBlob } from "@/lib/onboarding/crop-image";

interface AvatarCropperProps {
  imageSrc: string;
  onCancel: () => void;
  onSave: (file: File, previewUrl: string) => void;
}

export function AvatarCropper({ imageSrc, onCancel, onSave }: AvatarCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleSave() {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      onSave(file, URL.createObjectURL(blob));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-lg font-semibold text-espresso">Adjust your photo</h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="rounded p-1 text-charcoal/40 hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-espresso"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative mt-4 h-64 w-full overflow-hidden rounded-lg bg-charcoal/5">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <ZoomIn className="h-4 w-4 shrink-0 text-charcoal/40" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-espresso"
          />
        </div>

        <p className="mt-2 text-center text-xs text-charcoal/50">
          Drag to reposition, use the slider to zoom.
        </p>

        <div className="mt-5 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || !croppedAreaPixels}>
            {saving ? "Saving..." : "Apply"}
          </Button>
        </div>
      </div>
    </div>
  );
}
