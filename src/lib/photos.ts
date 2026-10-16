import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export const PHOTO_BUCKET = "media-photos";

// Private files are shown through short-lived signed links (2 hours).
export async function signPaths(supabase: SupabaseClient, paths: string[]) {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;
  for (let i = 0; i < paths.length; i += 500) {
    const { data } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(paths.slice(i, i + 500), 60 * 60 * 2);
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
    }
  }
  return urls;
}
