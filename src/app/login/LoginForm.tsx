"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup" | "reset";

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

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${origin}/auth/callback` },
      });
      setBusy(false);
      if (error) {
        setError(
          error.message.toLowerCase().includes("password")
            ? "הסיסמה צריכה להיות באורך 6 תווים לפחות."
            : "לא הצלחנו ליצור חשבון. בדקו את האימייל ונסו שוב.",
        );
        return;
      }
      if (data.session) {
        router.replace("/");
        router.refresh();
        return;
      }
      setNotice("שלחנו אליכם אימייל לאישור החשבון. לחצו על הקישור שבו ואז היכנסו.");
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

  const submitLabel =
    mode === "signin" ? "כניסה" : mode === "signup" ? "יצירת חשבון" : "שליחת קישור";

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
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
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
            יש לי חשבון, לכניסה
          </button>
        )}
        {mode !== "signup" && (
          <button type="button" onClick={() => setMode("signup")} className="underline-offset-4 hover:text-ink hover:underline">
            פעם ראשונה כאן? יצירת חשבון
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
