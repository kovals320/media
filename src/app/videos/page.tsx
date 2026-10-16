import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPlaylistVideos, type Video } from "@/lib/youtube";

export const metadata = { title: "סרטונים – המדיה של המשפחה" };

type Playlist = { id: string; youtube_playlist_id: string; title: string };

const dateFormat = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" });

async function loadPlaylists() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("media_playlists")
    .select("id, youtube_playlist_id, title")
    .order("sort_order");
  if (error) throw new Error(error.message);

  return Promise.all(
    (data as Playlist[]).map(async (p) => {
      try {
        return { ...p, videos: await getPlaylistVideos(p.youtube_playlist_id), failed: false };
      } catch {
        return { ...p, videos: [] as Video[], failed: true };
      }
    }),
  );
}

export default async function VideosPage() {
  const playlists = await loadPlaylists();

  return (
    <main className="mx-auto w-full max-w-6xl pb-12 pt-6 sm:pt-10">
      <div className="px-5 sm:px-8">
        <Link
          href="/"
          className="mb-6 -ms-3 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-lg text-muted transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          למסך הראשי
        </Link>
        <h1 className="font-display text-[2.6rem] leading-[1.05] sm:text-6xl">סרטונים</h1>
      </div>

      {playlists.length === 0 && (
        <p className="mx-5 mt-8 rounded-[2rem] border-2 border-dashed border-lake/40 p-8 text-center text-lg text-muted sm:mx-8">
          עוד אין כאן פלייליסטים.
        </p>
      )}

      {playlists.map((p) => (
        <section key={p.id} className="mt-10 sm:mt-12" aria-labelledby={`pl-${p.id}`}>
          <div className="mb-3 flex items-baseline gap-3 px-5 sm:px-8">
            <h2 id={`pl-${p.id}`} className="font-display text-2xl sm:text-3xl">{p.title}</h2>
            {!p.failed && <span className="text-muted">{p.videos.length} סרטונים</span>}
          </div>

          {p.failed ? (
            <p className="mx-5 rounded-2xl bg-lake/8 p-5 text-muted sm:mx-8">
              לא הצלחנו לטעון את הפלייליסט מיוטיוב. נסו לרענן את הדף בעוד כמה דקות.
            </p>
          ) : (
            <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-3 [scrollbar-width:thin] sm:scroll-px-8 sm:gap-4 sm:px-8">
              {p.videos.map((v) => (
                <li key={v.id} className="w-64 shrink-0 snap-start sm:w-72">
                  <a
                    href={`https://www.youtube.com/watch?v=${v.id}&list=${p.youtube_playlist_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block rounded-2xl"
                  >
                    <div className="relative aspect-video overflow-hidden rounded-2xl bg-lake/15">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={v.thumbnail}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                      {v.duration && (
                        <span dir="ltr" className="absolute bottom-2 left-2 rounded-md bg-ink/80 px-1.5 py-0.5 text-sm font-semibold text-white">
                          {v.duration}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-2 font-semibold leading-snug">{v.title}</p>
                    {v.publishedAt && (
                      <p className="text-sm text-muted">{dateFormat.format(new Date(v.publishedAt))}</p>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </main>
  );
}
