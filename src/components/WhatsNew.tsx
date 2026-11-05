"use client";

import Link from "next/link";
import { useWhatsNew } from "@/lib/whatsNew";

const photosText = (n: number) => (n === 1 ? "תמונה חדשה" : `${n.toLocaleString("he-IL")} תמונות חדשות`);
const videosText = (n: number) => (n === 1 ? "סרט חדש" : `${n.toLocaleString("he-IL")} סרטים חדשים`);

/** Home page strip: what was added since this phone's previous visit. */
export function WhatsNewStrip() {
  const news = useWhatsNew();
  if (!news || (news.photos === 0 && news.videoIds.size === 0)) return null;
  const years = [...news.byYear.keys()];
  const photosHref = years.length === 1 ? `/photos/${years[0]}` : "/photos";

  return (
    <div role="status" className="mb-5 flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-ink/5">
      <span className="flex items-center gap-2 font-semibold">
        <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-sun-deep" />
        מאז הביקור הקודם נוספו:
      </span>
      {news.photos > 0 && (
        <Link href={photosHref} className="rounded-full bg-sun px-3 py-1 font-semibold text-ink transition-colors hover:bg-sun-deep">
          {photosText(news.photos)}
        </Link>
      )}
      {news.videoIds.size > 0 && (
        <Link href="/videos" className="rounded-full bg-lake px-3 py-1 font-semibold text-white transition-colors hover:bg-lake-deep">
          {videosText(news.videoIds.size)}
        </Link>
      )}
    </div>
  );
}

/** "New" label on a year tile on the Photos page. */
export function NewInYear({ year }: { year: string }) {
  const news = useWhatsNew();
  const n = news?.byYear.get(year) ?? 0;
  if (n === 0) return null;
  return (
    <span className="absolute right-2 top-2 rounded-full bg-sun-deep px-2.5 py-0.5 text-sm font-semibold text-ink shadow">
      {n === 1 ? "תמונה חדשה" : `${n.toLocaleString("he-IL")} חדשות`}
    </span>
  );
}

/** Small "new" label on a thumbnail. */
export function NewLabel({ className = "" }: { className?: string }) {
  return (
    <span className={`pointer-events-none absolute rounded-full bg-sun-deep px-1.5 py-px text-[11px] font-bold text-ink shadow ${className}`}>
      חדש
    </span>
  );
}
