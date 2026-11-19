# Porting features from this app (kovals320/media) to another copy

This file is written for a Claude session (or a developer) working on **another** family media app that was built
separately but on the same idea: Next.js App Router + Supabase + YouTube playlists + an Immich server reached
through a Cloudflare tunnel. The other app's code may differ in names and structure, so **adapt, don't paste blindly**:
read the source here, read the target app, then reimplement in the target app's conventions.

Read `SETUP.md` in this repo first (sections 15-17 describe these features and their SQL).

## Features to port

| # | Feature | Commits here (`git show <hash>`) |
|---|---------|----------------------------------|
| 1 | People search box above the face circles on the Photos page | `6d69421` |
| 2 | Face tagging in the photo viewer: "תיוג" button, frames on faces, visitors suggest names | `2529876`, `bd7435e` |
| 3 | Admin approval of suggestions, written into Immich (rename / merge / move one face) | `2529876` |
| 4 | "מי זה?" page (`/photos/who`): all unnamed face groups, suggest a name for a whole group | `d86532d`, `0c1f4c4` |
| 5 | "New since your last visit": home strip, badge on year tiles, "חדש" label on photos and films | `ffb4ff8` |

People from Immich face recognition (`509baf2`, `c32dfb2`, `d7a994c`) are a prerequisite for 1-4. If the target app
does not have people yet, port that first.

## Files involved (current versions on `main`)

Feature 1:
- `src/lib/search.ts` (shared Hebrew-tolerant `normalize`, `matches`; Films search uses it too)
- `src/app/(app)/photos/PeopleRow.tsx`

Features 2-4 (face tagging):
- `src/lib/faces.ts` (server only): `getFaces`, `applyName` (one face), `applyPersonName` (whole group), uses `IMMICH_TAG_API_KEY`
- `src/lib/faceCrop.ts`: CSS crop around a face from the full photo
- `src/app/api/photo/[id]/faces/route.ts`: faces in a photo + all known names
- `src/app/api/suggest/route.ts`: saves a suggestion (face or whole group)
- `src/app/api/person/[id]/photos/route.ts`: sample photos of a group, with face boxes
- `src/app/(app)/photos/[year]/FaceTagger.tsx` + changes in `YearView.tsx` (tag button, `editing` blocks swipe/keys)
- `src/app/(app)/photos/who/page.tsx`, `UnnamedGrid.tsx`; link card in `src/app/(app)/photos/page.tsx`
- `src/lib/immich.ts`: `getUnnamedPeople`, `getImmichPerson`, `getPersonSamplePhotos`
- Admin: `approveSuggestion`, `rejectSuggestion` in `src/app/(app)/admin/actions.ts`; `SuggestionDecision` in `Forms.tsx`; `FaceSuggestions` in `admin/page.tsx`
- `src/app/api/health/route.ts`: `"tagging"` status

Feature 5 (what's new):
- `src/lib/whatsNew.ts` (client): last visit in localStorage, the visit's "since" in sessionStorage
- `src/components/WhatsNew.tsx`: `WhatsNewStrip`, `NewInYear`, `NewLabel`
- `src/app/api/whats-new/route.ts`
- `src/lib/immich.ts`: `a` (Immich `createdAt`, seconds) on each photo, `getRecentAdditions`; bump the catalog cache key
- `src/lib/youtube.ts` + `loadVideos.ts`: `addedAt` = playlist item `snippet.publishedAt`, earliest across playlists
- Used in: home `page.tsx`, Photos `page.tsx`, `YearView.tsx`, `VideoBrowser.tsx`

## Supabase

One table, `<prefix>_face_suggestions`. Use the **target app's table prefix** and its own admin function
(here `media_is_admin()`). Full SQL (both migrations) is in `SETUP.md` sections 15 and 16. Rules:
anyone (anon) may insert a pending row; only the admin reads, updates, deletes.

## Immich: second API key for writing names

The main key stays read-only. Tagging needs a second key, saved in Vercel as `IMMICH_TAG_API_KEY`, with:
`asset.read, face.read, face.update, person.read, person.create, person.update, person.merge`.
The main key also needs `person.read` (for face pictures and unnamed groups).

Lesson learned: a key copied from the Immich web page was rejected (401) several times. Creating it on the server
worked first time. Run this on the target Immich server (it asks for the Immich login, deletes old `media-tagging`
keys, creates and tests a new one, prints it once):

```bash
cat > /tmp/mkkey.py <<'EOF'
import json, getpass, urllib.request as u
B = "http://localhost:2283/api"
def req(path, data=None, h={}, method=None):
    r = u.Request(B + path, data=json.dumps(data).encode() if data is not None else None,
                  headers={"Content-Type": "application/json", **h}, method=method)
    body = u.urlopen(r).read()
    return json.loads(body) if body else None
t = req("/auth/login", {"email": input("Immich email: "), "password": getpass.getpass("Immich password: ")})["accessToken"]
auth = {"Authorization": "Bearer " + t}
for k in req("/api-keys", h=auth):
    if k["name"] == "media-tagging":
        req("/api-keys/" + k["id"], h=auth, method="DELETE"); print("deleted old key")
perms = ["asset.read","face.read","face.update","person.read","person.create","person.update","person.merge"]
key = req("/api-keys", {"name": "media-tagging", "permissions": perms}, auth)["secret"]
req("/people?size=1", h={"x-api-key": key})
print("\nTEST OK. New key (paste into Vercel, do not send it here):\n" + key)
EOF
python3 /tmp/mkkey.py; rm /tmp/mkkey.py
```

Then add it in Vercel and redeploy. `/api/health` should show `"tagging": "connected"`.

## Immich API notes (checked against v3.3.5 and v3.4.1)

- Faces in a photo: `GET /api/faces?id=<assetId>` → boxes in pixels of `imageWidth` × `imageHeight`.
- Move one face to a person: `PUT /api/faces/<personId>` with body `{ "id": "<faceId>" }` (path = person, body = face).
- Name a group: `PUT /api/people/<id>` `{ name }`. Merge: `POST /api/people/<targetId>/merge` `{ ids: [sourceId] }`
  (deprecated in 3.4 but still works). New person: `POST /api/people` `{ name }`.
- Missing key permission → 403; invalid key → 401.

## Owner preferences (same person for both apps)

Replies in English (he writes Hebrew). One step at a time on the server/SSH. For app features: build everything and
report when done. Table prefix per project. Public read-only app with one admin.

## Prompt to paste into the other conversation

> Add to this app the features from my other app: people search, face tagging with admin approval, the "מי זה?"
> page, and "new since last visit". Everything is documented in https://github.com/kovals320/media/blob/main/PORTING.md
> (attach the repo kovals320/media to read it and the source files it lists). Adapt to this app's structure,
> table prefix and Immich server; tell me only what I need to do by hand (the Immich key, Vercel variable).
