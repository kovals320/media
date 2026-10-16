import { BackLink } from "@/components/BackLink";
import { requireAdmin } from "@/lib/auth";
import { AddMemberForm, AddPlaylistForm, RemoveButton } from "./Forms";
import { removeMember, removePlaylist } from "./actions";

export const metadata = { title: "ניהול – המדיה של המשפחה" };

type MemberRow = { email: string; display_name: string | null; role: "admin" | "member" };
type PlaylistRow = { id: string; title: string; youtube_playlist_id: string };

export default async function AdminPage() {
  const { supabase, member: me } = await requireAdmin();
  const [{ data: members }, { data: playlists }] = await Promise.all([
    supabase.from("media_members").select("email, display_name, role").order("created_at"),
    supabase.from("media_playlists").select("id, title, youtube_playlist_id").order("sort_order"),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-16 pt-6 sm:px-8 sm:pt-10">
      <BackLink />
      <h1 className="font-display text-[2.6rem] leading-[1.05] sm:text-6xl">ניהול</h1>

      <section className="mt-10" aria-labelledby="members-h">
        <h2 id="members-h" className="font-display text-2xl sm:text-3xl">מנהלים</h2>
        <p className="mt-1 text-muted">
          כל מי שיש לו את הקישור יכול לצפות. רק מנהלים יכולים להוסיף ולמחוק. מנהל חדש נכנס לכתובת
          media.dorh.fyi/login, בוחר &quot;יצירת חשבון&quot; עם אותו אימייל, ומאשר את האימייל שיישלח אליו.
        </p>
        <ul className="mt-4 divide-y divide-ink/10 rounded-2xl bg-white">
          {((members ?? []) as MemberRow[]).map((m) => (
            <li key={m.email} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold">
                  {m.display_name ?? m.email}
                </p>
                {m.display_name && <p dir="ltr" className="truncate text-end text-sm text-muted">{m.email}</p>}
              </div>
              {m.email !== me.email && (
                <RemoveButton
                  action={removeMember.bind(null, m.email)}
                  confirmText={`להסיר את ${m.display_name ?? m.email} מהמנהלים?`}
                />
              )}
            </li>
          ))}
        </ul>
        <AddMemberForm />
      </section>

      <section className="mt-12" aria-labelledby="playlists-h">
        <h2 id="playlists-h" className="font-display text-2xl sm:text-3xl">פלייליסטים ביוטיוב</h2>
        <p className="mt-1 text-muted">הסרטונים בכל פלייליסט מסודרים לפי השנה שבכותרת. סרטונים בלי שנה מופיעים ראשונים.</p>
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
      </section>
    </main>
  );
}
