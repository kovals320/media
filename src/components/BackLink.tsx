import Link from "next/link";

export function BackLink({ href = "/", label = "למסך הראשי" }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      className="mb-6 -ms-3 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-lg text-muted transition-colors hover:bg-ink/5 hover:text-ink"
    >
      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </Link>
  );
}
