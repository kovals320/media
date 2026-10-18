import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { getPeopleNames, getYearPhotos, type Photo } from "@/lib/immich";
import { YearView } from "./YearView";

type Props = { params: Promise<{ year: string }>; searchParams: Promise<{ p?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { year } = await params;
  const { p } = await searchParams;
  const title = `תמונות ${year} – המדיה של המשפחה`;
  if (!p || !/^[0-9a-f-]{36}$/i.test(p)) return { title };
  // A shared photo link shows the photo itself in WhatsApp etc.
  return {
    title,
    openGraph: { title: `תמונה מ-${year}`, images: [{ url: `/api/photo/${p}/full` }] },
  };
}

export default async function YearPage({ params, searchParams }: Props) {
  const { year } = await params;
  const { p } = await searchParams;
  if (!/^(19|20)\d\d$/.test(year)) notFound();

  let photos: Photo[] | null;
  try {
    photos = await getYearPhotos(year);
  } catch {
    return (
      <main className="mx-auto w-full max-w-6xl px-5 pb-12 pt-6 sm:px-8 sm:pt-10">
        <BackLink href="/photos" label="לכל השנים" />
        <h1 className="font-display text-[2.6rem] leading-[1.05] sm:text-6xl">{year}</h1>
        <p className="mt-8 rounded-[2rem] border-2 border-dashed border-sun-deep/50 p-10 text-center text-lg text-muted">
          שרת התמונות לא זמין כרגע. נסו שוב בעוד כמה דקות.
        </p>
      </main>
    );
  }
  if (!photos) notFound();

  const initialIndex = p ? photos.findIndex((x) => x.id === p) : -1;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-12 pt-6 sm:px-8 sm:pt-10">
      <BackLink href="/photos" label="לכל השנים" />
      <div className="flex flex-wrap items-baseline gap-x-4">
        <h1 className="font-display text-[2.6rem] leading-[1.05] sm:text-6xl">{year}</h1>
        <span className="text-lg text-muted">{photos.length.toLocaleString("he-IL")} תמונות</span>
      </div>
      {photos.length === 0 ? (
        <p className="mt-8 rounded-[2rem] border-2 border-dashed border-sun-deep/50 p-10 text-center text-lg text-muted">
          אין תמונות בשנה הזו.
        </p>
      ) : (
        <YearView
          photos={photos}
          initialIndex={initialIndex >= 0 ? initialIndex : null}
          basePath={`/photos/${year}`}
          label={year}
          people={await namesFor(photos)}
        />
      )}
    </main>
  );
}

/** Names of the people who appear in these photos (for the viewer). */
async function namesFor(photos: Photo[]) {
  const all = await getPeopleNames().catch(() => new Map<string, string>());
  const out: Record<string, string> = {};
  for (const p of photos) for (const id of p.pp ?? []) if (all.has(id)) out[id] = all.get(id)!;
  return out;
}
