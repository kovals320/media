import "server-only";
import { cache } from "react";
import { getViewer } from "@/lib/auth";
import { sortByTitleYear } from "@/lib/sort";
import { getPlaylistVideos, type Video } from "@/lib/youtube";

// All videos from every playlist as one list (duplicates removed),
// sorted by the year in the title. Shared by the page and its link preview.
export const loadVideos = cache(async () => {
  const { supabase } = await getViewer();
  const { data, error } = await supabase
    .from("media_playlists")
    .select("youtube_playlist_id")
    .order("sort_order");
  if (error) throw new Error(error.message);

  const results = await Promise.all(
    ((data ?? []) as { youtube_playlist_id: string }[]).map(async (p) => {
      try {
        return { videos: await getPlaylistVideos(p.youtube_playlist_id), failed: false };
      } catch {
        return { videos: [] as Video[], failed: true };
      }
    }),
  );

  const seen = new Set<string>();
  const all: Video[] = [];
  for (const r of results) {
    for (const v of r.videos) {
      if (seen.has(v.id)) continue; // same video in two playlists
      seen.add(v.id);
      all.push(v);
    }
  }

  return {
    videos: sortByTitleYear(all, (v) => v.title, (v) => v.publishedAt),
    someFailed: results.some((r) => r.failed),
  };
});
