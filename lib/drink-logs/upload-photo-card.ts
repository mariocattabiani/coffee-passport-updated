import { createClient } from "@/lib/supabase/client";
import { resizeImageToJpeg } from "@/lib/drink-logs/resize-image";
import { CARD_JPEG_QUALITY, CARD_MAX_DIMENSION, cardPathFor } from "@/lib/storage/photo-variants";

/**
 * Best-effort: saves the lighter "card" copy next to a just-uploaded full
 * photo. Never blocks or fails the log itself. If anything goes wrong,
 * any existing card copy at that path is removed, so the site falls back
 * to the (correct) full photo instead of showing an outdated card copy
 * after a photo replacement.
 */
export async function uploadPhotoCard(fullPath: string, fullPhoto: File): Promise<void> {
  const cardPath = cardPathFor(fullPath);
  if (cardPath === fullPath) return; // unexpected name; never overwrite the original

  const supabase = createClient();
  try {
    const cardBlob = await resizeImageToJpeg(fullPhoto, CARD_MAX_DIMENSION, CARD_JPEG_QUALITY);
    const { error } = await supabase.storage
      .from("drink-photos")
      .upload(cardPath, cardBlob, { upsert: true, contentType: "image/jpeg" });
    if (error) throw error;
  } catch {
    await supabase.storage.from("drink-photos").remove([cardPath]).catch(() => undefined);
  }
}
