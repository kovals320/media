import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export const PHOTO_BUCKET = "media-photos";

// The photo bucket is public, so each file has a permanent link.
export function photoUrl(supabase: SupabaseClient, path: string) {
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}
