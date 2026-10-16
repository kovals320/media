import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { signOut } from "@/app/actions";

export default async function Home() {
  const { isAdmin } = await getViewer();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 pb-8 pt-6 sm:px-8 sm:pt-10">
      <div className="mb-6 flex min-h-9 items-center justify-between gap-3 sm:mb-8">
        <p className="text-lg text-muted">המדיה של המשפחה</p>
        {isAdmin && (
          <div className="flex items-center gap-1">
            <Link href="/admin" className="rounded-full px-3 py-1.5 text-muted transition-colors hover:bg-ink/5 hover:text-ink">
              ניהול
            </Link>
            <form action={signOut}>
              <button className="rounded-full px-3 py-1.5 text-muted transition-colors hover:bg-ink/5 hover:text-ink">
                יציאה
              </button>
            </form>
          </div>
        )}
      </div>

      <h1 className="mb-8 font-display text-[2.6rem] leading-[1.05] sm:mb-12 sm:text-6xl">
        מה רוצים לראות?
      </h1>

      <nav
        aria-label="בחירת סוג מדיה"
        className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-[1.15fr_1fr] sm:gap-5"
      >
        {/* Photos */}
        <Link
          href="/photos"
          className="group relative flex min-h-[18rem] flex-col justify-end overflow-hidden rounded-[2rem] bg-sun p-6 transition-transform duration-200 active:scale-[0.98] sm:min-h-[26rem] sm:p-8"
        >
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-6 flex justify-center sm:top-10">
            <div className="relative h-36 w-32 sm:h-48 sm:w-40">
              <div className="print-left absolute inset-0 rounded-md bg-print p-2 pb-7 shadow-[0_8px_20px_-8px_rgba(80,50,0,0.45)]">
                <div className="h-full w-full rounded-sm bg-[linear-gradient(160deg,#9cc5a1,#5b8f6a)]" />
              </div>
              <div className="print-right absolute inset-0 rounded-md bg-print p-2 pb-7 shadow-[0_8px_20px_-8px_rgba(80,50,0,0.45)]">
                <div className="h-full w-full rounded-sm bg-[linear-gradient(200deg,#f7a78b,#c9605a)]" />
              </div>
              <div className="absolute inset-0 rounded-md bg-print p-2 pb-7 shadow-[0_10px_24px_-8px_rgba(80,50,0,0.5)] transition-transform duration-300 group-hover:-translate-y-1.5">
                <div className="h-full w-full rounded-sm bg-[linear-gradient(180deg,#8fc3ea,#3f7fb7_70%,#e9cf8c_70%,#d9b468)]" />
              </div>
            </div>
          </div>
          <span className="font-display text-4xl text-ink sm:text-5xl">תמונות</span>
          <span className="mt-1 text-lg text-ink/75">כל הרגעים, לפי אלבומים</span>
        </Link>

        {/* Videos */}
        <Link
          href="/videos"
          className="group relative flex min-h-[18rem] flex-col justify-end overflow-hidden rounded-[2rem] bg-lake p-6 text-white transition-transform duration-200 active:scale-[0.98] sm:min-h-[26rem] sm:p-8"
        >
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex h-7 items-center justify-around bg-lake-deep px-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="h-3 w-4 rounded-[3px] bg-paper/85" />
            ))}
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-14 flex justify-center sm:top-20">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white/12 ring-1 ring-white/30 transition-transform duration-300 group-hover:scale-105 sm:h-36 sm:w-36">
              <svg viewBox="0 0 24 24" className="h-12 w-12 translate-x-0.5 fill-white sm:h-14 sm:w-14">
                <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
              </svg>
            </div>
          </div>
          <span className="font-display text-4xl sm:text-5xl">סרטונים</span>
          <span className="mt-1 text-lg text-white/80">לשבת ולצפות ביחד</span>
        </Link>
      </nav>
    </main>
  );
}
