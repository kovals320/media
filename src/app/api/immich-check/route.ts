import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// TEMPORARY: counts only (no file names, no images) to size the date/folder mismatch.
async function call<T>(path: string, body?: unknown): Promise<{ status: number; data: T | null }> {
  const base = process.env.IMMICH_URL!.replace(/\/$/, "");
  const res = await fetch(`${base}${path}`, {
    method: body ? "POST" : "GET",
    headers: { "x-api-key": process.env.IMMICH_API_KEY!, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch {}
  return { status: res.status, data };
}

type Item = { localDateTime?: string; fileCreatedAt?: string; fileModifiedAt?: string; type: string; isTrashed?: boolean };
type Search = { assets: { items: Item[]; nextPage: string | null } };

export async function GET() {
  const buckets = await call<{ timeBucket: string; count: number }[]>("/api/timeline/buckets");
  const byYear: Record<string, number> = {};
  for (const b of buckets.data ?? []) {
    const y = b.timeBucket.slice(0, 4);
    byYear[y] = (byYear[y] ?? 0) + b.count;
  }

  const taken = await call<Search>("/api/search/metadata", {
    type: "IMAGE",
    size: 3,
    page: 1,
    takenAfter: "2025-01-01T00:00:00.000Z",
    takenBefore: "2026-01-01T00:00:00.000Z",
  });

  const libs = (await call<{ id: string; name: string }[]>("/api/libraries")).data ?? [];
  const report: Record<string, { total: number; mismatched: number; takenIn: Record<string, number>; fileDateOnly: number }> = {};
  await Promise.all(
    libs.map(async (lib) => {
      const r = { total: 0, mismatched: 0, takenIn: {} as Record<string, number>, fileDateOnly: 0 };
      let page: number | null = 1;
      while (page) {
        const res: { status: number; data: Search | null } = await call<Search>("/api/search/metadata", {
          libraryId: lib.id,
          type: "IMAGE",
          size: 1000,
          page,
        });
        const items = res.data?.assets.items ?? [];
        for (const it of items) {
          if (it.isTrashed) continue;
          r.total++;
          const y = (it.localDateTime ?? "").slice(0, 4);
          if (y !== lib.name) {
            r.mismatched++;
            r.takenIn[y || "?"] = (r.takenIn[y || "?"] ?? 0) + 1;
            if (it.fileCreatedAt && it.fileCreatedAt === it.fileModifiedAt) r.fileDateOnly++;
          }
        }
        page = res.data?.assets.nextPage ? Number(res.data.assets.nextPage) : null;
      }
      report[lib.name] = r;
    }),
  );

  return NextResponse.json({
    bucketsStatus: buckets.status,
    timelineByYear: byYear,
    takenFilter: {
      status: taken.status,
      years: taken.data?.assets?.items?.map((i) => (i.localDateTime ?? "").slice(0, 10)),
      error: taken.status !== 200 ? taken.data : undefined,
    },
    folders: Object.fromEntries(Object.entries(report).sort(([a], [b]) => a.localeCompare(b))),
  });
}
