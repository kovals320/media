"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { PersonSummary } from "@/lib/immich";
import { matches, normalize } from "@/lib/search";

function Face({ person }: { person: PersonSummary }) {
  // Immich's face picture; if it can't be loaded, one of the person's photos.
  const [src, setSrc] = useState(`/api/person/${person.id}?v=2`);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setSrc(`/api/photo/${person.coverId}/thumb`)}
      className="h-20 w-20 rounded-full bg-sun/30 object-cover ring-2 ring-transparent transition group-hover:ring-sun-deep sm:h-24 sm:w-24"
    />
  );
}

export function PeopleRow({ people }: { people: PersonSummary[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const index = useMemo(() => people.map((p) => normalize(p.name)), [people]);
  const searching = normalize(query) !== "";
  const shown = searching ? matches(index, query).map((i) => people[i]) : people;

  return (
    <section className="mt-8" aria-labelledby="people-h">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 id="people-h" className="font-display text-2xl sm:text-3xl">אנשים</h2>
        <form
          role="search"
          className="relative min-w-0 flex-1 sm:max-w-xs"
          onSubmit={(e) => {
            e.preventDefault();
            if (shown.length === 1) router.push(`/photos/person/${shown[0].id}`);
          }}
        >
          <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-muted stroke-2">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש לפי שם"
            aria-label="חיפוש אדם לפי שם"
            enterKeyHint="search"
            className="w-full rounded-xl border-2 border-ink/10 bg-white py-2 pe-10 ps-10 outline-none transition-colors focus:border-lake [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="ניקוי החיפוש"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:bg-ink/5 hover:text-ink"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </form>
      </div>
      {searching && shown.length === 0 ? (
        <p role="status" className="py-6 text-muted">לא נמצא אף אחד בשם הזה</p>
      ) : (
        <ul className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:thin] sm:-mx-8 sm:px-8">
          {shown.map((p) => (
            <li key={p.id} className="shrink-0">
              <Link href={`/photos/person/${p.id}`} className="group flex w-20 flex-col items-center gap-1.5 sm:w-24">
                <Face person={p} />
                <span className="line-clamp-2 text-center font-semibold leading-tight">{p.name}</span>
                <span className="text-xs text-muted">{p.count.toLocaleString("he-IL")}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
