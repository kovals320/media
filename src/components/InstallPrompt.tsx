"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = "media-install-dismissed";
const DISMISS_DAYS = 30;

function wasDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return at > 0 && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

function remember() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {}
}

/**
 * Invites phone visitors to install the site as an app.
 * Android/Chrome: a real "install" button. iPhone/Safari: short instructions,
 * because iOS has no install prompt (only Share -> Add to Home Screen).
 */
export function InstallPrompt() {
  const [androidEvent, setAndroidEvent] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone || wasDismissed()) return;

    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
    if (isIos && isSafari) {
      setIos(true);
      setHidden(false);
    }

    function onPrompt(e: Event) {
      e.preventDefault();
      setAndroidEvent(e as InstallEvent);
      setHidden(false);
    }
    function onInstalled() {
      setHidden(true);
      remember();
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden || (!androidEvent && !ios)) return null;

  function dismiss() {
    remember();
    setHidden(true);
  }

  async function install() {
    if (!androidEvent) return;
    await androidEvent.prompt();
    const choice = await androidEvent.userChoice.catch(() => null);
    setAndroidEvent(null);
    setHidden(true);
    if (choice?.outcome !== "accepted") remember();
  }

  return (
    <div
      role="dialog"
      aria-label="התקנת האפליקציה"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-3xl bg-ink p-4 text-white shadow-[0_12px_40px_-12px_rgba(0,0,0,0.5)]"
    >
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">להוסיף את המדיה של המשפחה למסך הבית?</p>
          {ios ? (
            <p className="mt-1 text-white/75">
              הקישו על כפתור השיתוף
              <svg aria-hidden viewBox="0 0 24 24" className="mx-1 inline h-4 w-4 -translate-y-0.5 fill-none stroke-current stroke-2">
                <path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              ואז על &quot;הוספה למסך הבית&quot;.
            </p>
          ) : (
            <p className="mt-1 text-white/75">נפתח כמו אפליקציה, בלחיצה אחת מהמסך.</p>
          )}
        </div>
        <button type="button" onClick={dismiss} aria-label="סגירה" className="shrink-0 rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {androidEvent && (
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={install} className="flex-1 rounded-2xl bg-sun px-4 py-2.5 font-semibold text-ink hover:bg-sun-deep">
            התקנה
          </button>
          <button type="button" onClick={dismiss} className="rounded-2xl px-4 py-2.5 text-white/80 hover:bg-white/10">
            לא עכשיו
          </button>
        </div>
      )}
    </div>
  );
}
