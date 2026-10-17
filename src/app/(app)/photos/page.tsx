import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { getYears, type YearSummary } from "@/lib/immich";

export const metadata = { title: "תמונות – המדיה של המשפחה" };

export default async function PhotosPage() {
  let years: YearSummary[] | null = null;
  try {
    years = await getYears();
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
        <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
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
      )}
    </main>
  );
}
