import { getFaces, isUuid, taggingEnabled } from "@/lib/faces";
import { getPeopleNames } from "@/lib/immich";

// The faces in one photo, for tagging in the viewer, plus every known name
// (offered as suggestions while typing). Cached briefly on Vercel's network.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: "not found" }, { status: 404 });
  if (!taggingEnabled()) return Response.json({ disabled: true, faces: [], names: [] }, { status: 503 });

  try {
    const [faces, names] = await Promise.all([getFaces(id), getPeopleNames().catch(() => new Map<string, string>())]);
    const list = [...new Set(names.values())].sort((a, b) => a.localeCompare(b, "he"));
    return Response.json(
      { faces, names: list },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=120, stale-while-revalidate=600" } },
    );
  } catch {
    return Response.json({ error: "unavailable", faces: [], names: [] }, { status: 502 });
  }
}
