import { getRecentAdditions } from "@/lib/immich";
import { loadVideos } from "@/app/(app)/videos/loadVideos";

// What was added lately, for the "new since your last visit" labels.
// Photos: [minute, year, count]; films: [seconds, video id]. Cached for 10 minutes.
export async function GET() {
  const from = Date.now() - 120 * 86_400_000;
  const [photos, videos] = await Promise.all([
    getRecentAdditions().catch(() => []),
    loadVideos()
      .then(({ videos }) =>
        videos
          .filter((v) => v.addedAt && Date.parse(v.addedAt) >= from)
          .map((v) => [Math.floor(Date.parse(v.addedAt!) / 1000), v.id] as [number, string]),
      )
      .catch(() => []),
  ]);
  return Response.json(
    { photos, videos },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=3600" } },
  );
}
