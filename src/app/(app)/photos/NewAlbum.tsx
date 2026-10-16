"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createAlbum } from "./actions";

function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="rounded-2xl bg-ink px-5 py-3 font-semibold text-white disabled:opacity-60">
      {pending ? "יוצר…" : "יצירה"}
    </button>
  );
}

export function NewAlbum() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-2xl bg-sun px-5 py-3 text-lg font-semibold text-ink transition-colors hover:bg-sun-deep"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[2.5]">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
        אלבום חדש
      </button>
    );
  }

  return (
    <form action={createAlbum} className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <input
        name="title"
        required
        autoFocus
        placeholder="למשל: טיול לגליל 2025"
        className="min-w-0 flex-1 rounded-2xl border-2 border-ink/10 bg-white px-4 py-3 text-lg outline-none focus:border-lake sm:w-72"
      />
      <CreateButton />
      <button type="button" onClick={() => setOpen(false)} className="rounded-2xl px-3 py-3 text-muted hover:text-ink">
        ביטול
      </button>
    </form>
  );
}
