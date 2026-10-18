import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// TEMPORARY: what does Immich return for people? (counts and field names only)
async function call(path: string, body?: unknown) {
  const base = process.env.IMMICH_URL!.replace(/\/$/, "");
  const r = await fetch(`${base}${path}`, {
    method: body ? "POST" : "GET",
    headers: { "x-api-key": process.env.IMMICH_API_KEY!, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  let data: unknown = null;
  try { data = await r.json(); } catch {}
  return { status: r.status, data };
}

export async function GET() {
  const people = await call("/api/people?size=5&page=1&withHidden=false");
  const pd = people.data as { people?: Record<string, unknown>[]; total?: number; hidden?: number; hasNextPage?: boolean; message?: string };
  const first = pd?.people?.[0];
  const stats = first ? await call(`/api/people/${first.id}/statistics`) : null;
  const libs = (await call("/api/libraries")).data as { id: string; name: string }[];
  const lib = libs.find((l) => l.name === "2026");
  const search = await call("/api/search/metadata", { libraryId: lib?.id, type: "IMAGE", size: 50, page: 1, withPeople: true });
  const items = (search.data as { assets?: { items?: Record<string, unknown>[] } })?.assets?.items ?? [];
  const withFaces = items.filter((i) => Array.isArray(i.people) && (i.people as unknown[]).length > 0);
  const byPerson = first ? await call("/api/search/metadata", { personIds: [first.id], size: 3, page: 1 }) : null;
  return NextResponse.json({
    people: { status: people.status, total: pd?.total, hidden: pd?.hidden, hasNextPage: pd?.hasNextPage, keys: first ? Object.keys(first) : null, named: pd?.people?.filter((p) => p.name).length, msg: pd?.message },
    stats: stats ? { status: stats.status, data: stats.data } : null,
    searchWithPeople: { status: search.status, items: items.length, withFaces: withFaces.length, personKeys: withFaces[0] ? Object.keys((withFaces[0].people as Record<string, unknown>[])[0]) : null, msg: (search.data as { message?: string })?.message },
    searchByPerson: byPerson ? { status: byPerson.status, n: (byPerson.data as { assets?: { items?: unknown[] } })?.assets?.items?.length } : null,
  });
}
