"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "reset";

const inputClass =
  "w-full rounded-2xl border-2 border-ink/10 bg-white px-4 py-3 text-lg outline-none transition-colors focus:border-lake";

export function LoginForm({ linkError }: { linkError: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    linkError ? "הקישור לא תקין או שפג תוקפו. נסו שוב." : null,
  );
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const supabase = createClient();
    const origin = window.location.origin;

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("האימייל או הסיסמה לא נכונים.");
        setBusy(false);
        return;
      }
      router.replace("/");
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    if (error) {
      setError("לא הצלחנו לשלוח אימייל. נסו שוב בעוד כמה דקות.");
      return;
    }
    setNotice("אם האימייל רשום, נשלח אליו קישור לבחירת סיסמה חדשה.");
  }

  const submitLabel = mode === "signin" ? "כניסה" : "שליחת קישור";

  return (
    <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold">אימייל</span>
        <input
          type="email"
          dir="ltr"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </label>

      {mode !== "reset" && (
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">סיסמה</span>
          <input
            type="password"
            dir="ltr"
            autoComplete="current-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </label>
      )}

      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-lake/10 px-4 py-3 text-lake-deep">{notice}</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-2 rounded-2xl bg-ink px-5 py-3.5 text-lg font-semibold text-white transition-opacity disabled:opacity-60"
      >
        {busy ? "רגע…" : submitLabel}
      </button>

      <div className="mt-2 flex flex-col items-start gap-2 text-muted">
        {mode !== "signin" && (
          <button type="button" onClick={() => setMode("signin")} className="underline-offset-4 hover:text-ink hover:underline">
            חזרה לכניסה
          </button>
        )}
        {mode !== "reset" && (
          <button type="button" onClick={() => setMode("reset")} className="underline-offset-4 hover:text-ink hover:underline">
            שכחתי סיסמה
          </button>
        )}
      </div>
    </form>
  );
}
