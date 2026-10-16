import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// TEMPORARY: counts only, to check what Immich returns for the 2026 folder.
async function search(body: unknown) {
  const base = process.env.IMMICH_URL!.replace(/\/$/, "");
  const res = await fetch(`${base}/api/search/metadata`, {
    method: "POST",
    headers: { "x-api-key": process.env.IMMICH_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return (await res.json()) as { assets: { items: Record<string, unknown>[]; nextPage: string | null; total?: number } };
}

export async function GET() {
  const base = process.env.IMMICH_URL!.replace(/\/$/, "");
  const libs = (await (
    await fetch(`${base}/api/libraries`, { headers: { "x-api-key": process.env.IMMICH_API_KEY! }, cache: "no-store" })
  ).json()) as { id: string; name: string }[];
  const lib = libs.find((l) => l.name === "2026")!;
  const out: Record<string, unknown> = {};
  for (const [label, extra] of [
    ["default", {}],
    ["withDeleted", { withDeleted: true }],
    ["trashedOnly", { trashedAfter: "2000-01-01T00:00:00.000Z" }],
  ] as const) {
    let page: number | null = 1;
    const counts: Record<string, number> = {};
    let n = 0;
    while (page) {
      const r = await search({ libraryId: lib.id, size: 1000, page, ...extra });
      for (const it of r.assets.items) {
        n++;
        const k = `${it.type}|trashed=${it.isTrashed}|vis=${it.visibility}|offline=${it.isOffline}|year=${String(it.localDateTime).slice(0, 4)}`;
        counts[k] = (counts[k] ?? 0) + 1;
      }
      page = r.assets.nextPage ? Number(r.assets.nextPage) : null;
    }
    out[label] = { n, counts };
  }
  return NextResponse.json(out);
}
