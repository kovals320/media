import { NextResponse } from "next/server";
import { loadVideos } from "@/app/(app)/videos/loadVideos";

export const dynamic = "force-dynamic";

// TEMPORARY: do the videos have a YouTube "recording date"?
export async function GET() {
  const { videos } = await loadVideos();
  const key = process.env.YOUTUBE_API_KEY!;
  const found: { title: string; recordingDate: string | null; published: string | null }[] = [];
  for (let i = 0; i < videos.length; i += 50) {
    const batch = videos.slice(i, i + 50);
    const qs = new URLSearchParams({ part: "recordingDetails,snippet", id: batch.map((v) => v.id).join(","), key });
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${qs}`, { cache: "no-store" });
    const data = (await res.json()) as {
      items: { recordingDetails?: { recordingDate?: string }; snippet?: { title?: string; publishedAt?: string } }[];
    };
    for (const it of data.items ?? []) {
      found.push({
        title: it.snippet?.title ?? "",
        recordingDate: it.recordingDetails?.recordingDate ?? null,
        published: it.snippet?.publishedAt?.slice(0, 10) ?? null,
      });
    }
  }
  return NextResponse.json({
    total: found.length,
    withRecordingDate: found.filter((f) => f.recordingDate).length,
    sample: found.filter((f) => f.recordingDate).slice(0, 10),
    publishedSample: found.slice(0, 8).map((f) => `${f.published} | ${f.title}`),
  });
}
