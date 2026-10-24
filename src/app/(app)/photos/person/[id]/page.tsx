import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { getPeopleNames, getPersonPhotos, type Photo } from "@/lib/immich";
import { YearView } from "../../[year]/YearView";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ p?: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { id } = await params;
  const { p } = await searchParams;
  const name = UUID.test(id) ? (await getPeopleNames().catch(() => null))?.get(id) : undefined;
  const title = `${name ?? "תמונות"} – המדיה של המשפחה`;
  if (!p || !UUID.test(p)) return { title };
  return { title, openGraph: { title: name ? `תמונה – ${name}` : "תמונה", images: [{ url: `/api/photo/${p}/full` }] } };
}

export default async function PersonPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { p } = await searchParams;
  if (!UUID.test(id)) notFound();

  let person: { name: string; photos: Photo[] } | null;
  let names: Map<string, string>;
  try {
    [person, names] = await Promise.all([getPersonPhotos(id), getPeopleNames()]);
  } catch {
    return (
      <main className="mx-auto w-full max-w-6xl px-5 pb-12 pt-6 sm:px-8 sm:pt-10">
        <BackLink href="/photos" label="לכל התמונות" />
        <p className="mt-8 rounded-[2rem] border-2 border-dashed border-sun-deep/50 p-10 text-center text-lg text-muted">
          שרת התמונות לא זמין כרגע. נסו שוב בעוד כמה דקות.
        </p>
      </main>
    );
  }
  if (!person) notFound();

  const people: Record<string, string> = {};
  for (const photo of person.photos) for (const pid of photo.pp ?? []) if (names.has(pid)) people[pid] = names.get(pid)!;
  const initialIndex = p ? person.photos.findIndex((x) => x.id === p) : -1;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-12 pt-6 sm:px-8 sm:pt-10">
      <BackLink href="/photos" label="לכל התמונות" />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/person/${id}?v=2`}
          alt=""
          className="h-16 w-16 rounded-full bg-sun/30 object-cover sm:h-20 sm:w-20"
          style={{ backgroundImage: `url(/api/photo/${person.photos[0].id}/thumb)`, backgroundSize: "cover" }}
        />
        <h1 className="font-display text-[2.4rem] leading-[1.05] sm:text-6xl">{person.name}</h1>
        <span className="text-lg text-muted">{person.photos.length.toLocaleString("he-IL")} תמונות</span>
      </div>
      <YearView
        photos={person.photos}
        initialIndex={initialIndex >= 0 ? initialIndex : null}
        basePath={`/photos/person/${id}`}
        label={person.name}
        people={people}
      />
    </main>
  );
}
