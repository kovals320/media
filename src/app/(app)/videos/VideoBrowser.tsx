"use client";

import { useState } from "react";
import { yearInTitle } from "@/lib/sort";
import type { Video } from "@/lib/youtube";
import { useOverlay } from "@/lib/useOverlay";

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

export function VideoBrowser({ videos }: { videos: Video[] }) {
  const [current, setCurrent] = useState<number | null>(null);
  const { markOpened, close } = useOverlay(current !== null, () => setCurrent(null));
  const groups = groupByYear(videos);

  function open(index: number) {
    markOpened();
    setCurrent(index);
  }

  return (
    <>
      {groups.map((g) => (
        <section key={g.label} className="mt-10 sm:mt-12" aria-label={g.label}>
          <h2 className="mb-4 flex items-baseline gap-3">
            <span className="font-display text-3xl sm:text-4xl">{g.label}</span>
            <span className="text-muted">{g.items.length === 1 ? "סרטון אחד" : `${g.items.length} סרטונים`}</span>
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
        <Player videos={videos} index={current} onIndex={setCurrent} onClose={close} />
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
      <div className="flex items-start justify-between gap-4 px-4 pb-3 pt-4 sm:px-8 sm:pt-6">
        <div className="min-w-0">
          {year !== null && <p className="text-white/60">{year}</p>}
          <h2 className="font-display text-xl leading-snug sm:text-2xl">{video.title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          aria-label="סגירה"
          className="shrink-0 rounded-full bg-white/10 p-2.5 transition-colors hover:bg-white/20"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-0 sm:px-8">
        <div className="aspect-video w-full max-w-[min(100%,calc((100dvh-11rem)*16/9))] overflow-hidden bg-black sm:rounded-2xl">
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

      <div className="flex items-center justify-between gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-8 sm:pb-6">
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
