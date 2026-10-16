"use client";

import { useState } from "react";
import type { Video } from "@/lib/youtube";
import { useOverlay } from "@/lib/useOverlay";

export type PlaylistView = {
  id: string;
  title: string;
  failed: boolean;
  videos: Video[];
};

type Position = { list: number; index: number };

export function VideoBrowser({ playlists }: { playlists: PlaylistView[] }) {
  const [current, setCurrent] = useState<Position | null>(null);
  const { markOpened, close } = useOverlay(current !== null, () => setCurrent(null));

  function open(list: number, index: number) {
    markOpened();
    setCurrent({ list, index });
  }

  return (
    <>
      {playlists.map((p, list) => (
        <section key={p.id} className="mt-10 sm:mt-12" aria-labelledby={`pl-${p.id}`}>
          <div className="mb-3 flex items-baseline gap-3 px-5 sm:px-8">
            <h2 id={`pl-${p.id}`} className="font-display text-2xl sm:text-3xl">{p.title}</h2>
            {!p.failed && <span className="text-muted">{p.videos.length} סרטונים</span>}
          </div>

          {p.failed ? (
            <p className="mx-5 rounded-2xl bg-lake/10 p-5 text-muted sm:mx-8">
              לא הצלחנו לטעון את הפלייליסט מיוטיוב. נסו לרענן את הדף בעוד כמה דקות.
            </p>
          ) : (
            <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-3 [scrollbar-width:thin] sm:scroll-px-8 sm:gap-4 sm:px-8">
              {p.videos.map((v, index) => (
                <li key={v.id} className="w-64 shrink-0 snap-start sm:w-72">
                  <button
                    type="button"
                    onClick={() => open(list, index)}
                    className="group block w-full rounded-2xl text-start"
                  >
                    <div className="relative aspect-video overflow-hidden rounded-2xl bg-lake/15">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={v.thumbnail}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                      {v.duration && (
                        <span dir="ltr" className="absolute bottom-2 left-2 rounded-md bg-ink/80 px-1.5 py-0.5 text-sm font-semibold text-white">
                          {v.duration}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-2 font-semibold leading-snug">{v.title}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {current && (
        <Player
          playlist={playlists[current.list]}
          index={current.index}
          onIndex={(index) => setCurrent({ list: current.list, index })}
          onClose={close}
        />
      )}
    </>
  );
}

function Player({
  playlist,
  index,
  onIndex,
  onClose,
}: {
  playlist: PlaylistView;
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const video = playlist.videos[index];
  const total = playlist.videos.length;
  const hasPrev = index > 0;
  const hasNext = index < total - 1;

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
          <p className="text-white/60">{playlist.title}</p>
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
