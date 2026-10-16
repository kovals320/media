"use client";

import { useActionState, useTransition } from "react";
import { addPlaylist, refreshFromYouTube, type FormState } from "./actions";

const initial: FormState = { error: null, ok: null };
const inputClass =
  "min-w-0 rounded-2xl border-2 border-ink/10 bg-white px-4 py-3 text-lg outline-none focus:border-lake";

function Feedback({ state }: { state: FormState }) {
  if (state.error) return <p role="alert" className="w-full rounded-xl bg-red-50 px-4 py-2.5 text-red-800">{state.error}</p>;
  if (state.ok) return <p role="status" className="w-full rounded-xl bg-lake/10 px-4 py-2.5 text-lake-deep">{state.ok}</p>;
  return null;
}

export function AddPlaylistForm() {
  const [state, action, pending] = useActionState(addPlaylist, initial);
  return (
    <form action={action} className="mt-4 flex flex-wrap gap-2">
      <input
        name="url"
        dir="ltr"
        required
        placeholder="https://www.youtube.com/playlist?list=…"
        className={`${inputClass} flex-[1_1_18rem]`}
      />
      <button disabled={pending} className="rounded-2xl bg-ink px-5 py-3 font-semibold text-white disabled:opacity-60">
        {pending ? "בודק…" : "הוספת פלייליסט"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function RemoveButton({ action, confirmText }: { action: () => Promise<void>; confirmText: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (window.confirm(confirmText)) startTransition(() => action());
      }}
      className="shrink-0 rounded-full px-3 py-1.5 text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "מסיר…" : "הסרה"}
    </button>
  );
}

export function RefreshYouTubeButton() {
  const [state, action, pending] = useActionState(refreshFromYouTube, initial);
  return (
    <form action={action} className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-lake/10 p-4">
      <div className="min-w-0 flex-[1_1_16rem]">
        <p className="font-semibold">שיניתם משהו ביוטיוב?</p>
        <p className="text-muted">האפליקציה מתעדכנת לבד תוך חצי שעה. לחיצה כאן מעדכנת מיד.</p>
      </div>
      <button
        disabled={pending}
        className="flex items-center gap-2 rounded-2xl bg-lake px-5 py-3 font-semibold text-white transition-colors hover:bg-lake-deep disabled:opacity-60"
      >
        <svg aria-hidden viewBox="0 0 24 24" className={`h-5 w-5 fill-none stroke-current stroke-2 ${pending ? "animate-spin" : ""}`}>
          <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {pending ? "מעדכן…" : "רענון מיוטיוב"}
      </button>
      <Feedback state={state} />
    </form>
  );
}
