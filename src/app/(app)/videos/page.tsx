import { BackLink } from "@/components/BackLink";
import { getViewer } from "@/lib/auth";
import { sortByTitleYear } from "@/lib/sort";
import { getPlaylistVideos, type Video } from "@/lib/youtube";
import { VideoBrowser } from "./VideoBrowser";

export const metadata = { title: "סרטונים – המדיה של המשפחה" };

export default async function VideosPage() {
  const { supabase } = await getViewer();
  const { data, error } = await supabase
    .from("media_playlists")
    .select("youtube_playlist_id")
    .order("sort_order");
  if (error) throw new Error(error.message);

  // Playlists are only sources: all their videos go into one list.
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
  const videos = sortByTitleYear(all, (v) => v.title, (v) => v.publishedAt);
  const someFailed = results.some((r) => r.failed);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-12 pt-6 sm:px-8 sm:pt-10">
      <BackLink />
      <div className="flex flex-wrap items-baseline gap-x-4">
        <h1 className="font-display text-[2.6rem] leading-[1.05] sm:text-6xl">סרטונים</h1>
        {videos.length > 0 && <span className="text-lg text-muted">{videos.length} סרטונים</span>}
      </div>

      {someFailed && (
        <p className="mt-6 rounded-2xl bg-lake/10 p-4 text-muted">
          חלק מהסרטונים לא נטענו מיוטיוב כרגע. נסו לרענן את הדף בעוד כמה דקות.
        </p>
      )}

      {videos.length === 0 ? (
        <p className="mt-8 rounded-[2rem] border-2 border-dashed border-lake/40 p-8 text-center text-lg text-muted">
          עוד אין כאן סרטונים.
        </p>
      ) : (
        <VideoBrowser videos={videos} />
      )}
    </main>
  );
}
