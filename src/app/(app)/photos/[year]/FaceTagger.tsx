"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { faceCropStyle } from "@/lib/faceCrop";

type Face = {
  id: string;
  box: [number, number, number, number];
  aspect: number;
  personId: string | null;
  name: string | null;
};

type Loaded =
  | { state: "loading" }
  | { state: "ready"; faces: Face[]; names: string[] }
  | { state: "disabled" }
  | { state: "error" };

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

/** Where the photo is drawn inside its container, so face frames sit exactly on the faces. */
function useImageRect(img: RefObject<HTMLImageElement | null>) {
  const [rect, setRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const el = img.current;
    if (!el) return;
    const update = () => {
      if (!el.complete || el.naturalWidth === 0) return;
      setRect({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight });
    };
    update();
    el.addEventListener("load", update);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("load", update);
      ro.disconnect();
    };
  }, [img]);
  return rect;
}

/**
 * Tagging mode in the photo viewer: frames around the faces Immich found.
 * Tapping a face opens a small form to suggest who it is; the admin approves it.
 */
export function FaceTagger({
  photoId,
  imgRef,
  onEditing,
}: {
  photoId: string;
  imgRef: RefObject<HTMLImageElement | null>;
  onEditing: (editing: boolean) => void;
}) {
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });
  const [selected, setSelected] = useState<Face | null>(null);
  const [sent, setSent] = useState<Record<string, string>>({}); // face id -> suggested name
  const rect = useImageRect(imgRef);

  useEffect(() => {
    let alive = true;
    setLoaded({ state: "loading" });
    setSelected(null);
    fetch(`/api/photo/${photoId}/faces`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (data.disabled) setLoaded({ state: "disabled" });
        else if (!res.ok) setLoaded({ state: "error" });
        else setLoaded({ state: "ready", faces: data.faces ?? [], names: data.names ?? [] });
      })
      .catch(() => alive && setLoaded({ state: "error" }));
    return () => {
      alive = false;
    };
  }, [photoId]);

  useEffect(() => onEditing(selected !== null), [selected, onEditing]);
  useEffect(() => () => onEditing(false), [onEditing]);

  const notice =
    loaded.state === "loading"
      ? "מחפש פנים בתמונה…"
      : loaded.state === "disabled"
        ? "התיוג עוד לא הופעל בשרת."
        : loaded.state === "error"
          ? "לא הצלחנו לטעון את הפנים. נסו שוב."
          : loaded.faces.length === 0
            ? "לא נמצאו פנים בתמונה הזו."
            : null;

  return (
    <>
      {rect && loaded.state === "ready" && (
        <div className="pointer-events-none absolute" style={rect}>
          {loaded.faces.map((f) => {
            const [x1, y1, x2, y2] = f.box;
            const label = sent[f.id] ? `הוצע: ${sent[f.id]}` : (f.name ?? "מי זה?");
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelected(f)}
                aria-label={f.name ? `${f.name} – הצעת שם אחר` : "הצעת שם לפנים האלה"}
                className={`pointer-events-auto absolute rounded-lg border-2 shadow-[0_0_0_1px_rgba(0,0,0,0.35)] transition-colors ${
                  f.name ? "border-white/80 hover:border-white" : "border-dashed border-sun hover:border-white"
                } ${selected?.id === f.id ? "!border-solid !border-lake bg-lake/20" : ""}`}
                style={{
                  left: `${x1 * 100}%`,
                  top: `${y1 * 100}%`,
                  width: `${(x2 - x1) * 100}%`,
                  height: `${(y2 - y1) * 100}%`,
                }}
              >
                <span
                  className={`absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold shadow ${
                    f.name && !sent[f.id] ? "bg-black/60 text-white" : "bg-sun text-ink"
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {notice && (
        <p role="status" className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-sm">
          {notice}
        </p>
      )}
      {!notice && !selected && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/70 px-4 py-2 text-sm">
          לחצו על פנים כדי להציע שם
        </p>
      )}

      {selected && loaded.state === "ready" && (
        <SuggestForm
          key={selected.id}
          photoId={photoId}
          face={selected}
          names={loaded.names}
          onClose={() => setSelected(null)}
          onSent={(name) => {
            setSent((s) => ({ ...s, [selected.id]: name }));
          }}
        />
      )}
    </>
  );
}

function SuggestForm({
  photoId,
  face,
  names,
  onClose,
  onSent,
}: {
  photoId: string;
  face: Face;
  names: string[];
  onClose: () => void;
  onSent: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [by, setBy] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBy(readBy());
    input.current?.focus();
  }, []);

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
        body: JSON.stringify({ assetId: photoId, faceId: face.id, name: clean, by: by.trim() }),
      });
      if (!res.ok) throw new Error();
      onSent(clean);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  const listId = `names-${face.id}`;
  const field =
    "w-full rounded-xl border-2 border-white/15 bg-white/10 px-3 py-2.5 text-base text-white outline-none placeholder:text-white/40 focus:border-sun";

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-20 p-3 sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:w-[26rem] sm:-translate-x-1/2"
      // Typing and tapping in the form must not swipe to another photo.
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="rounded-2xl bg-[#1b2836] p-4 shadow-2xl ring-1 ring-white/10">
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className="h-16 w-16 shrink-0 rounded-full bg-white/10 ring-2 ring-sun"
            style={faceCropStyle(`/api/photo/${photoId}/full`, face.box, face.aspect)}
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{face.name ? `מתויג/ת כ${face.name}. זה לא נכון?` : "מי זה/זו?"}</p>
            <p className="text-sm text-white/60">השם יופיע אחרי אישור של מנהל האתר.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="סגירה" className="self-start rounded-full p-1.5 text-white/70 hover:bg-white/10">
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {status === "done" ? (
          <div className="mt-4 flex items-center justify-between gap-3">
            <p role="status" className="text-sun">תודה! ההצעה נשלחה לאישור.</p>
            <button type="button" onClick={onClose} className="rounded-xl bg-white/10 px-4 py-2 font-semibold hover:bg-white/20">
              סגירה
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 flex flex-col gap-2">
            <input
              ref={input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              list={listId}
              maxLength={60}
              required
              placeholder="שם מלא"
              aria-label="שם האדם"
              enterKeyHint="send"
              className={field}
            />
            <datalist id={listId}>
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
            {status === "error" && <p role="alert" className="text-sm text-red-300">לא הצלחנו לשלוח. נסו שוב.</p>}
            <button
              disabled={status === "sending" || !name.trim()}
              className="mt-1 rounded-xl bg-sun px-4 py-2.5 font-semibold text-ink transition-opacity disabled:opacity-50"
            >
              {status === "sending" ? "שולח…" : "שליחת הצעה"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
