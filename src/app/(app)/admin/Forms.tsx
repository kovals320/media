"use client";

import { useActionState, useTransition } from "react";
import { addMember, addPlaylist, type FormState } from "./actions";

const initial: FormState = { error: null, ok: null };
const inputClass =
  "min-w-0 rounded-2xl border-2 border-ink/10 bg-white px-4 py-3 text-lg outline-none focus:border-lake";

function Feedback({ state }: { state: FormState }) {
  if (state.error) return <p role="alert" className="w-full rounded-xl bg-red-50 px-4 py-2.5 text-red-800">{state.error}</p>;
  if (state.ok) return <p role="status" className="w-full rounded-xl bg-lake/10 px-4 py-2.5 text-lake-deep">{state.ok}</p>;
  return null;
}

export function AddMemberForm() {
  const [state, action, pending] = useActionState(addMember, initial);
  return (
    <form action={action} className="mt-4 flex flex-wrap gap-2">
      <input name="email" type="email" dir="ltr" required placeholder="email@example.com" className={`${inputClass} flex-[2_1_14rem]`} />
      <input name="name" placeholder="שם (לא חובה)" className={`${inputClass} flex-[1_1_9rem]`} />
      <select name="role" defaultValue="member" className={`${inputClass} flex-[0_1_8rem]`}>
        <option value="member">בן משפחה</option>
        <option value="admin">מנהל</option>
      </select>
      <button disabled={pending} className="rounded-2xl bg-ink px-5 py-3 font-semibold text-white disabled:opacity-60">
        {pending ? "מוסיף…" : "הוספה"}
      </button>
      <Feedback state={state} />
    </form>
  );
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
