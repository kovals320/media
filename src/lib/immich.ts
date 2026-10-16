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
  isTrashed?: boolean;
  visibility?: string;
};
type SearchResponse = { assets: { items: SearchItem[]; nextPage: string | null } };

const isYear = (name: string) => /^(19|20)\d\d$/.test(name.trim());

async function listYearLibraries() {
  const libs = await immich<Library[]>("/api/libraries");
  return libs
    .filter((l) => isYear(l.name))
    .map((l) => ({ id: l.id, year: l.name.trim() }))
    .sort((a, b) => Number(b.year) - Number(a.year)); // newest year first
}

async function countPhotos(libraryId: string): Promise<number | null> {
  try {
    const s = await immich<{ photos?: number }>(`/api/libraries/${libraryId}/statistics`);
    return typeof s.photos === "number" ? s.photos : null;
  } catch {
    return null; // needs the library.statistics permission; the year page counts instead
  }
}

async function pickCover(libraryId: string): Promise<string | null> {
  try {
    const random = await immich<SearchItem[]>("/api/search/random", {
      method: "POST",
      body: { libraryId, size: 1, type: "IMAGE" },
    });
    if (random[0]?.id) return random[0].id;
  } catch {}
  try {
    const first = await immich<SearchResponse>("/api/search/metadata", {
      method: "POST",
      body: { libraryId, size: 1, page: 1, type: "IMAGE" },
    });
    return first.assets.items[0]?.id ?? null;
  } catch {
    return null;
  }
}

export const getYears = unstable_cache(
  async (): Promise<YearSummary[]> => {
    const libs = await listYearLibraries();
    return Promise.all(
      libs.map(async (l) => {
        const [count, coverId] = await Promise.all([countPhotos(l.id), pickCover(l.id)]);
        return { libraryId: l.id, year: l.year, count, coverId };
      }),
    );
  },
  ["immich-years-v1"],
  { revalidate: HOUR, tags: [IMMICH_CACHE_TAG] },
);

function visible(item: SearchItem) {
  return item.type === "IMAGE" && !item.isTrashed && item.visibility !== "hidden" && item.visibility !== "locked";
}

export const getYearPhotos = unstable_cache(
  async (year: string): Promise<Photo[] | null> => {
    const libs = await listYearLibraries();
    const lib = libs.find((l) => l.year === year);
    if (!lib) return null;

    const photos: Photo[] = [];
    let page: number | null = 1;
    while (page) {
      const res: SearchResponse = await immich<SearchResponse>("/api/search/metadata", {
        method: "POST",
        body: { libraryId: lib.id, type: "IMAGE", size: 500, page, order: "asc" },
      });
      for (const item of res.assets.items) {
        if (!visible(item)) continue;
        photos.push({
          id: item.id,
          w: item.width ?? null,
          h: item.height ?? null,
          t: item.localDateTime ?? item.fileCreatedAt ?? null,
        });
      }
      page = res.assets.nextPage ? Number(res.assets.nextPage) : null;
      if (page !== null && !Number.isFinite(page)) page = null;
    }
    // Oldest first within the year, like flipping through an album.
    photos.sort((a, b) => (a.t ?? "").localeCompare(b.t ?? ""));
    return photos;
  },
  ["immich-year-photos-v1"],
  { revalidate: HOUR, tags: [IMMICH_CACHE_TAG] },
);

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
