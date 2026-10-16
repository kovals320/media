"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ResetForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setError("לא הצלחנו לשמור. הסיסמה צריכה להיות באורך 6 תווים לפחות.");
      setBusy(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold">סיסמה חדשה</span>
        <input
          type="password"
          dir="ltr"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-2xl border-2 border-ink/10 bg-white px-4 py-3 text-lg outline-none focus:border-lake"
        />
      </label>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-red-800">{error}</p>}
      <button disabled={busy} className="rounded-2xl bg-ink px-5 py-3.5 text-lg font-semibold text-white disabled:opacity-60">
        {busy ? "שומר…" : "שמירת סיסמה"}
      </button>
    </form>
  );
}
