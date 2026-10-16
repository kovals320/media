# media

Family photos and videos app, served at https://media.dorh.fyi

Stack: Next.js (App Router, TypeScript, Tailwind) on Vercel, Supabase for data, auth and storage.

```bash
npm install
npm run dev
```

## Supabase

Shared Supabase project `home`. All tables for this app use the `media_` prefix.
Copy `.env.example` to `.env.local` and fill in the values for local development.
Connection check: `/api/health`.
