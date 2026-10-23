"use client";

import { useEffect, useRef } from "react";

/**
 * Accessible focus management for overlay dialogs.
 *
 * While `active` is true it:
 *  - records the element that had focus before the dialog opened,
 *  - moves focus into the dialog (first focusable element, else the container),
 *  - traps Tab / Shift+Tab so focus cannot leave the dialog,
 *  - restores focus to the original trigger on cleanup (close/unmount).
 *
 * Attach the returned ref to the dialog container element.
 */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "audio[controls]",
  "video[controls]",
  "[contenteditable]:not([contenteditable='false'])"
].join(",");

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement
  );
}

export function useFocusTrap<T extends HTMLElement = HTMLElement>(active: boolean) {
  const containerRef = useRef<T | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    previouslyFocused.current = (document.activeElement as HTMLElement | null) ?? null;

    // Move focus into the dialog once it is mounted/animated in.
    const focusables = getFocusable(container);
    const initial = focusables[0] ?? container;
    if (initial === container && !container.hasAttribute("tabindex")) {
      container.setAttribute("tabindex", "-1");
    }
    const raf = requestAnimationFrame(() => initial.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = getFocusable(container);
      if (items.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      const outside = !activeEl || !container.contains(activeEl);
      if (event.shiftKey) {
        if (outside || activeEl === first || activeEl === container) {
          event.preventDefault();
          last.focus();
        }
      } else if (outside || activeEl === last || activeEl === container) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", handleKeyDown, true);
      const toRestore = previouslyFocused.current;
      if (toRestore && typeof toRestore.focus === "function") {
        toRestore.focus();
      }
    };
  }, [active]);

  return containerRef;
}
