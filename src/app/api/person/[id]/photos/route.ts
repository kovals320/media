import { getPersonSamplePhotos } from "@/lib/immich";

// A few photos of a face group, shown while suggesting who it is.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const ids = await getPersonSamplePhotos(id);
    return Response.json(
      { ids },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=3600" } },
    );
  } catch {
    return Response.json({ ids: [] }, { status: 502 });
  }
}
