"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area, type MediaSize, type Point } from "react-easy-crop";
import { X, ZoomIn } from "lucide-react";

import { Button } from "@/components/ui/button";

interface DrinkPhotoPositionPickerProps {
  imageSrc: string;
  onCancel: () => void;
  onSave: (positionX: number, positionY: number) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * NOT a crop tool: the original photo is always preserved in full,
 * subject only to the project's existing resize/compression pipeline
 * (resizeImageToJpeg) — never permanently cropped to one aspect ratio.
 * This picker exists purely to let the person choose a FOCAL POINT,
 * the spot that should stay visible/centered wherever the photo is
 * later displayed via object-fit: cover, across genuinely different
 * ratios (mobile feed's fixed-height strip, desktop/profile's 4:3
 * card, the eventual lightbox at the image's own real shape). A single
 * destructive crop baked to one ratio can't serve all of those; a
 * stored focal point can — that's the actual bug this replaces.
 *
 * Reuses react-easy-crop's own pan/zoom interaction (already a project
 * dependency — same one used for avatars and the previous version of
 * this component, no new dependency added) purely as a positioning
 * aid: the CENTER of whatever crop rectangle the current drag/zoom
 * implies is read as the chosen focal point and converted to a
 * percentage of the image's real natural dimensions. That percentage
 * is the only thing carried forward — the cropped pixels themselves
 * are never used or exported.
 *
 * The preview frame is 16:9, matching the mobile Discover feed
 * specifically (the most important social surface), not a claim that
 * every future display ratio will look identical — desktop's 4:3
 * treatment independently reads the same stored focal point and crops
 * around it on its own.
 */
export function DrinkPhotoPositionPicker({ imageSrc, onCancel, onSave }: DrinkPhotoPositionPickerProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const onMediaLoaded = useCallback((mediaSize: MediaSize) => {
    setNaturalSize({ width: mediaSize.naturalWidth, height: mediaSize.naturalHeight });
  }, []);

  function handleSave() {
    if (!croppedAreaPixels || !naturalSize || naturalSize.width === 0 || naturalSize.height === 0) {
      onSave(50, 50);
      return;
    }
    const centerX = croppedAreaPixels.x + croppedAreaPixels.width / 2;
    const centerY = croppedAreaPixels.y + croppedAreaPixels.height / 2;
    const positionX = clamp((centerX / naturalSize.width) * 100, 0, 100);
    const positionY = clamp((centerY / naturalSize.height) * 100, 0, 100);
    onSave(positionX, positionY);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-lg font-semibold text-espresso">Position your photo</h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="rounded p-1 text-charcoal/40 hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-espresso"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-1 text-xs text-charcoal/50">
          Choose what should stay centered when your photo appears in Coffee Passport.
        </p>

        <div className="relative mt-3 h-56 w-full overflow-hidden rounded-lg bg-charcoal/5 sm:h-64">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={16 / 9}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            onMediaLoaded={onMediaLoaded}
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <ZoomIn className="h-4 w-4 shrink-0 text-charcoal/40" aria-hidden="true" />
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
          Drag to choose the focal point. We&apos;ll keep this area centered across different layouts.
        </p>

        <div className="mt-5 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!croppedAreaPixels}>
            Use this position
          </Button>
        </div>
      </div>
    </div>
  );
}
