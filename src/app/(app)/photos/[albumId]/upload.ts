"use client";

import { createClient } from "@/lib/supabase/client";

const BUCKET = "media-photos";
const FULL_MAX = 2560; // long edge in px for the full-size copy
const THUMB_MAX = 640; // long edge in px for the grid thumbnail

async function encode(bitmap: ImageBitmap, max: number, quality: number) {
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode image"))), "image/jpeg", quality),
  );
  return { blob, width, height };
}

/**
 * Shrinks a photo in the browser (so storage stays small), uploads a full copy
 * and a thumbnail, then records it in the album.
 */
export async function uploadPhoto(albumId: string, file: File) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const full = await encode(bitmap, FULL_MAX, 0.85);
    const thumb = await encode(bitmap, THUMB_MAX, 0.78);

    const supabase = createClient();
    const id = crypto.randomUUID();
    const path = `${albumId}/${id}.jpg`;
    const thumbPath = `${albumId}/${id}_thumb.jpg`;

    const up1 = await supabase.storage.from(BUCKET).upload(path, full.blob, { contentType: "image/jpeg" });
    if (up1.error) throw up1.error;
    const up2 = await supabase.storage.from(BUCKET).upload(thumbPath, thumb.blob, { contentType: "image/jpeg" });
    if (up2.error) {
      await supabase.storage.from(BUCKET).remove([path]);
      throw up2.error;
    }

    const { error } = await supabase.from("media_photos").insert({
      album_id: albumId,
      path,
      thumb_path: thumbPath,
      width: full.width,
      height: full.height,
      taken_at: file.lastModified ? new Date(file.lastModified).toISOString() : null,
    });
    if (error) {
      await supabase.storage.from(BUCKET).remove([path, thumbPath]);
      throw error;
    }
  } finally {
    bitmap.close();
  }
}
