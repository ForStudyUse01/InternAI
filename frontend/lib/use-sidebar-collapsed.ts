"use client";

import { useCallback, useLayoutEffect, useState } from "react";

const SIDEBAR_COLLAPSED_KEY = "internai.ui.sidebar_collapsed";
// Matches the `lg` breakpoint every dashboard shell already uses to switch
// the sidebar from an off-canvas mobile drawer to a sticky desktop rail.
const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * The collapsed *preference* is one shared boolean regardless of viewport,
 * but it must only ever change what renders on desktop -- the mobile
 * off-canvas drawer always shows the full labeled nav, same as before this
 * feature existed. Shells combine this with the raw `collapsed` flag
 * (`collapsed && isDesktopViewport`) before handing it to the nav/brand
 * header so a narrow phone drawer never collapses to an icon rail.
 */
export function useIsDesktopViewport() {
  const [isDesktop, setIsDesktop] = useState(false);

  useLayoutEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    setIsDesktop(mql.matches);
    const onChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

/**
 * Desktop-only sidebar rail preference, shared across every dashboard role.
 * Starts expanded (matches current markup) and syncs from localStorage in a
 * layout effect -- same pattern the dashboard layouts already use for cached
 * profile names -- so the collapsed rail never flashes wide before narrowing.
 */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);

  useLayoutEffect(() => {
    setCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true");
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }, []);

  return { collapsed, toggle };
}
