# media

Family photos and videos app, served at https://media.dorh.fyi

Stack: Next.js (App Router, TypeScript, Tailwind) on Vercel, Supabase for login, data and photo storage, YouTube for videos.

## How it works

- **Admin:** a single admin (dor@kne.org.il) signs in at `/login` to edit. There is no sign-up. The `media_members` list is locked and can only be changed directly in the database.
- **Videos:** playlists listed in `media_playlists` are only sources. All their videos are merged into one list (duplicates removed), read live from the YouTube Data API (cached 30 min), sorted by the year in each title, newest first; titles without a year come first.
- **Photos:** albums in `media_albums`, photos in `media_photos`. Files live in the private `media-photos` bucket. Photos are resized in the browser before upload (2560px full copy + 640px thumbnail) and shown through signed links.

## Supabase

Shared project `home`. Every table, function and bucket for this app uses the `media_` / `media-` prefix.

## Environment variables

| Name | Where |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel (Config) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel (Config) |
| `YOUTUBE_API_KEY` | Vercel (Secret) |

Copy `.env.example` to `.env.local` for local development. Connection check: `/api/health`.
