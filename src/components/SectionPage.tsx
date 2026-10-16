import Link from "next/link";

export function SectionPage({
  title,
  empty,
  accent,
}: {
  title: string;
  empty: string;
  accent: "sun" | "lake";
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 pb-8 pt-6 sm:px-8 sm:pt-10">
      <Link
        href="/"
        className="mb-6 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 -ms-3 text-lg text-muted transition-colors hover:bg-ink/5 hover:text-ink"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        למסך הראשי
      </Link>
      <h1 className="font-display text-[2.6rem] leading-[1.05] sm:text-6xl">{title}</h1>
      <div
        className={`mt-8 flex flex-1 items-center justify-center rounded-[2rem] border-2 border-dashed p-8 text-center text-lg text-muted ${
          accent === "sun" ? "border-sun-deep/50" : "border-lake/40"
        }`}
      >
        {empty}
      </div>
    </main>
  );
}
