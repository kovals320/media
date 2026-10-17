import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// TEMPORARY: what date information do the 2026 photos carry? (no images, names only for dated patterns)
type Item = {
  originalFileName: string;
  localDateTime?: string;
  fileCreatedAt?: string;
  fileModifiedAt?: string;
  type: string;
  isTrashed?: boolean;
  exifInfo?: Record<string, unknown> | null;
};

export async function GET() {
  const base = process.env.IMMICH_URL!.replace(/\/$/, "");
  const key = process.env.IMMICH_API_KEY!;
  const libs = (await (await fetch(`${base}/api/libraries`, { headers: { "x-api-key": key }, cache: "no-store" })).json()) as {
    id: string;
    name: string;
  }[];
  const lib = libs.find((l) => l.name === "2026")!;
  const res = await fetch(`${base}/api/search/metadata`, {
    method: "POST",
    headers: { "x-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ libraryId: lib.id, type: "IMAGE", size: 1000, page: 1, withExif: true }),
    cache: "no-store",
  });
  const items = ((await res.json()) as { assets: { items: Item[] } }).assets.items.filter((i) => !i.isTrashed);

  const pattern = (n: string) =>
    n.replace(/\d/g, "9").replace(/^(.{0,40}).*$/, "$1");
  const groups: Record<string, number> = {};
  const rows = items.map((i) => {
    const e = i.exifInfo ?? {};
    const hasCamera = Boolean(e.make || e.model);
    const named = /(19|20)\d{6}/.test(i.originalFileName);
    const k = `${pattern(i.originalFileName)} | camera=${hasCamera}`;
    groups[k] = (groups[k] ?? 0) + 1;
    return {
      name: named ? i.originalFileName : "(other)",
      local: i.localDateTime?.slice(0, 19),
      exifOriginal: typeof e.dateTimeOriginal === "string" ? e.dateTimeOriginal.slice(0, 19) : e.dateTimeOriginal,
      fileCreated: i.fileCreatedAt?.slice(0, 19),
      fileModified: i.fileModifiedAt?.slice(0, 19),
      camera: hasCamera,
    };
  });

  return NextResponse.json({
    total: items.length,
    exifKeys: items[0]?.exifInfo ? Object.keys(items[0].exifInfo) : null,
    groups: Object.entries(groups).sort((a, b) => b[1] - a[1]),
    whatsappSample: rows.filter((r) => r.name.includes("-WA")).slice(0, 5),
    pixelSample: rows.filter((r) => r.name.startsWith("PXL")).slice(0, 3),
    topByLocal: [...rows].sort((a, b) => (b.local ?? "").localeCompare(a.local ?? "")).slice(0, 12),
  });
}
