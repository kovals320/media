import "server-only";
import { createClient } from "@supabase/supabase-js";

// Supabase client for public reads (no cookies), so public pages can be cached.
// Only reads tables whose rows are public anyway (playlists, display titles).
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
