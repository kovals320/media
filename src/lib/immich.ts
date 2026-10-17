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
  isFavorite?: boolean;
  visibility?: string;
  exifInfo?: { make?: string | null; model?: string | null } | null;
};
type SearchResponse = { assets: { items: SearchItem[]; nextPage: string | null } };

/** A photo as stored in our cache: which folder (year library) it's in and when it was taken. */
type CatalogPhoto = Photo & { folder: string; file: string; fav: boolean };

const isYear = (name: string) => /^(19|20)\d\d$/.test(name.trim());

// Only the year folders (external libraries) are shown, never other uploads such as phone backups.
const listYearLibraries = unstable_cache(
  async () => {
    const libs = await immich<Library[]>("/api/libraries");
    return libs.filter((l) => isYear(l.name)).map((l) => ({ id: l.id, folder: l.name.trim() }));
  },
  ["immich-libraries-v4"],
  { revalidate: HOUR, tags: [IMMICH_CACHE_TAG] },
);

function visible(item: SearchItem) {
  return item.type === "IMAGE" && !item.isTrashed && item.visibility !== "hidden" && item.visibility !== "locked";
}

// Photos with no real capture date (e.g. WhatsApp, which strips it) get the date
// written in their file name instead of the date the file was copied.
// Set to false to go back to Immich's date only.
const USE_FILENAME_DATES = true;

const pad = (n: number, len = 2) => String(n).padStart(len, "0");

/** A capture date written in a file name, e.g. IMG-20260219-WA0012.jpg or PXL_20260727_153444908.jpg. */
export function dateFromFileName(name: string): string | null {
  // WhatsApp: date only; the WA counter keeps that day's photos in order.
  const wa = name.match(/(?:^|\D)((?:19|20)\d{2})(\d{2})(\d{2})-WA(\d{1,5})/i);
  if (wa) {
    const [, y, m, d, n] = wa;
    const seq = Math.min(Number(n), 86399);
    return `${y}-${m}-${d}T${pad(Math.floor(seq / 3600))}:${pad(Math.floor((seq % 3600) / 60))}:${pad(seq % 60)}.000Z`;
  }
  // Date and time: PXL_20260727_153444908, IMG_20260727_153444, Screenshot_20260727-153444, 20260727_153444
  const dt = name.match(/(?:^|\D)((?:19|20)\d{2})(\d{2})(\d{2})[_-](\d{2})(\d{2})(\d{2})/);
  if (dt) {
    const [, y, m, d, hh, mm, ss] = dt;
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}.000Z`;
  }
  // Date only: IMG-20260219, Photo_20260219
  const d8 = name.match(/(?:^|\D)((?:19|20)\d{2})(\d{2})(\d{2})(?:\D|$)/);
  if (d8) {
    const [, y, m, d] = d8;
    return `${y}-${m}-${d}T12:00:00.000Z`;
  }
  return null;
}

function isValidDate(iso: string) {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return false;
  return iso.startsWith(t.toISOString().slice(0, 10)); // rejects e.g. 2026-02-31
}

// Every photo in one year folder (cached per folder to keep each cache entry small).
const getFolderPhotos = unstable_cache(
  async (libraryId: string, folder: string): Promise<CatalogPhoto[]> => {
    const useFileName = USE_FILENAME_DATES;
    const photos: CatalogPhoto[] = [];
    let page: number | null = 1;
    while (page) {
      const res: SearchResponse = await immich<SearchResponse>("/api/search/metadata", {
        method: "POST",
        body: { libraryId, type: "IMAGE", size: 1000, page, withExif: useFileName },
      });
      for (const item of res.assets.items) {
        if (!visible(item)) continue;
        let t = item.localDateTime ?? item.fileCreatedAt ?? null;
        if (useFileName) {
          // A camera wrote real capture info: trust it. Otherwise prefer the name's date.
          const hasCamera = Boolean(item.exifInfo?.make || item.exifInfo?.model);
          const fromName = item.originalFileName ? dateFromFileName(item.originalFileName) : null;
          if (!hasCamera && fromName && isValidDate(fromName)) t = fromName;
        }
        photos.push({
          id: item.id,
          w: item.width ?? null,
          h: item.height ?? null,
          t,
          folder,
          file: item.originalFileName ?? "",
          fav: Boolean(item.isFavorite),
        });
      }
      const next: number = res.assets.nextPage ? Number(res.assets.nextPage) : NaN;
      page = Number.isFinite(next) ? next : null;
    }
    return photos;
  },
  ["immich-folder-photos-v7"],
  { revalidate: HOUR, tags: [IMMICH_CACHE_TAG] },
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

/** Days since 1970 in Israel time, so the chosen cover changes once a day at midnight. */
function dayNumber() {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
  return Math.floor(Date.parse(`${today}T00:00:00Z`) / 86_400_000);
}

/**
 * A year's cover: a photo marked as favorite (heart) in Immich. With several
 * favorites, a different one each day. Without favorites, a fixed photo.
 */
function pickCover(photos: CatalogPhoto[]) {
  const favs = photos.filter((p) => p.fav).sort((a, b) => a.id.localeCompare(b.id));
  if (favs.length > 0) return favs[dayNumber() % favs.length].id;
  return photos[Math.floor(photos.length * 0.37)]?.id ?? null;
}

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
      coverId: pickCover(photos),
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
