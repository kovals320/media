import { getFaces, taggingEnabled } from "@/lib/faces";
import { getPersonSamplePhotos } from "@/lib/immich";

// A few photos of a face group, shown while suggesting who it is. When the
// tagging key is set, each comes with where that face is, so it can be cropped.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const ids = await getPersonSamplePhotos(id);
    const photos = await Promise.all(
      ids.map(async (assetId) => {
        if (!taggingEnabled()) return { id: assetId };
        const face = (await getFaces(assetId).catch(() => [])).find((f) => f.personId === id);
        return face ? { id: assetId, box: face.box, aspect: face.aspect } : { id: assetId };
      }),
    );
    return Response.json(
      { photos },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=3600" } },
    );
  } catch {
    return Response.json({ photos: [] }, { status: 502 });
  }
}
