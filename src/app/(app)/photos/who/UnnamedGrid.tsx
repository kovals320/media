"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useOverlay } from "@/lib/useOverlay";
import { faceCropStyle } from "@/lib/faceCrop";

type Sample = { id: string; box?: number[]; aspect?: number };

const STEP = 60; // faces rendered per scroll step
const BY_KEY = "media-suggested-by";

function readBy() {
  try {
    return window.localStorage.getItem(BY_KEY) ?? "";
  } catch {
    return "";
  }
}
function saveBy(v: string) {
  try {
    window.localStorage.setItem(BY_KEY, v);
  } catch {}
}

export function UnnamedGrid({ ids, names }: { ids: string[]; names: string[] }) {
  const [shown, setShown] = useState(STEP);
  const [broken, setBroken] = useState<Set<string>>(new Set()); // faces whose picture failed to load
  const [sent, setSent] = useState<Record<string, string>>({}); // person id -> suggested name
  const [open, setOpen] = useState<string | null>(null);
  const { markOpened, close } = useOverlay(open !== null, () => setOpen(null));
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || shown >= ids.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setShown((n) => Math.min(n + STEP, ids.length));
      },
      { rootMargin: "800px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, ids.length]);

  const visible = ids.slice(0, shown).filter((id) => !broken.has(id));

  return (
    <>
      <ul className="mt-8 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-5 lg:grid-cols-8">
        {visible.map((id) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => {
                markOpened();
                setOpen(id);
              }}
              className="group flex w-full flex-col items-center gap-1.5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/person/${id}?v=2`}
                alt=""
                loading="lazy"
                onError={() => setBroken((b) => new Set(b).add(id))}
                className={`aspect-square w-full max-w-28 rounded-full bg-sun/30 object-cover ring-2 ring-transparent transition group-hover:ring-sun-deep ${
                  sent[id] ? "opacity-50" : ""
                }`}
              />
              <span className={`text-sm ${sent[id] ? "font-semibold text-lake-deep" : "text-muted group-hover:text-ink"}`}>
                {sent[id] ? `הוצע: ${sent[id]}` : "מי זה?"}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {shown < ids.length && <div ref={sentinel} className="h-24" aria-hidden />}

      {open && (
        <SuggestSheet
          key={open}
          personId={open}
          names={names}
          sentName={sent[open]}
          onSent={(name) => setSent((s) => ({ ...s, [open]: name }))}
          onClose={close}
        />
      )}
    </>
  );
}

function SuggestSheet({
  personId,
  names,
  sentName,
  onSent,
  onClose,
}: {
  personId: string;
  names: string[];
  sentName?: string;
  onSent: (name: string) => void;
  onClose: () => void;
}) {
  const [photos, setPhotos] = useState<Sample[] | null>(null);
  const [big, setBig] = useState<string | null>(null); // a sample shown whole
  const [name, setName] = useState("");
  const [by, setBy] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(sentName ? "done" : "idle");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBy(readBy());
    if (!sentName) input.current?.focus();
    let alive = true;
    fetch(`/api/person/${personId}/photos`)
      .then((r) => r.json())
      .then((d) => alive && setPhotos(d.photos ?? []))
      .catch(() => alive && setPhotos([]));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    setStatus("sending");
    saveBy(by.trim());
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId, name: clean, by: by.trim() }),
      });
      if (!res.ok) throw new Error();
      onSent(clean);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  const field =
    "w-full rounded-xl border-2 border-ink/10 bg-white px-3 py-2.5 text-base outline-none placeholder:text-muted focus:border-lake";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="הצעת שם"
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-paper p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/person/${personId}?v=2`} alt="" className="h-24 w-24 shrink-0 rounded-full bg-sun/30 object-cover ring-4 ring-sun" />
          <div className="min-w-0 flex-1 pt-2">
            <p className="font-display text-2xl">מי זה/זו?</p>
            <p className="text-muted">השם יתווסף לכל התמונות של הפנים האלה, אחרי אישור של מנהל האתר.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="סגירה" className="rounded-full p-2 text-muted hover:bg-ink/5 hover:text-ink">
            <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <p className="mt-4 text-sm font-semibold text-muted">מהתמונות (לחיצה מציגה את התמונה המלאה):</p>
        {big ? (
          <button type="button" onClick={() => setBig(null)} className="mt-1.5 block w-full" aria-label="חזרה">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/photo/${big}/full`} alt="" className="max-h-[50dvh] w-full rounded-lg bg-sun/20 object-contain" />
            <span className="mt-1 block text-sm text-muted">לחיצה לחזרה</span>
          </button>
        ) : (
          <ul className="mt-1.5 grid grid-cols-3 gap-1.5">
            {(photos ?? Array.from({ length: 3 }, (): Sample => ({ id: "" }))).map((p, i) => (
              <li key={p.id || i} className="aspect-square overflow-hidden rounded-lg bg-sun/20">
                {p.id && (
                  <button
                    type="button"
                    onClick={() => setBig(p.id)}
                    aria-label="הצגת התמונה המלאה"
                    className="block h-full w-full"
                    style={p.box && p.aspect ? faceCropStyle(`/api/photo/${p.id}/full`, p.box, p.aspect, 3.2) : undefined}
                  >
                    {!(p.box && p.aspect) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/photo/${p.id}/thumb`} alt="" loading="lazy" className="h-full w-full object-cover" />
                    )}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {status === "done" ? (
          <div className="mt-5 flex items-center justify-between gap-3">
            <p role="status" className="font-semibold text-lake-deep">
              תודה! {sentName ? `ההצעה "${sentName}" נשלחה לאישור.` : "ההצעה נשלחה לאישור."}
            </p>
            <button type="button" onClick={onClose} className="rounded-xl bg-ink px-4 py-2 font-semibold text-white">
              סגירה
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 flex flex-col gap-2">
            <input
              ref={input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              list="known-names"
              maxLength={60}
              required
              placeholder="שם מלא"
              aria-label="שם האדם"
              enterKeyHint="send"
              className={field}
            />
            <datalist id="known-names">
              {names.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <input
              value={by}
              onChange={(e) => setBy(e.target.value)}
              maxLength={40}
              placeholder="השם שלך (לא חובה)"
              aria-label="השם שלך"
              className={field}
            />
            {status === "error" && <p role="alert" className="text-sm text-red-700">לא הצלחנו לשלוח. נסו שוב.</p>}
            <button
              disabled={status === "sending" || !name.trim()}
              className="mt-1 rounded-xl bg-lake px-4 py-3 font-semibold text-white transition-colors hover:bg-lake-deep disabled:opacity-50"
            >
              {status === "sending" ? "שולח…" : "שליחת הצעה"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
