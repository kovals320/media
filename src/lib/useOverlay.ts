"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Full-screen overlays (video player, photo viewer) that close with the
 * phone's back button and Escape, and lock page scrolling while open.
 */
export function useOverlay(isOpen: boolean, onClosed: () => void) {
  const pushed = useRef(false);
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;

  // Call right before opening.
  const markOpened = useCallback(() => {
    if (!pushed.current) {
      window.history.pushState({ mediaOverlay: true }, "");
      pushed.current = true;
    }
  }, []);

  // Close via history so the back stack stays clean.
  const close = useCallback(() => {
    if (pushed.current) window.history.back();
    else onClosedRef.current();
  }, []);

  useEffect(() => {
    function onPop() {
      if (pushed.current) {
        pushed.current = false;
        onClosedRef.current();
      }
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, close]);

  return { markOpened, close };
}
