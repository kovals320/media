"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signOut } from "@/app/actions";

// The home page is cached for everyone, so the admin's buttons are added in the browser.
export function AdminLinks() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { isAdmin: false }))
      .then((d: { isAdmin?: boolean }) => setIsAdmin(Boolean(d.isAdmin)))
      .catch(() => {});
  }, []);

  if (!isAdmin) return null;
  return (
    <div className="order-first flex items-center gap-1 self-end text-sm sm:absolute sm:left-0 sm:top-1/2 sm:order-none sm:-translate-y-1/2 sm:text-base">
      <Link href="/admin" className="rounded-full px-3 py-1.5 text-muted transition-colors hover:bg-ink/5 hover:text-ink">
        ניהול
      </Link>
      <form action={signOut}>
        <button className="rounded-full px-3 py-1.5 text-muted transition-colors hover:bg-ink/5 hover:text-ink">
          יציאה
        </button>
      </form>
    </div>
  );
}
