import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";
import { loadVideos } from "./loadVideos";
import { VideoBrowser } from "./VideoBrowser";

type Props = { searchParams: Promise<{ v?: string }> };

// A shared link (/videos?v=ID) shows that video's title and picture in WhatsApp etc.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { v } = await searchParams;
  const base: Metadata = { title: "סרטונים – המדיה של המשפחה" };
  if (!v) return base;
  const { videos } = await loadVideos();
  const video = videos.find((x) => x.id === v);
  if (!video) return base;
  return {
    title: `${video.title} – המדיה של המשפחה`,
    openGraph: {
      title: video.title,
      description: "סרטון מהמדיה של המשפחה",
      images: [{ url: video.thumbnail }],
      type: "video.other",
    },
  };
}

export default async function VideosPage({ searchParams }: Props) {
  const { v } = await searchParams;
  const { videos, someFailed } = await loadVideos();
  const initialIndex = v ? videos.findIndex((x) => x.id === v) : -1;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-12 pt-6 sm:px-8 sm:pt-10">
      <BackLink />
      <div className="flex flex-wrap items-baseline gap-x-4">
        <h1 className="font-display text-[2.6rem] leading-[1.05] sm:text-6xl">סרטונים</h1>
        {videos.length > 0 && <span className="text-lg text-muted">{videos.length} סרטונים</span>}
      </div>

      {someFailed && (
        <p className="mt-6 rounded-2xl bg-lake/10 p-4 text-muted">
          חלק מהסרטונים לא נטענו מיוטיוב כרגע. נסו לרענן את הדף בעוד כמה דקות.
        </p>
      )}

      {videos.length === 0 ? (
        <p className="mt-8 rounded-[2rem] border-2 border-dashed border-lake/40 p-8 text-center text-lg text-muted">
          עוד אין כאן סרטונים.
        </p>
      ) : (
        <VideoBrowser videos={videos} initialIndex={initialIndex >= 0 ? initialIndex : null} />
      )}
    </main>
  );
}
