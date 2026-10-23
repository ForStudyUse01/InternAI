"use client";

export function isFullscreenActive(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(document.fullscreenElement);
}

export async function requestElementFullscreen(element: HTMLElement): Promise<boolean> {
  if (typeof document === "undefined") return false;
  if (!element.requestFullscreen) return false;

  try {
    await element.requestFullscreen();
    return isFullscreenActive();
  } catch {
    return false;
  }
}

export async function exitElementFullscreen(): Promise<void> {
  if (typeof document === "undefined") return;
  if (!document.fullscreenElement) return;

  try {
    await document.exitFullscreen();
  } catch {
    // ignore — browser may already have exited
  }
}

export function onFullscreenChange(handler: () => void): () => void {
  if (typeof document === "undefined") return () => undefined;
  document.addEventListener("fullscreenchange", handler);
  return () => document.removeEventListener("fullscreenchange", handler);
}
