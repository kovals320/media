"use client";

import { useEffect, useRef, useState } from "react";
import type { Photo } from "@/lib/immich";
import { useOverlay } from "@/lib/useOverlay";

const STEP = 240; // photos rendered per scroll step
export function YearView({
  photos,
  initialIndex,
  basePath,
  label,
  people = {},
}: {
  photos: Photo[];
  initialIndex: number | null;
  basePath: string; // e.g. /photos/2011 or /photos/person/<id>, used for share links
  label: string; // e.g. "2011" or a person's name
  people?: Record<string, string>; // person id -> name, for names in the viewer
}) {
  const [shown, setShown] = useState(STEP);
  const [viewing, setViewing] = useState<number | null>(null);
  const { markOpened, close } = useOverlay(viewing !== null, () => setViewing(null));
  const sentinel = useRef<HTMLDivElement>(null);

  // Render more photos as the visitor scrolls down.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || shown >= photos.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setShown((n) => Math.min(n + STEP, photos.length));
      },
      { rootMargin: "1200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, photos.length]);

  // Opened from a shared link (/photos/2011?p=ID).
  useEffect(() => {
    if (initialIndex === null) return;
    window.history.replaceState(null, "", basePath);
    setShown((n) => Math.max(n, initialIndex + 1));
    markOpened();
    setViewing(initialIndex);
  }, [initialIndex, markOpened, basePath]);

  function open(i: number) {
    markOpened();
    setViewing(i);
  }

  return (
    <>
      {/* One continuous grid, newest photo first. */}
      <ul className="mt-8 grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-1.5 lg:grid-cols-6">
        {photos.slice(0, shown).map((photo, index) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => open(index)}
              aria-label={`תמונה ${index + 1}`}
              className="block aspect-square w-full overflow-hidden rounded-md bg-sun/20 sm:rounded-lg"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/photo/${photo.id}/thumb`}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.04]"
              />
            </button>
          </li>
        ))}
      </ul>
      {shown < photos.length && <div ref={sentinel} className="h-24" aria-hidden />}

      {viewing !== null && photos[viewing] && (
        <Viewer
          basePath={basePath}
          label={label}
          people={people}
          photos={photos}
          index={viewing}
          onIndex={setViewing}
          onClose={close}
        />
      )}
    </>
  );
}

function Viewer({
  basePath,
  label,
  people,
  photos,
  index,
  onIndex,
  onClose,
}: {
  basePath: string;
  label: string;
  people: Record<string, string>;
  photos: Photo[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const photo = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;
  const touchX = useRef<number | null>(null);
  const [copied, setCopied] = useState(false);

  const prev = () => hasPrev && onIndex(index - 1);
  const next = () => hasNext && onIndex(index + 1);

  // Preload the neighbours so swiping feels instant.
  useEffect(() => {
    for (const i of [index - 1, index + 1]) {
      if (photos[i]) new Image().src = `/api/photo/${photos[i].id}/full`;
    }
  }, [index, photos]);

  // Named people in this photo (from Immich's face recognition).
  const names = (photo.pp ?? []).filter((id) => people[id]).map((id) => [id, people[id]] as const);

  const date = photo.t
    ? new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(photo.t))
    : label;

  async function share() {
    const url = `${window.location.origin}${basePath}?p=${photo.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `תמונה – ${label}`, url });
      } catch {}
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`תמונה ${index + 1} מתוך ${photos.length}`}
      className="fixed inset-0 z-50 flex select-none flex-col bg-[#0d1620] text-white"
      onKeyDown={(e) => {
        // RTL: left arrow moves forward, right arrow goes back.
        if (e.key === "ArrowLeft") next();
        if (e.key === "ArrowRight") prev();
      }}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        // RTL: swiping right brings the next photo, like turning a Hebrew page.
        if (dx > 50) next();
        if (dx < -50) prev();
      }}
    >
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

      <div className="flex items-center justify-between gap-3 px-4 pt-4 phone-landscape:hidden sm:px-8 sm:pt-6">
        <div className="min-w-0">
          <p className="font-semibold">{date}</p>
          <p className="text-sm text-white/60">
            {index + 1} מתוך {photos.length.toLocaleString("he-IL")}
          </p>
          {names.length > 0 && (
            <p className="mt-1 flex flex-wrap gap-1.5">
              {names.map(([id, name]) => (
                <a
                  key={id}
                  href={`/photos/person/${id}`}
                  className="rounded-full bg-white/10 px-2.5 py-0.5 text-sm transition-colors hover:bg-white/20"
                >
                  {name}
                </a>
              ))}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
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

      <div className="relative flex min-h-0 flex-1 items-center justify-center p-2 phone-landscape:p-0 sm:p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.id}
          src={`/api/photo/${photo.id}/full`}
          alt=""
          className="max-h-full max-w-full rounded-md object-contain phone-landscape:rounded-none"
          style={{ backgroundImage: `url(/api/photo/${photo.id}/thumb)`, backgroundSize: "cover" }}
        />
        {hasPrev && (
          <button
            type="button"
            onClick={prev}
            aria-label="התמונה הקודמת"
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 transition-colors hover:bg-white/20 sm:block"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-2">
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {hasNext && (
          <button
            type="button"
            onClick={next}
            aria-label="התמונה הבאה"
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-3 transition-colors hover:bg-white/20 sm:block"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-2">
              <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
      <p className="pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-sm text-white/50 phone-landscape:hidden sm:hidden">
        החליקו הצידה למעבר בין תמונות
      </p>
    </div>
  );
}
