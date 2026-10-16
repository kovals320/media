import { BackLink } from "@/components/BackLink";
import { requireAdmin } from "@/lib/auth";
import { AddPlaylistForm, RefreshYouTubeButton, RemoveButton } from "./Forms";
import { removePlaylist } from "./actions";

export const metadata = { title: "ניהול – המדיה של המשפחה" };

type PlaylistRow = { id: string; title: string; youtube_playlist_id: string };

export default async function AdminPage() {
  const { supabase } = await requireAdmin();
  const { data: playlists } = await supabase
    .from("media_playlists")
    .select("id, title, youtube_playlist_id")
    .order("sort_order");

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-16 pt-6 sm:px-8 sm:pt-10">
      <BackLink />
      <h1 className="font-display text-[2.6rem] leading-[1.05] sm:text-6xl">ניהול</h1>

      <section className="mt-10" aria-labelledby="playlists-h">
        <h2 id="playlists-h" className="font-display text-2xl sm:text-3xl">פלייליסטים ביוטיוב</h2>
        <p className="mt-1 text-muted">הפלייליסטים הם רק מקור: כל הסרטונים מכולם מוצגים יחד, לפי השנה שבכותרת. סרטונים בלי שנה מופיעים ראשונים.</p>
        <ul className="mt-4 divide-y divide-ink/10 rounded-2xl bg-white">
          {((playlists ?? []) as PlaylistRow[]).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <a
                href={`https://www.youtube.com/playlist?list=${p.youtube_playlist_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline-offset-4 hover:underline"
              >
                {p.title}
              </a>
              <RemoveButton
                action={removePlaylist.bind(null, p.id)}
                confirmText={`להסיר את "${p.title}" מהאפליקציה? הסרטונים נשארים ביוטיוב.`}
              />
            </li>
          ))}
        </ul>
        <AddPlaylistForm />
        <RefreshYouTubeButton />
      </section>
    </main>
  );
}
