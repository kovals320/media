import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { getPeople, getUnnamedPeople, getYears, type PersonSummary, type YearSummary } from "@/lib/immich";
import { PeopleRow } from "./PeopleRow";
import { NewInYear } from "@/components/WhatsNew";

export const metadata = { title: "תמונות – המדיה של המשפחה" };

export default async function PhotosPage() {
  let years: YearSummary[] | null = null;
  let people: PersonSummary[] = [];
  let unnamed: string[] = [];
  try {
    [years, people, unnamed] = await Promise.all([
      getYears(),
      getPeople().catch(() => []),
      getUnnamedPeople().catch(() => []),
    ]);
  } catch {
    years = null;
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-12 pt-6 sm:px-8 sm:pt-10">
      <BackLink />
      <div className="flex flex-wrap items-baseline gap-x-4">
        <h1 className="font-display text-[2.6rem] leading-[1.05] sm:text-6xl">תמונות</h1>
        {years && years.length > 0 && (
          <span className="text-lg text-muted">
            {years.reduce((n, y) => n + (y.count ?? 0), 0).toLocaleString("he-IL")} תמונות
          </span>
        )}
      </div>

      {years === null ? (
        <p className="mt-8 rounded-[2rem] border-2 border-dashed border-sun-deep/50 p-10 text-center text-lg text-muted">
          שרת התמונות לא זמין כרגע. נסו שוב בעוד כמה דקות.
        </p>
      ) : years.length === 0 ? (
        <p className="mt-8 rounded-[2rem] border-2 border-dashed border-sun-deep/50 p-10 text-center text-lg text-muted">
          עוד אין כאן תמונות.
        </p>
      ) : (
        <>
        {people.length > 0 && <PeopleRow people={people} />}
        {unnamed.length > 0 && (
          <Link
            href="/photos/who"
            className="group mt-5 flex items-center gap-4 rounded-2xl bg-sun/25 px-4 py-3 transition-colors hover:bg-sun/40"
          >
            <span aria-hidden className="flex shrink-0 -space-x-3 space-x-reverse">
              {unnamed.slice(0, 4).map((id) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={id} src={`/api/person/${id}?v=2`} alt="" loading="lazy" className="h-11 w-11 rounded-full bg-sun/40 object-cover ring-2 ring-paper" />
              ))}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">מכירים את הפנים האלה?</span>
              <span className="block text-sm text-muted">{unnamed.length.toLocaleString("he-IL")} פנים מחכות לשם. עזרו לתייג</span>
            </span>
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-none stroke-current stroke-2 text-muted transition-transform group-hover:-translate-x-1">
              <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        )}
        {people.length > 0 && <h2 className="mt-10 font-display text-2xl sm:text-3xl">שנים</h2>}
        <ul className={`${people.length > 0 ? "mt-4" : "mt-8"} grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4`}>
          {years.map((y) => (
            <li key={y.libraryId}>
              <Link href={`/photos/${y.year}`} className="group block rounded-2xl">
                <div className="relative aspect-square">
                  {/* a second print peeking out behind the cover */}
                  <div aria-hidden className="absolute inset-0 translate-x-1.5 -rotate-3 rounded-2xl bg-sun/70 transition-transform duration-300 group-hover:-rotate-6" />
                  <div className="relative h-full w-full overflow-hidden rounded-2xl bg-sun/40">
                    {y.coverId && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/photo/${y.coverId}/thumb`} alt="" loading="lazy" className="h-full w-full object-cover" />
                    )}
                    <NewInYear year={y.year} />
                  </div>
                </div>
                <p className="mt-3 font-display text-2xl leading-none">{y.year}</p>
                {y.count !== null && (
                  <p className="mt-1 text-sm text-muted">{y.count.toLocaleString("he-IL")} תמונות</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
        </>
      )}
    </main>
  );
}
