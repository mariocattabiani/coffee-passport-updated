function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

/**
 * Resizes (never crops) an image so its longest edge is at most
 * `maxDimension`, and re-encodes it as JPEG. Drink photos keep their
 * natural composition, unlike the circular avatar crop. If the photo is
 * already small, it's still re-encoded as JPEG for a predictable file
 * type, but at full size (no upscaling).
 */
export async function resizeImageToJpeg(
  file: File,
  maxDimension = 1600,
  quality = 0.85
): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    let { width, height } = image;

    if (width > maxDimension || height > maxDimension) {
      const scale = maxDimension / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas is not supported in this browser.");
    }
    ctx.drawImage(image, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Could not process the image."))),
        "image/jpeg",
        quality
      );
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
