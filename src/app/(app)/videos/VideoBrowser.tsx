"use client";

import { useEffect, useMemo, useState } from "react";
import { yearInTitle } from "@/lib/sort";
import type { Video } from "@/lib/youtube";
import { useOverlay } from "@/lib/useOverlay";
import { normalize } from "@/lib/search";

type Group = { label: string; items: { video: Video; index: number }[] };

// Videos arrive already sorted; split them into year sections for display.
function groupByYear(videos: Video[]): Group[] {
  const groups: Group[] = [];
  videos.forEach((video, index) => {
    const year = yearInTitle(video.title);
    const label = year === null ? "בלי שנה בכותרת" : String(year);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push({ video, index });
    else groups.push({ label, items: [{ video, index }] });
  });
  return groups;
}

export function VideoBrowser({ videos, initialIndex }: { videos: Video[]; initialIndex: number | null }) {
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState<number | null>(null);
  // The list the player moves through: the search results at the moment a film was opened.
  const [playing, setPlaying] = useState<Video[]>(videos);
  const { markOpened, close } = useOverlay(current !== null, () => setCurrent(null));

  const index = useMemo(() => videos.map((v) => normalize(v.title)), [videos]);
  const words = normalize(query).split(" ").filter(Boolean);
  const shown = words.length === 0 ? videos : videos.filter((_, i) => words.every((w) => index[i].includes(w)));
  const groups = groupByYear(shown);

  // Opened from a shared link (/videos?v=ID): start playing that video.
  useEffect(() => {
    if (initialIndex === null) return;
    window.history.replaceState(null, "", "/videos");
    markOpened();
    setPlaying(videos);
    setCurrent(initialIndex);
  }, [initialIndex, markOpened, videos]);

  function open(i: number) {
    markOpened();
    setPlaying(shown);
    setCurrent(i);
  }

  return (
    <>
      <div className="sticky top-0 z-10 -mx-5 mt-6 bg-paper/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="relative">
          <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 fill-none stroke-muted stroke-2">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש סרט לפי שם"
            aria-label="חיפוש סרט לפי שם"
            className="w-full rounded-2xl border-2 border-ink/10 bg-white py-3 pe-12 ps-12 text-lg outline-none transition-colors focus:border-lake [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="ניקוי החיפוש"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted hover:bg-ink/5 hover:text-ink"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
        {words.length > 0 && (
          <p role="status" className="mt-2 text-muted">
            {shown.length === 0 ? "לא נמצאו סרטים" : shown.length === 1 ? "נמצא סרט אחד" : `נמצאו ${shown.length} סרטים`}
          </p>
        )}
      </div>

      {words.length > 0 && shown.length === 0 && (
        <p className="mt-8 rounded-[2rem] border-2 border-dashed border-lake/40 p-8 text-center text-lg text-muted">
          אין סרט עם השם הזה. נסו מילה אחרת, או שם של אחד מבני המשפחה.
        </p>
      )}

      {groups.map((g) => (
        <section key={g.label} className="mt-10 sm:mt-12" aria-label={g.label}>
          <h2 className="mb-4 flex items-baseline gap-3">
            <span className="font-display text-3xl sm:text-4xl">{g.label}</span>
            <span className="text-muted">{g.items.length === 1 ? "סרט אחד" : `${g.items.length} סרטים`}</span>
          </h2>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4">
            {g.items.map(({ video: v, index }) => (
              <li key={v.id}>
                <button type="button" onClick={() => open(index)} className="group block w-full rounded-2xl text-start">
                  <div className="relative aspect-video overflow-hidden rounded-xl bg-lake/15 sm:rounded-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={v.thumbnail}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    {v.duration && (
                      <span dir="ltr" className="absolute bottom-1.5 left-1.5 rounded-md bg-ink/80 px-1.5 py-0.5 text-xs font-semibold text-white sm:text-sm">
                        {v.duration}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 font-semibold leading-snug">{v.title}</p>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {current !== null && (
        <Player videos={playing} index={current} onIndex={setCurrent} onClose={close} />
      )}
    </>
  );
}

function Player({
  videos,
  index,
  onIndex,
  onClose,
}: {
  videos: Video[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const video = videos[index];
  const total = videos.length;
  const hasPrev = index > 0;
  const hasNext = index < total - 1;
  const year = yearInTitle(video.title);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
      className="fixed inset-0 z-50 flex flex-col bg-[#0d1620] text-white"
      onKeyDown={(e) => {
        // RTL: left arrow moves forward, right arrow goes back.
        if (e.key === "ArrowLeft" && hasNext) onIndex(index + 1);
        if (e.key === "ArrowRight" && hasPrev) onIndex(index - 1);
      }}
    >
      <div className="flex items-start justify-between gap-4 px-4 pb-3 pt-4 phone-landscape:hidden sm:px-8 sm:pt-6">
        <div className="min-w-0">
          {year !== null && <p className="text-white/60">{year}</p>}
          <h2 className="font-display text-xl leading-snug sm:text-2xl">{video.title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ShareButton video={video} />
          <button
            type="button"
            onClick={onClose}
            autoFocus
            aria-label="סגירה"
            className="rounded-full bg-white/10 p-2.5 transition-colors hover:bg-white/20"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sideways phone: only the video, plus a small close button. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="סגירה"
        className="absolute left-3 top-3 z-10 hidden rounded-full bg-black/40 p-2 text-white/80 phone-landscape:block"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>

      <div className="flex flex-1 items-center justify-center px-0 phone-landscape:px-0 sm:px-8">
        <div className="aspect-video w-full max-w-[min(100%,calc((100dvh-11rem)*16/9))] overflow-hidden bg-black phone-landscape:h-dvh phone-landscape:w-auto phone-landscape:max-w-full phone-landscape:rounded-none sm:rounded-2xl">
          <iframe
            key={video.id}
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&playsinline=1&modestbranding=1`}
            title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 phone-landscape:hidden sm:px-8 sm:pb-6">
        <button
          type="button"
          disabled={!hasPrev}
          onClick={() => onIndex(index - 1)}
          className="flex items-center gap-1 rounded-full bg-white/10 px-4 py-2.5 transition-colors hover:bg-white/20 disabled:opacity-30"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          הקודם
        </button>
        <span className="text-white/60">
          {index + 1} מתוך {total}
        </span>
        <button
          type="button"
          disabled={!hasNext}
          onClick={() => onIndex(index + 1)}
          className="flex items-center gap-1 rounded-full bg-white/10 px-4 py-2.5 transition-colors hover:bg-white/20 disabled:opacity-30"
        >
          הבא
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
            <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ShareButton({ video }: { video: Video }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/videos?v=${video.id}`;
    // Phones: the system share sheet (WhatsApp etc.). Computers: copy the link.
    if (navigator.share) {
      try {
        await navigator.share({ title: video.title, url });
      } catch {
        // closed the share sheet
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("העתיקו את הקישור:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2.5 transition-colors hover:bg-white/20"
    >
      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
        <path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {copied ? "הקישור הועתק" : "שיתוף"}
    </button>
  );
}
