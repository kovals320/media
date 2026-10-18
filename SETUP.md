# How this app was built (and how to build another one like it)

A full record of the `media.dorh.fyi` project, written so a new conversation (or a new person)
can rebuild it, or clone it for another family/domain, without the original chat.

---

## 1. What the app is

A public, read-only family media site (Hebrew, right-to-left, mobile-first):

- **Home**: two tiles, Photos and Films, each with a live total.
- **Photos**: read from a home **Immich** server. One tile per year (newest first), year page is one
  continuous grid (newest photo first), full-screen viewer with swipe, sideways full screen and share links.
- **Films**: read from **YouTube playlists**. All playlists are merged into one list (duplicates removed),
  grouped by the year written in the title, in-app player, share links.
- **Admin** (`/login`, one admin only, no sign-up): add/remove playlists, set display titles for films,
  "refresh content" button, report of photos stored in another year's folder.
- Anyone with the link can view. Nobody but the admin can change anything. Hidden from search engines.

## 2. Architecture

```
GitHub repo ──push──> Vercel (Next.js) ──> media.dorh.fyi   (Cloudflare DNS: CNAME, DNS only / grey cloud)
                           │
                           ├── Supabase (shared project "home"): playlists, display titles, admin list, admin login
                           ├── YouTube Data API (server-side key): playlist contents
                           └── Immich at photos.dorh.fyi (Cloudflare Tunnel to the home server, read-only API key)
                                 └── photos are served through the app: /api/photo/[id]/thumb|full (cached on Vercel's CDN)
```

Stack: Next.js 16 (App Router, TypeScript), Tailwind v4, `@supabase/ssr`, fonts Secular One + Assistant.

## 3. Accounts and where things live

| Service | What | Notes |
|---|---|---|
| GitHub | `kovals320/media` | Vercel deploys every push to `main` |
| Vercel | team "Apps" (`apps-2265`), project `media` | The Vercel connector in Claude could not create projects in this team (403), so the import was done in the browser |
| Cloudflare | zone `dorh.fyi` | `media` CNAME to Vercel (DNS only). `photos` = Cloudflare Tunnel to Immich |
| Supabase | shared project `home` (`pjujibzoscawmstarerz`) | Shared with other apps, so **every table/function/bucket uses the `media_` prefix** |
| Immich | home server `192.168.1.253`, Ubuntu + Docker | Immich v3.3.3, port 2283 |
| YouTube | playlist(s) on the family channel | Videos and playlists must be **Unlisted** (not Private) |

## 4. Environment variables (Vercel, all environments)

| Name | Type | Value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Config | `https://<project>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Config | Supabase publishable key (`sb_publishable_...`) |
| `YOUTUBE_API_KEY` | **Secret** | Google Cloud key restricted to YouTube Data API v3, no application restriction |
| `IMMICH_URL` | Config | `https://photos.<domain>` |
| `IMMICH_API_KEY` | **Secret** | Immich key with read-only permissions (see 7) |

`/api/health` checks Supabase, YouTube and Immich.

## 5. Supabase schema (prefix `media_`)

Run as one migration in a new project (change the admin email):

```sql
-- Admins who can sign in and edit (everyone else views publicly). Locked: change only via SQL.
create table public.media_members (
  email text primary key check (email = lower(email)),
  display_name text,
  role text not null default 'admin' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);
alter table public.media_members enable row level security;
insert into public.media_members (email, display_name, role) values ('dor@kne.org.il', 'דור', 'admin');

create or replace function public.media_is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.media_members where email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
create or replace function public.media_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.media_members
                 where email = lower(coalesce(auth.jwt() ->> 'email', '')) and role = 'admin');
$$;
revoke execute on function public.media_is_member() from public, anon;
revoke execute on function public.media_is_admin() from public, anon;
grant execute on function public.media_is_member() to authenticated;
grant execute on function public.media_is_admin() to authenticated;

create policy "media_members read by members" on public.media_members
  for select to authenticated using (public.media_is_member());
create policy "media_members locked" on public.media_members
  for all to authenticated using (false) with check (false);

-- YouTube playlists (sources only; all videos are merged)
create table public.media_playlists (
  id uuid primary key default gen_random_uuid(),
  youtube_playlist_id text not null unique,
  title text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.media_playlists enable row level security;
create policy "media_playlists public read" on public.media_playlists
  for select to anon, authenticated using (true);
create policy "media_playlists managed by admins" on public.media_playlists
  for all to authenticated using (public.media_is_admin()) with check (public.media_is_admin());

-- Display titles set in the app (e.g. add a year to a video from another channel). YouTube unchanged.
create table public.media_video_titles (
  video_id text primary key check (video_id ~ '^[A-Za-z0-9_-]{6,20}$'),
  title text not null check (length(trim(title)) > 0),
  updated_at timestamptz not null default now()
);
alter table public.media_video_titles enable row level security;
create policy "media_video_titles public read" on public.media_video_titles
  for select to anon, authenticated using (true);
create policy "media_video_titles managed by admins" on public.media_video_titles
  for all to authenticated using (public.media_is_admin()) with check (public.media_is_admin());
```

Supabase Auth: add `https://<domain>/**` to **Authentication → URL Configuration → Redirect URLs**
(do not change the Site URL if the project is shared), so password-reset links come back to this app.
The admin signs in with an existing Supabase user (email + password). There is no sign-up in the app.

## 6. YouTube

- Playlists (and the videos in them) must be **Unlisted** or Public. Private ones can't be read with an API key and are skipped.
- **Sorting** = the year written in the title (`1950–2099`, anywhere in the title). Titles without a year come first.
  Within a year, by upload date. YouTube keeps no "filmed on" date (it strips file metadata; "Recording date" is usually empty).
- The app removes duplicates by video ID. YouTube's playlist count includes duplicates and private videos, so it is often higher.
  Bulk "Add to playlist" in YouTube Studio adds duplicates; a clean way is to create a fresh playlist from Studio → Content → select all → Add to playlist → new.
- Videos from other channels: save them to one of your playlists. If the title has no year, set a display title on the admin page.
- Results are cached 30 minutes (tag `youtube`); the admin "refresh content" button clears it.

## 7. Immich (photos)

**Server layout**
- Photos live on the server in `/home/dor/Pictures/<year>/...`, mounted **read-only** into Immich:
  `- /home/dor/Pictures:/mnt/external-pictures:ro` in `~/immich-app/docker-compose.yml`.
- One **External Library per year**, named exactly the year (`2005`, `2006`, ...), import path `/mnt/external-pictures/<year>`.
  The app only shows external libraries whose name is a year, so phone-backup uploads stay private.

**Users**: one admin user that owns the libraries. Photos belong to the user who owns the library; deleting a user deletes its photos.
To switch the admin's email, edit the existing user's email (don't create a new user and delete the old one).

**API key for the app** (Account Settings → API Keys): read-only permissions only:
`asset.read`, `asset.view`, `library.read`, `timeline.read`, `person.read` (plus `library.statistics` optional). Nothing with update/delete/upload.

**Cloudflare Tunnel** (Cloudflare dashboard → Networking → Tunnels → Create tunnel, type Cloudflared):
```bash
sudo docker run -d --name cloudflared --restart unless-stopped cloudflare/cloudflared:latest \
  tunnel --no-autoupdate run --token <token from the Cloudflare page>
```
Then Configure → Routes → Add published application: subdomain `photos`, domain `<domain>`, service `http://192.168.1.253:2283`.
(Free plan limits each upload through the tunnel to 100 MB; upload large files from inside the home network.)

**How the app dates photos** (`src/lib/immich.ts`)
1. A camera wrote real capture info (EXIF make/model present): Immich's date.
2. Otherwise, a date in the file name: WhatsApp `IMG-YYYYMMDD-WA####`, Pixel `PXL_YYYYMMDD_HHMMSS`, `IMG_YYYYMMDD_HHMMSS`, screenshots...
   (WhatsApp strips EXIF, so Immich would otherwise use the copy date.) Switch: `USE_FILENAME_DATES`.
3. Otherwise Immich's date. The year a photo appears under = the year of that date (folder only if no date).
- **People** (face recognition): run Face Detection + Facial Recognition jobs in Immich, name people (Explore → People), hide unwanted faces.
  Only named, non-hidden people appear. Add `person.read` to the API key for round face pictures.
- Year covers: photos marked **favorite (heart)** in Immich; several in a year rotate daily. No heart: a fixed photo.
- Lists cached 1 hour (tag `immich`); the admin "refresh content" button clears it.

**Day-to-day routine**
- Add photos: copy into the year folder (`scp "C:\path\*" dor@192.168.1.253:/home/dor/Pictures/2026/`), Immich → Administration →
  External Libraries → **Scan All Libraries**, then "refresh content" in the app.
- Remove photos from the site permanently: delete in Immich, run `~/hide-deleted.sh` (answer lowercase `y`), then scan.
- Bring back a photo deleted in the past: empty Immich's trash first (or restore it), then copy the file back and scan.
  (Otherwise Immich still sees it as trashed, and `hide-deleted.sh` would move it out again.)

**`~/hide-deleted.sh`** (moves files that are in Immich's trash out of the scanned folder, so a scan can't bring them back):
```bash
#!/bin/bash
SRC=/home/dor/Pictures
DEST=/home/dor/Pictures-hidden
LIST=$(mktemp)
sudo docker exec immich_postgres psql -U postgres -d immich -At -c "select \"originalPath\" from asset where \"deletedAt\" is not null and \"originalPath\" like '/mnt/external-pictures/%';" \
  | sed 's#^/mnt/external-pictures/##' \
  | while IFS= read -r f; do if [ -f "$SRC/$f" ]; then printf '%s\n' "$f"; fi; done > "$LIST"
COUNT=$(wc -l < "$LIST")
if [ "$COUNT" -eq 0 ]; then echo "No new deleted photos to move."; rm -f "$LIST"; exit 0; fi
echo "Found $COUNT deleted photos still in the photos folder:"
cut -d/ -f1 "$LIST" | sort | uniq -c
read -r -p "Move them to $DEST? (y/n) " ok
if [ "$ok" != "y" ]; then echo "Nothing moved."; rm -f "$LIST"; exit 0; fi
rsync -a --remove-source-files --files-from="$LIST" "$SRC/" "$DEST/"
echo "Moved $COUNT photos. Now run 'Scan All Libraries' in Immich."
rm -f "$LIST"
```

**Backup** to an external disk (NTFS, mounted at `/mnt/backup`, into its own folder only):
```bash
sudo mkdir -p /mnt/backup && sudo mount /dev/sda1 /mnt/backup
sudo mkdir -p /mnt/backup/family-media-backup/immich-app
sudo rsync -rt --info=progress2 /home/dor/Pictures /home/dor/Pictures-hidden /mnt/backup/family-media-backup/
sudo cp ~/immich-app/docker-compose.yml ~/immich-app/.env /mnt/backup/family-media-backup/immich-app/
sudo cp ~/hide-deleted.sh /mnt/backup/family-media-backup/
```

## 8. Cloning this project for another family / domain

1. **GitHub**: new repo, copy this code (everything except `.git`).
2. **Change in the code**:
   - Hebrew site name `המדיה של המשפחה` (home title, `layout.tsx` metadata, page titles).
   - Admin email in the Supabase migration.
   - Table prefix if sharing a Supabase project with this app (e.g. `media2_`): rename tables/functions in SQL **and** in the code
     (`grep -rn "media_" src`). With a new, separate Supabase project the prefix can stay.
   - `src/lib/immich.ts`: library names must still be years; adjust if the other server is organised differently.
3. **Supabase**: new project (or the shared one with a new prefix) → run the SQL in section 5 → add the redirect URL.
4. **Vercel**: import the repo, add the 5 environment variables (section 4).
5. **Cloudflare**: on the other domain, add the Vercel domain in Vercel, then the CNAME it asks for (DNS only).
   Create a new tunnel for the other Immich server (`photos.<other domain>`).
6. **Immich on the other computer**: external libraries per year, read-only mount, read-only API key.
7. **YouTube**: Unlisted playlist(s), add them on the admin page, YouTube API key (can reuse a key or create a new one).
8. Check `/api/health`, then the home page, Photos and Films.

## 9. Lessons and gotchas from building it

- The sandbox couldn't reach the npm registry, so the starter was written by hand; Vercel installs packages at build time.
- The Vercel connector returned 403 for the team, so project import/domain were done in the browser.
- Destructive SQL (dropping tables) through the Supabase connector was cancelled twice; the user deleted them in the dashboard.
- Storage policies on `storage.objects` can't be altered by migrations here (`must be owner`).
- Hebrew: "סרטון" ends with a final nun (ן) while "סרטונים" has a regular nun (נ), so a search for one doesn't match the other.
- Play icons are not mirrored in RTL. Swiping right = next photo (like turning a Hebrew page).
- Never type passwords or secret keys for the user; they paste keys into Vercel themselves (Secret type).

## 10. Working preferences of the owner (Dor)

- Writes in Hebrew; **replies in English**.
- For server / SSH work: **one step at a time**, wait for the output before the next step.
- For app features: build the whole thing and report when done (don't ask at every step).
- Tables of each project get the project's prefix (`media_` here).
