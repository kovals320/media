import { BackLink } from "@/components/BackLink";
import { requireMember } from "@/lib/auth";
import { sortByTitleYear } from "@/lib/sort";
import { getPlaylistVideos, type Video } from "@/lib/youtube";
import { VideoBrowser, type PlaylistView } from "./VideoBrowser";

export const metadata = { title: "סרטונים – המדיה של המשפחה" };

type Playlist = { id: string; youtube_playlist_id: string; title: string };

export default async function VideosPage() {
  const { supabase } = await requireMember();
  const { data, error } = await supabase
    .from("media_playlists")
    .select("id, youtube_playlist_id, title")
    .order("sort_order");
  if (error) throw new Error(error.message);

  const playlists: PlaylistView[] = await Promise.all(
    ((data ?? []) as Playlist[]).map(async (p) => {
      try {
        const videos: Video[] = await getPlaylistVideos(p.youtube_playlist_id);
        return {
          id: p.id,
          title: p.title,
          failed: false,
          videos: sortByTitleYear(videos, (v) => v.title, (v) => v.publishedAt),
        };
      } catch {
        return { id: p.id, title: p.title, failed: true, videos: [] };
      }
    }),
  );

  return (
    <main className="mx-auto w-full max-w-6xl pb-12 pt-6 sm:pt-10">
      <div className="px-5 sm:px-8">
        <BackLink />
        <h1 className="font-display text-[2.6rem] leading-[1.05] sm:text-6xl">סרטונים</h1>
      </div>

      {playlists.length === 0 ? (
        <p className="mx-5 mt-8 rounded-[2rem] border-2 border-dashed border-lake/40 p-8 text-center text-lg text-muted sm:mx-8">
          עוד אין כאן פלייליסטים.
        </p>
      ) : (
        <VideoBrowser playlists={playlists} />
      )}
    </main>
  );
}
