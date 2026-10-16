import "server-only";
import { unstable_cache } from "next/cache";

// Photos come from the family Immich server (external libraries, one per year).
// Results are cached for an hour; the admin "refresh" button clears them.
export const IMMICH_CACHE_TAG = "immich";
const HOUR = 3600;

export type YearSummary = {
  libraryId: string;
  year: string;
  count: number | null;
  coverId: string | null;
};

export type Photo = {
  id: string;
  w: number | null;
  h: number | null;
  t: string | null; // local date-time the photo was taken
};

function config() {
  const base = process.env.IMMICH_URL?.replace(/\/$/, "");
  const key = process.env.IMMICH_API_KEY;
  if (!base || !key) throw new Error("IMMICH_URL / IMMICH_API_KEY are not set");
  return { base, key };
}

async function immich<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const { base, key } = config();
  const res = await fetch(`${base}${path}`, {
    method: init?.method ?? "GET",
    headers: { "x-api-key": key, Accept: "application/json", "Content-Type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const err = new Error(`Immich ${path} failed with ${res.status}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

type Library = { id: string; name: string };
type SearchItem = {
  id: string;
  type: string;
  width?: number | null;
  height?: number | null;
  localDateTime?: string | null;
  fileCreatedAt?: string | null;
  originalFileName?: string | null;
  isTrashed?: boolean;
  visibility?: string;
};
type SearchResponse = { assets: { items: SearchItem[]; nextPage: string | null } };

/** A photo as stored in our cache: which folder (year library) it's in and when it was taken. */
type CatalogPhoto = Photo & { folder: string; file: string };

const isYear = (name: string) => /^(19|20)\d\d$/.test(name.trim());

// Only the year folders (external libraries) are shown, never other uploads such as phone backups.
const listYearLibraries = unstable_cache(
  async () => {
    const libs = await immich<Library[]>("/api/libraries");
    return libs.filter((l) => isYear(l.name)).map((l) => ({ id: l.id, folder: l.name.trim() }));
  },
  ["immich-libraries-v2"],
  { revalidate: HOUR, tags: [IMMICH_CACHE_TAG] },
);

function visible(item: SearchItem) {
  return item.type === "IMAGE" && !item.isTrashed && item.visibility !== "hidden" && item.visibility !== "locked";
}

// Every photo in one year folder (cached per folder to keep each cache entry small).
const getFolderPhotos = unstable_cache(
  async (libraryId: string, folder: string): Promise<CatalogPhoto[]> => {
    const photos: CatalogPhoto[] = [];
    let page: number | null = 1;
    while (page) {
      const res: SearchResponse = await immich<SearchResponse>("/api/search/metadata", {
        method: "POST",
        body: { libraryId, type: "IMAGE", size: 1000, page },
      });
      for (const item of res.assets.items) {
        if (!visible(item)) continue;
        photos.push({
          id: item.id,
          w: item.width ?? null,
          h: item.height ?? null,
          t: item.localDateTime ?? item.fileCreatedAt ?? null,
          folder,
          file: item.originalFileName ?? "",
        });
      }
      const next: number = res.assets.nextPage ? Number(res.assets.nextPage) : NaN;
      page = Number.isFinite(next) ? next : null;
    }
    return photos;
  },
  ["immich-folder-photos-v2"],
  { revalidate: HOUR * 6, tags: [IMMICH_CACHE_TAG] },
);

async function getCatalog(): Promise<CatalogPhoto[]> {
  const libs = await listYearLibraries();
  const parts = await Promise.all(libs.map((l) => getFolderPhotos(l.id, l.folder)));
  return parts.flat();
}

/** The year a photo belongs to: the year it was taken, or its folder if it has no date. */
function photoYear(p: CatalogPhoto) {
  const y = p.t?.slice(0, 4);
  return y && /^\d{4}$/.test(y) ? y : p.folder;
}

const strip = ({ id, w, h, t }: CatalogPhoto): Photo => ({ id, w, h, t });

export async function getYears(): Promise<YearSummary[]> {
  const catalog = await getCatalog();
  const byYear = new Map<string, CatalogPhoto[]>();
  for (const p of catalog) {
    const y = photoYear(p);
    const list = byYear.get(y);
    if (list) list.push(p);
    else byYear.set(y, [p]);
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => Number(b) - Number(a)) // newest year first
    .map(([year, photos]) => ({
      libraryId: year,
      year,
      count: photos.length,
      // a stable "random" cover so it stays cached
      coverId: photos[Math.floor(photos.length * 0.37)]?.id ?? null,
    }));
}

export async function getYearPhotos(year: string): Promise<Photo[] | null> {
  const catalog = await getCatalog();
  const photos = catalog.filter((p) => photoYear(p) === year);
  if (photos.length === 0) return null;
  // Newest first within the year.
  photos.sort((a, b) => (b.t ?? "").localeCompare(a.t ?? ""));
  return photos.map(strip);
}

export type FolderMismatch = {
  folder: string;
  total: number;
  photos: { id: string; file: string; taken: string | null; year: string }[];
};

/** Photos whose folder year differs from the year they were taken (shown on the admin page). */
export async function getFolderMismatches(): Promise<FolderMismatch[]> {
  const catalog = await getCatalog();
  const byFolder = new Map<string, FolderMismatch>();
  for (const p of catalog) {
    let entry = byFolder.get(p.folder);
    if (!entry) {
      entry = { folder: p.folder, total: 0, photos: [] };
      byFolder.set(p.folder, entry);
    }
    entry.total++;
    const y = photoYear(p);
    if (y !== p.folder) entry.photos.push({ id: p.id, file: p.file, taken: p.t, year: y });
  }
  return [...byFolder.values()]
    .filter((f) => f.photos.length > 0)
    .sort((a, b) => Number(b.folder) - Number(a.folder))
    .map((f) => ({ ...f, photos: f.photos.sort((a, b) => (a.taken ?? "").localeCompare(b.taken ?? "")) }));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Fetches a resized copy of a photo from Immich (never the original file). */
export async function fetchPhotoImage(id: string, size: "thumbnail" | "preview") {
  if (!UUID.test(id)) return null;
  const { base, key } = config();
  const res = await fetch(`${base}/api/assets/${id}/thumbnail?size=${size}`, {
    headers: { "x-api-key": key },
    cache: "no-store",
  });
  if (!res.ok || !res.body) return null;
  return { body: res.body, type: res.headers.get("content-type") ?? "image/jpeg" };
}
