"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useOverlay } from "@/lib/useOverlay";
import { deleteAlbum, deletePhoto, renameAlbum } from "../actions";
import { uploadPhoto } from "./upload";

export type PhotoView = {
  id: string;
  thumb: string;
  full: string;
  width: number | null;
  height: number | null;
  canDelete: boolean;
};

type Progress = { done: number; total: number; failed: number };

export function AlbumView({
  albumId,
  title,
  canManage,
  photos,
}: {
  albumId: string;
  title: string;
  canManage: boolean;
  photos: PhotoView[];
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const { markOpened, close } = useOverlay(viewing !== null, () => setViewing(null));

  async function onFiles(list: FileList | null) {
    const files = Array.from(list ?? []).filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (fileInput.current) fileInput.current.value = "";
    if (files.length === 0) return;

    setMessage(null);
    const state: Progress = { done: 0, total: files.length, failed: 0 };
    setProgress({ ...state });

    // Upload three at a time.
    let next = 0;
    async function worker() {
      while (next < files.length) {
        const file = files[next++];
        try {
          await uploadPhoto(albumId, file);
        } catch {
          state.failed++;
        }
        state.done++;
        setProgress({ ...state });
      }
    }
    await Promise.all([worker(), worker(), worker()]);

    setProgress(null);
    if (state.failed > 0) {
      setMessage(
        state.failed === files.length
          ? "התמונות לא הועלו. אם אלה קבצי HEIC מאייפון, נסו להעלות מהטלפון עצמו."
          : `${state.total - state.failed} תמונות הועלו, ${state.failed} לא הצליחו.`,
      );
    }
    router.refresh();
  }

  function openPhoto(i: number) {
    markOpened();
    setViewing(i);
  }

  const uploading = progress !== null;

  return (
    <>
      <AlbumHeader albumId={albumId} title={title} count={photos.length} canManage={canManage} />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          id="photo-upload"
          onChange={(e) => onFiles(e.target.files)}
          disabled={uploading}
        />
        <label
          htmlFor="photo-upload"
          aria-disabled={uploading}
          className={`flex cursor-pointer items-center gap-2 rounded-2xl bg-sun px-5 py-3 text-lg font-semibold text-ink transition-colors hover:bg-sun-deep ${
            uploading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[2.5]">
            <path d="M12 16V4M6 10l6-6 6 6M5 20h14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          הוספת תמונות
        </label>
        {progress && (
          <div role="status" className="flex min-w-48 flex-1 items-center gap-3 sm:flex-none">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink/10 sm:w-48">
              <div
                className="h-full rounded-full bg-lake transition-[width] duration-300"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
            <span className="text-muted">
              מעלה {progress.done} מתוך {progress.total}
            </span>
          </div>
        )}
      </div>
      {message && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-red-800">{message}</p>}

      {photos.length === 0 && !uploading ? (
        <label
          htmlFor="photo-upload"
          className="mt-6 flex cursor-pointer flex-col items-center rounded-[2rem] border-2 border-dashed border-sun-deep/50 p-12 text-center text-lg text-muted hover:bg-sun/10"
        >
          האלבום עוד ריק. הוסיפו תמונות מהטלפון או מהמחשב.
        </label>
      ) : (
        <ul className="mt-6 grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-1.5 lg:grid-cols-5">
          {photos.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => openPhoto(i)}
                aria-label={`תמונה ${i + 1}`}
                className="block aspect-square w-full overflow-hidden rounded-lg bg-sun/20 sm:rounded-xl"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumb} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.04]" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {viewing !== null && photos[viewing] && (
        <Viewer
          photos={photos}
          index={viewing}
          onIndex={setViewing}
          onClose={close}
          onDeleted={() => {
            close();
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function AlbumHeader({
  albumId,
  title,
  count,
  canManage,
}: {
  albumId: string;
  title: string;
  count: number;
  canManage: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const res = await renameAlbum(albumId, value);
            if (res.error) setError(res.error);
            else setEditing(false);
          });
        }}
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          className="min-w-0 flex-1 rounded-2xl border-2 border-ink/10 bg-white px-4 py-2.5 font-display text-2xl outline-none focus:border-lake"
        />
        <button disabled={pending} className="rounded-2xl bg-ink px-5 py-3 font-semibold text-white disabled:opacity-60">
          שמירה
        </button>
        <button type="button" onClick={() => setEditing(false)} className="px-3 py-3 text-muted hover:text-ink">
          ביטול
        </button>
        {error && <p className="w-full text-red-800">{error}</p>}
      </form>
    );
  }

  return (
    <div>
      <h1 className="font-display text-[2.4rem] leading-[1.08] sm:text-6xl">{title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted">
        <span>{count === 1 ? "תמונה אחת" : `${count} תמונות`}</span>
        {canManage && (
          <>
            <button type="button" onClick={() => setEditing(true)} className="underline-offset-4 hover:text-ink hover:underline">
              שינוי שם
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                const sure = window.confirm(
                  count > 0
                    ? `למחוק את האלבום "${title}" ואת כל ${count} התמונות שבו? אי אפשר לבטל את זה.`
                    : `למחוק את האלבום "${title}"?`,
                );
                if (!sure) return;
                startTransition(async () => {
                  const res = await deleteAlbum(albumId);
                  if (res?.error) setError(res.error);
                });
              }}
              className="text-red-700 underline-offset-4 hover:underline"
            >
              מחיקת אלבום
            </button>
          </>
        )}
      </div>
      {error && <p className="mt-2 text-red-800">{error}</p>}
    </div>
  );
}

function Viewer({
  photos,
  index,
  onIndex,
  onClose,
  onDeleted,
}: {
  photos: PhotoView[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const photo = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;
  const touchX = useRef<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const prev = () => hasPrev && onIndex(index - 1);
  const next = () => hasNext && onIndex(index + 1);

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
      <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-8 sm:pt-6">
        <span className="text-white/70">
          {index + 1} מתוך {photos.length}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={photo.full}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-white/10 px-4 py-2.5 transition-colors hover:bg-white/20"
          >
            גודל מלא
          </a>
          {photo.canDelete && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!window.confirm("למחוק את התמונה? אי אפשר לבטל את זה.")) return;
                startTransition(async () => {
                  const res = await deletePhoto(photo.id);
                  if (res.error) setError(res.error);
                  else onDeleted();
                });
              }}
              className="rounded-full bg-white/10 px-4 py-2.5 text-red-200 transition-colors hover:bg-red-500/30 disabled:opacity-50"
            >
              מחיקה
            </button>
          )}
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
      {error && <p className="mx-4 mt-3 rounded-xl bg-red-500/20 px-4 py-2 sm:mx-8">{error}</p>}

      <div className="relative flex min-h-0 flex-1 items-center justify-center p-2 sm:p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.id}
          src={photo.full}
          alt=""
          className="max-h-full max-w-full rounded-md object-contain"
          style={{ backgroundImage: `url(${photo.thumb})`, backgroundSize: "cover" }}
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
      <p className="pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-sm text-white/50 sm:hidden">
        החליקו הצידה למעבר בין תמונות
      </p>
    </div>
  );
}
