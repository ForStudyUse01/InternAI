"use client";

import { useEffect } from "react";
import type { RefObject } from "react";

/**
 * APG keyboard support for an existing `role="tablist"` of `role="tab"` buttons.
 *
 * Attach the returned-into ref to the tablist container. The hook:
 *  - maintains a roving tabindex (selected tab = 0, others = -1) so the tablist is
 *    a single Tab stop, mirroring aria-selected as it changes,
 *  - moves focus with ArrowLeft/Right/Up/Down/Home/End and activates the target tab
 *    by clicking it (reusing each tab's existing onClick handler — no API change).
 *
 * Works with any tablist whose tabs already set aria-selected; no markup changes
 * beyond attaching the ref.
 */
export function useTablistKeyboard(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const list = ref.current;
    if (!list) return;

    const getTabs = () => Array.from(list.querySelectorAll<HTMLElement>('[role="tab"]'));

    const applyRoving = () => {
      const tabs = getTabs();
      if (tabs.length === 0) return;
      const hasSelected = tabs.some((t) => t.getAttribute("aria-selected") === "true");
      tabs.forEach((tab, index) => {
        const selected = tab.getAttribute("aria-selected") === "true";
        // If nothing is marked selected, keep the first tab reachable.
        tab.setAttribute("tabindex", selected || (!hasSelected && index === 0) ? "0" : "-1");
      });
    };

    applyRoving();
    const observer = new MutationObserver(applyRoving);
    observer.observe(list, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["aria-selected"]
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      const tabs = getTabs();
      if (tabs.length === 0) return;
      const current = tabs.indexOf(document.activeElement as HTMLElement);
      let next: number | null = null;
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          next = current < 0 ? 0 : (current + 1) % tabs.length;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          next = current < 0 ? 0 : (current - 1 + tabs.length) % tabs.length;
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = tabs.length - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      const target = tabs[next];
      target.focus();
      target.click();
    };

    list.addEventListener("keydown", handleKeyDown);
    return () => {
      observer.disconnect();
      list.removeEventListener("keydown", handleKeyDown);
    };
  }, [ref]);
}
