import "server-only";

// Face tagging. Visitors suggest names for faces; the admin approves them and
// only then are they written into Immich. Writing needs a second Immich key
// (IMMICH_TAG_API_KEY) with face and person write permissions; the main key
// stays read-only.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: unknown): s is string => typeof s === "string" && UUID.test(s);

/** A face in a photo. box = [x1, y1, x2, y2] as fractions (0-1) of the photo. */
export type Face = {
  id: string;
  box: [number, number, number, number];
  aspect: number; // photo width / height
  personId: string | null;
  name: string | null; // null = not named yet
};

function tagConfig() {
  const base = process.env.IMMICH_URL?.replace(/\/$/, "");
  const key = process.env.IMMICH_TAG_API_KEY;
  if (!base || !key) return null;
  return { base, key };
}

export const taggingEnabled = () => tagConfig() !== null;

async function call<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const cfg = tagConfig();
  if (!cfg) throw new Error("IMMICH_TAG_API_KEY is not set");
  const res = await fetch(`${cfg.base}${path}`, {
    method: init?.method ?? "GET",
    headers: { "x-api-key": cfg.key, Accept: "application/json", "Content-Type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Immich ${init?.method ?? "GET"} ${path}: ${res.status} ${text.slice(0, 200)}`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

type ImmichPerson = { id: string; name: string; isHidden: boolean };
type ImmichFace = {
  id: string;
  boundingBoxX1: number;
  boundingBoxY1: number;
  boundingBoxX2: number;
  boundingBoxY2: number;
  imageWidth: number;
  imageHeight: number;
  person: ImmichPerson | null;
};

const clamp = (n: number) => Math.min(1, Math.max(0, n));

/** The faces Immich found in a photo (people hidden in Immich are left out). */
export async function getFaces(assetId: string): Promise<Face[]> {
  if (!isUuid(assetId)) return [];
  const faces = await call<ImmichFace[]>(`/api/faces?id=${assetId}`);
  return faces
    .filter((f) => f.imageWidth > 0 && f.imageHeight > 0 && !f.person?.isHidden)
    .map((f) => ({
      id: f.id,
      box: [
        clamp(f.boundingBoxX1 / f.imageWidth),
        clamp(f.boundingBoxY1 / f.imageHeight),
        clamp(f.boundingBoxX2 / f.imageWidth),
        clamp(f.boundingBoxY2 / f.imageHeight),
      ] as Face["box"],
      aspect: f.imageWidth / f.imageHeight,
      personId: f.person?.id ?? null,
      name: f.person?.name?.trim() || null,
    }))
    .sort((a, b) => b.box[0] - a.box[0]); // right to left, like Hebrew
}

/** Every named person in Immich, by name (to join a suggestion to an existing person). */
async function namedPeople(): Promise<Map<string, ImmichPerson>> {
  const byName = new Map<string, ImmichPerson>();
  for (let page = 1; page < 100; page++) {
    const res = await call<{ people: ImmichPerson[]; hasNextPage?: boolean }>(
      `/api/people?withHidden=true&size=1000&page=${page}`,
    );
    for (const p of res.people) {
      const key = nameKey(p.name ?? "");
      if (key && !byName.has(key)) byName.set(key, p);
    }
    if (!res.hasNextPage || res.people.length === 0) break;
  }
  return byName;
}

export const nameKey = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Writes an approved name into Immich and says what was done.
 * - Face in an unnamed group: the whole group gets the name (or joins the person
 *   who already has it), so every photo of that face is tagged at once.
 * - Face already named as someone else: only this face moves to the right person.
 */
export async function applyName(assetId: string, faceId: string, rawName: string): Promise<string> {
  const name = rawName.trim().replace(/\s+/g, " ");
  const face = (await call<ImmichFace[]>(`/api/faces?id=${assetId}`)).find((f) => f.id === faceId);
  if (!face) throw new Error("הפנים האלה כבר לא נמצאות בתמונה בשרת התמונות.");

  const current = face.person;
  const currentName = current?.name?.trim() ?? "";
  if (current && nameKey(currentName) === nameKey(name)) return `כבר מתויג/ת בשם ${name}.`;

  const existing = (await namedPeople()).get(nameKey(name));

  if (current && !currentName) {
    if (existing && existing.id !== current.id) {
      await call(`/api/people/${existing.id}/merge`, { method: "POST", body: { ids: [current.id] } });
      return `כל התמונות של הפנים האלה צורפו ל${name}.`;
    }
    await call(`/api/people/${current.id}`, { method: "PUT", body: { name } });
    return `כל התמונות של הפנים האלה תויגו בשם ${name}.`;
  }

  const target = existing ?? (await call<ImmichPerson>("/api/people", { method: "POST", body: { name } }));
  await call(`/api/faces/${target.id}`, { method: "PUT", body: { id: faceId } });
  return current
    ? `הפנים בתמונה הזו הועברו מ${currentName} ל${name}.`
    : `הפנים בתמונה הזו תויגו בשם ${name}.`;
}
