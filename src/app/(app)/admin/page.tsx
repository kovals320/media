import { BackLink } from "@/components/BackLink";
import { requireAdmin } from "@/lib/auth";
import { getFolderMismatches, type FolderMismatch } from "@/lib/immich";
import { AddPlaylistForm, RefreshYouTubeButton, RemoveButton, VideoTitleForm } from "./Forms";
import { removePlaylist, removeVideoTitle } from "./actions";
import { loadVideos } from "../videos/loadVideos";
import { yearInTitle } from "@/lib/sort";

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
        <p className="mt-1 text-muted">הפלייליסטים הם רק מקור: כל הסרטים מכולם מוצגים יחד, לפי השנה שבכותרת. סרטים בלי שנה מופיעים ראשונים.</p>
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
                confirmText={`להסיר את "${p.title}" מהאפליקציה? הסרטים נשארים ביוטיוב.`}
              />
            </li>
          ))}
        </ul>
        <AddPlaylistForm />
        <RefreshYouTubeButton />
      </section>
      <VideoTitlesSection />
      <PhotoDatesReport />
    </main>
  );
}

const dateFormat = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

async function PhotoDatesReport() {
  let folders: FolderMismatch[] | null = null;
  try {
    folders = await getFolderMismatches();
  } catch {
    folders = null;
  }
  const total = folders?.reduce((n, f) => n + f.photos.length, 0) ?? 0;

  return (
    <section className="mt-12" aria-labelledby="dates-h">
      <h2 id="dates-h" className="font-display text-2xl sm:text-3xl">תמונות בתיקייה של שנה אחרת</h2>
      <p className="mt-1 text-muted">
        באפליקציה כל תמונה מופיעה בשנה שבה צולמה, לפי התאריך שבקובץ. כאן מופיעות התמונות ששמורות בשרת בתיקייה של
        שנה אחרת, למקרה שתרצו להעביר אותן לתיקייה הנכונה. זה לא חובה: באפליקציה הן כבר מופיעות במקום הנכון.
      </p>

      {folders === null ? (
        <p className="mt-4 rounded-2xl bg-red-50 p-4 text-red-800">שרת התמונות לא זמין כרגע.</p>
      ) : total === 0 ? (
        <p className="mt-4 rounded-2xl bg-lake/10 p-4 text-lake-deep">כל התמונות נמצאות בתיקייה של השנה שבה צולמו.</p>
      ) : (
        <>
          <p className="mt-4 font-semibold">
            {total.toLocaleString("he-IL")} תמונות ב-{folders.length} תיקיות
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {folders.map((f) => (
              <details key={f.folder} className="group rounded-2xl bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                  <span className="font-semibold">תיקיית {f.folder}</span>
                  <span className="text-muted">
                    {f.photos.length} מתוך {f.total.toLocaleString("he-IL")}
                    <span aria-hidden className="ms-2 inline-block transition-transform group-open:rotate-90">‹</span>
                  </span>
                </summary>
                <ul className="grid grid-cols-1 gap-2 px-4 pb-4 sm:grid-cols-2">
                  {f.photos.map((p) => (
                    <li key={p.id} className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/photo/${p.id}/thumb`} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-lg bg-sun/20 object-cover" />
                      <div className="min-w-0">
                        <p dir="ltr" className="truncate text-end text-sm font-semibold">{p.file}</p>
                        <p className="text-sm text-muted">
                          צולמה {p.taken ? dateFormat.format(new Date(p.taken)) : "בתאריך לא ידוע"} · מופיעה ב-{p.year}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

async function VideoTitlesSection() {
  let videos: Awaited<ReturnType<typeof loadVideos>>["videos"] = [];
  try {
    ({ videos } = await loadVideos());
  } catch {
    return null;
  }
  const renamed = videos.filter((v) => v.youtubeTitle && v.title !== v.youtubeTitle);
  const noYear = videos.filter((v) => yearInTitle(v.title) === null);

  const Row = ({ v }: { v: (typeof videos)[number] }) => (
    <div className="flex gap-3 px-4 py-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={v.thumbnail} alt="" loading="lazy" className="aspect-video w-24 shrink-0 rounded-lg object-cover sm:w-32" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted">
          ביוטיוב:{" "}
          <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
            {v.youtubeTitle ?? v.title}
          </a>
        </p>
        <VideoTitleForm videoId={v.id} youtubeTitle={v.youtubeTitle ?? v.title} current={v.title} />
      </div>
    </div>
  );

  return (
    <section className="mt-12" aria-labelledby="titles-h">
      <h2 id="titles-h" className="font-display text-2xl sm:text-3xl">שמות הסרטים באפליקציה</h2>
      <p className="mt-1 text-muted">
        אפשר לתת לסרט שם אחר שיוצג רק באפליקציה, למשל להוסיף שנה לסרט מערוץ אחר. ביוטיוב שום דבר לא משתנה. מחיקת השם
        ושמירה מחזירות לשם שביוטיוב.
      </p>

      <h3 className="mt-6 font-semibold">סרטים בלי שנה בשם ({noYear.length})</h3>
      {noYear.length === 0 ? (
        <p className="mt-2 rounded-2xl bg-lake/10 p-4 text-lake-deep">לכל הסרטים יש שנה בשם.</p>
      ) : (
        <ul className="mt-2 divide-y divide-ink/10 rounded-2xl bg-white">
          {noYear.map((v) => (
            <li key={v.id}>
              <Row v={v} />
            </li>
          ))}
        </ul>
      )}

      {renamed.length > 0 && (
        <>
          <h3 className="mt-6 font-semibold">סרטים ששמם שונה באפליקציה ({renamed.length})</h3>
          <ul className="mt-2 divide-y divide-ink/10 rounded-2xl bg-white">
            {renamed.map((v) => (
              <li key={v.id} className="relative">
                <Row v={v} />
                <div className="px-4 pb-3 sm:absolute sm:left-2 sm:top-2 sm:p-0">
                  <RemoveButton
                    action={removeVideoTitle.bind(null, v.id)}
                    confirmText={`להחזיר את "${v.title}" לשם שביוטיוב?`}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
