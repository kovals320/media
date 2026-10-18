"use client";

import Link from "next/link";
import { useState } from "react";
import type { PersonSummary } from "@/lib/immich";

function Face({ person }: { person: PersonSummary }) {
  // Immich's face picture; if it can't be loaded, one of the person's photos.
  const [src, setSrc] = useState(`/api/person/${person.id}`);
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
  return (
    <section className="mt-8" aria-labelledby="people-h">
      <h2 id="people-h" className="mb-3 font-display text-2xl sm:text-3xl">אנשים</h2>
      <ul className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:thin] sm:-mx-8 sm:px-8">
        {people.map((p) => (
          <li key={p.id} className="shrink-0">
            <Link href={`/photos/person/${p.id}`} className="group flex w-20 flex-col items-center gap-1.5 sm:w-24">
              <Face person={p} />
              <span className="line-clamp-2 text-center font-semibold leading-tight">{p.name}</span>
              <span className="text-xs text-muted">{p.count.toLocaleString("he-IL")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
