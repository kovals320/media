import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { requireMember } from "@/lib/auth";
import { signPaths } from "@/lib/photos";
import { sortByTitleYear } from "@/lib/sort";
import { NewAlbum } from "./NewAlbum";

export const metadata = { title: "תמונות – המדיה של המשפחה" };

type Album = { id: string; title: string; created_at: string };
type PhotoRef = { album_id: string; thumb_path: string };

export default async function PhotosPage() {
  const { supabase } = await requireMember();

  const [{ data: albumRows }, { data: photoRows }] = await Promise.all([
    supabase.from("media_albums").select("id, title, created_at"),
    supabase
      .from("media_photos")
      .select("album_id, thumb_path")
      .order("taken_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
  ]);

  const albums = sortByTitleYear((albumRows ?? []) as Album[], (a) => a.title, (a) => a.created_at);

  const counts = new Map<string, number>();
  const covers = new Map<string, string>();
  for (const p of (photoRows ?? []) as PhotoRef[]) {
    counts.set(p.album_id, (counts.get(p.album_id) ?? 0) + 1);
    if (!covers.has(p.album_id)) covers.set(p.album_id, p.thumb_path);
  }
  const urls = await signPaths(supabase, [...covers.values()]);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-12 pt-6 sm:px-8 sm:pt-10">
      <BackLink />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-[2.6rem] leading-[1.05] sm:text-6xl">תמונות</h1>
        <NewAlbum />
      </div>

      {albums.length === 0 ? (
        <div className="mt-8 rounded-[2rem] border-2 border-dashed border-sun-deep/50 p-10 text-center text-lg text-muted">
          עוד אין אלבומים. צרו את האלבום הראשון והוסיפו אליו תמונות.
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
          {albums.map((a) => {
            const cover = covers.get(a.id);
            const coverUrl = cover ? urls.get(cover) : undefined;
            const count = counts.get(a.id) ?? 0;
            return (
              <li key={a.id}>
                <Link href={`/photos/${a.id}`} className="group block rounded-2xl">
                  <div className="relative aspect-square">
                    {/* a second print peeking out behind the cover */}
                    <div aria-hidden className="absolute inset-0 translate-x-1.5 -rotate-3 rounded-2xl bg-sun/70 transition-transform duration-300 group-hover:-rotate-6" />
                    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-sun/40">
                      {coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted">ריק</div>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 font-semibold leading-snug">{a.title}</p>
                  <p className="text-sm text-muted">{count === 1 ? "תמונה אחת" : `${count} תמונות`}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
