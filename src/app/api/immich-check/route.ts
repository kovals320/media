import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// TEMPORARY: inspect the Immich server structure while building the Photos section.
// Returns only structure (names, counts, paths), never the key.
async function call(path: string, init?: RequestInit) {
  const base = process.env.IMMICH_URL?.replace(/\/$/, "");
  const key = process.env.IMMICH_API_KEY;
  if (!base || !key) return { status: 0, body: "missing IMMICH_URL or IMMICH_API_KEY" };
  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: { "x-api-key": key, Accept: "application/json", "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
    const text = await res.text();
    let body: unknown = text.slice(0, 300);
    try {
      body = JSON.parse(text);
    } catch {}
    return { status: res.status, body };
  } catch (e) {
    return { status: -1, body: String(e) };
  }
}

export async function GET() {
  const version = await call("/api/server/version");
  const me = await call("/api/users/me");
  const libraries = await call("/api/libraries");
  const libs = Array.isArray(libraries.body) ? (libraries.body as Record<string, unknown>[]) : [];
  const firstLib = libs[0];
  const stats = firstLib ? await call(`/api/libraries/${firstLib.id}/statistics`) : null;
  const paths = await call("/api/view/folder/unique-paths");
  const pathList = Array.isArray(paths.body) ? (paths.body as string[]) : [];
  const search = firstLib
    ? await call("/api/search/metadata", {
        method: "POST",
        body: JSON.stringify({ libraryId: firstLib.id, size: 2, type: "IMAGE", order: "asc" }),
      })
    : null;
  const items =
    (search?.body as { assets?: { items?: Record<string, unknown>[]; total?: number; nextPage?: unknown } })?.assets;
  const sample = items?.items?.[0];
  const albums = await call("/api/albums");
  const buckets = await call("/api/timeline/buckets");

  return NextResponse.json({
    version: version.body,
    me: { status: me.status, name: (me.body as { name?: string })?.name },
    libraries: {
      status: libraries.status,
      list: libs.map((l) => ({ id: l.id, name: l.name, importPaths: l.importPaths, assetCount: l.assetCount })),
      error: libraries.status !== 200 ? libraries.body : undefined,
    },
    firstLibraryStats: stats,
    folders: {
      status: paths.status,
      count: pathList.length,
      sample: pathList.slice(0, 60),
      error: paths.status !== 200 ? paths.body : undefined,
    },
    search: {
      status: search?.status,
      total: items?.total,
      nextPage: items?.nextPage,
      sampleKeys: sample ? Object.keys(sample) : null,
      sample: sample
        ? {
            id: sample.id,
            type: sample.type,
            originalPath: sample.originalPath,
            originalFileName: sample.originalFileName,
            fileCreatedAt: sample.fileCreatedAt,
            localDateTime: sample.localDateTime,
            libraryId: sample.libraryId,
            width: sample.width,
            height: sample.height,
            thumbhash: sample.thumbhash ? "yes" : "no",
            exifKeys: sample.exifInfo ? Object.keys(sample.exifInfo as object) : null,
          }
        : null,
      error: search && search.status !== 200 ? search.body : undefined,
    },
    albums: { status: albums.status, count: Array.isArray(albums.body) ? albums.body.length : null },
    timelineBuckets: { status: buckets.status, sample: Array.isArray(buckets.body) ? buckets.body.slice(0, 3) : buckets.body },
  });
}
