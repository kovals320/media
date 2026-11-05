"use client";

import { useEffect, useState } from "react";

// "New since your last visit". Each phone remembers when it last opened the app.
// A visit lasts until the browser tab or app is closed, so the labels stay put
// while moving between pages, and are gone on the next visit.
const LAST_KEY = "media-last-visit"; // localStorage: when this phone last opened the app
const SINCE_KEY = "media-visit-since"; // sessionStorage: the previous visit, for this visit

/** Seconds since 1970 of the previous visit, or null on a first visit. */
function readSince(): number | null {
  try {
    const kept = window.sessionStorage.getItem(SINCE_KEY);
    if (kept !== null) return kept === "" ? null : Number(kept);
    const last = window.localStorage.getItem(LAST_KEY);
    const since = last && Number.isFinite(Number(last)) ? Number(last) : null;
    window.sessionStorage.setItem(SINCE_KEY, since === null ? "" : String(since));
    return since;
  } catch {
    return null;
  }
}

function markVisit() {
  try {
    window.localStorage.setItem(LAST_KEY, String(Math.floor(Date.now() / 1000)));
  } catch {}
}

export type WhatsNew = {
  since: number | null;
  photos: [number, string, number][]; // [added at, year, count]
  videos: [number, string][]; // [added at, video id]
};

let shared: Promise<WhatsNew> | null = null;

function load(): Promise<WhatsNew> {
  if (!shared) {
    const since = readSince();
    markVisit();
    shared =
      since === null
        ? Promise.resolve({ since, photos: [], videos: [] })
        : fetch("/api/whats-new")
            .then((r) => (r.ok ? r.json() : { photos: [], videos: [] }))
            .then((d) => ({ since, photos: d.photos ?? [], videos: d.videos ?? [] }))
            .catch(() => ({ since, photos: [], videos: [] }));
  }
  return shared;
}

/** The previous visit time only (no network), e.g. to mark new photos in a grid. */
export function useSince(): number | null {
  const [since, setSince] = useState<number | null>(null);
  useEffect(() => {
    setSince(readSince());
    markVisit();
  }, []);
  return since;
}

/** What was added since the previous visit. */
export function useWhatsNew() {
  const [data, setData] = useState<WhatsNew | null>(null);
  useEffect(() => {
    let alive = true;
    load().then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, []);
  if (!data || data.since === null) return null;
  const since = data.since;
  const byYear = new Map<string, number>();
  let photos = 0;
  for (const [at, year, n] of data.photos) {
    if (at + 59 < since) continue; // the whole minute was before the last visit
    photos += n;
    byYear.set(year, (byYear.get(year) ?? 0) + n);
  }
  const videoIds = new Set(data.videos.filter(([at]) => at > since).map(([, id]) => id));
  return { since, photos, byYear, videoIds };
}
