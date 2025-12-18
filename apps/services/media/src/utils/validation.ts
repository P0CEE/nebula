const ALLOWED_TYPES = {
  image: ["image/jpeg", "image/png", "image/webp", "image/heic"],
  gif: ["image/gif"],
  video: ["video/mp4", "video/quicktime", "video/webm"],
};

const MAX_SIZES = {
  image: 10 * 1024 * 1024, // 10MB
  gif: 15 * 1024 * 1024, // 15MB
  video: 100 * 1024 * 1024, // 100MB
};

type MediaType = "image" | "video";

type ValidationResult =
  | { valid: true; mediaType: MediaType; isGif: boolean }
  | { valid: false; error: string };

export function validateFile(file: File): ValidationResult {
  const mime = file.type;

  if (ALLOWED_TYPES.image.includes(mime)) {
    if (file.size > MAX_SIZES.image) {
      return { valid: false, error: "Image exceeds 10MB limit" };
    }
    return { valid: true, mediaType: "image", isGif: false };
  }

  if (ALLOWED_TYPES.gif.includes(mime)) {
    if (file.size > MAX_SIZES.gif) {
      return { valid: false, error: "GIF exceeds 15MB limit" };
    }
    return { valid: true, mediaType: "image", isGif: true };
  }

  if (ALLOWED_TYPES.video.includes(mime)) {
    if (file.size > MAX_SIZES.video) {
      return { valid: false, error: "Video exceeds 100MB limit" };
    }
    return { valid: true, mediaType: "video", isGif: false };
  }

  return { valid: false, error: "Unsupported file type" };
}

export function getExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "bin";
}
