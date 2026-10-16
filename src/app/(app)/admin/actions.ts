"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { IMMICH_CACHE_TAG } from "@/lib/immich";
import { getPlaylistInfo, YOUTUBE_CACHE_TAG } from "@/lib/youtube";

export type FormState = { error: string | null; ok: string | null };

function playlistIdFrom(input: string) {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    return url.searchParams.get("list");
  } catch {
    return /^[A-Za-z0-9_-]{10,}$/.test(trimmed) ? trimmed : null;
  }
}

export async function addPlaylist(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = playlistIdFrom(String(formData.get("url") ?? ""));
  if (!id) return { error: "זה לא נראה כמו קישור לפלייליסט ביוטיוב.", ok: null };

  const info = await getPlaylistInfo(id);
  if (!info) {
    return { error: "לא מצאנו את הפלייליסט. ודאו שהוא ציבורי או 'לא רשום', לא פרטי.", ok: null };
  }

  const { data: last } = await supabase
    .from("media_playlists")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("media_playlists").insert({
    youtube_playlist_id: id,
    title: info.title,
    sort_order: ((last?.sort_order as number | undefined) ?? 0) + 1,
  });
  if (error) {
    return {
      error: error.code === "23505" ? "הפלייליסט הזה כבר באפליקציה." : "לא הצלחנו להוסיף. נסו שוב.",
      ok: null,
    };
  }
  revalidatePath("/admin");
  revalidatePath("/videos");
  return { error: null, ok: `"${info.title}" נוסף (${info.count} סרטונים).` };
}

export async function removePlaylist(id: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("media_playlists").delete().eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/videos");
}

// Drop the saved YouTube and Immich data so the next visit reads fresh content.
export async function refreshFromYouTube(_: FormState): Promise<FormState> {
  await requireAdmin();
  updateTag(YOUTUBE_CACHE_TAG);
  updateTag(IMMICH_CACHE_TAG);
  revalidatePath("/videos");
  revalidatePath("/photos", "layout");
  const time = new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jerusalem",
  }).format(new Date());
  return { error: null, ok: `עודכן ב-${time}. השינויים מיוטיוב ומשרת התמונות כבר מופיעים באפליקציה.` };
}
