"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw, X } from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";

// Version-scoped SW URL. Every deploy changes the query, so the browser sees a
// new script and installs a fresh worker (drives the update flow + cache bust).
const SW_VERSION = `${process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0"}.${
  process.env.NEXT_PUBLIC_APP_BUILD ?? "dev"
}`;
const SW_URL = `/sw.js?v=${encodeURIComponent(SW_VERSION)}`;

// Cross-tab coordination so only ONE tab shows the update banner at a time.
// Ownership is claimed in localStorage (keyed by the update's version); a
// BroadcastChannel hands ownership to a waiting tab when the owner clears it.
const BANNER_KEY = "internai-sw-banner";
const CHANNEL_NAME = "internai-sw";

/**
 * Registers the service worker (production builds only — dev with Turbopack
 * stays uncached and warning-free) and surfaces a non-intrusive "new version
 * available" banner. No forced refresh: the user chooses when to reload.
 */
export function ServiceWorkerManager() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  // A worker detected but suppressed because another tab owns the banner.
  const pendingWorker = useRef<ServiceWorker | null>(null);
  const ownedVersion = useRef<string | null>(null);
  // Mirror of updateReady readable inside the (run-once) effect's listeners.
  const updateReadyRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const channel = "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL_NAME) : null;

    // Atomically try to become the single banner owner for this update version.
    // A claim already set to this exact version means another tab owns it; a
    // null or stale (older-version) claim is ours to take.
    const claimBanner = (version: string): boolean => {
      try {
        if (window.localStorage.getItem(BANNER_KEY) === version) return false; // another tab owns it
        window.localStorage.setItem(BANNER_KEY, version);
        ownedVersion.current = version;
        return true;
      } catch {
        return true; // storage blocked → just show; harmless duplicate at worst
      }
    };

    const releaseBanner = () => {
      try {
        if (window.localStorage.getItem(BANNER_KEY) === ownedVersion.current) {
          window.localStorage.removeItem(BANNER_KEY);
        }
      } catch {
        // ignore storage failures
      }
      ownedVersion.current = null;
      channel?.postMessage({ type: "banner-released" });
    };

    // Show the banner for `worker` if we can own it; otherwise stash it so a
    // later "banner-released" from the owner tab lets us take over seamlessly.
    const offerBanner = (worker: ServiceWorker) => {
      const version = worker.scriptURL;
      if (claimBanner(version)) {
        pendingWorker.current = null;
        updateReadyRef.current = true;
        setWaitingWorker(worker);
        setUpdateReady(true);
      } else {
        pendingWorker.current = worker;
      }
    };

    const onChannelMessage = (event: MessageEvent) => {
      if (event.data?.type === "banner-released" && pendingWorker.current && !updateReadyRef.current) {
        offerBanner(pendingWorker.current);
      }
    };
    channel?.addEventListener("message", onChannelMessage);

    let reloading = false;
    // Whether a SW controls the page right now. sw.js calls clients.claim()
    // on activate, so the very FIRST install also fires controllerchange --
    // reloading then would yank a page the user just loaded (and abort any
    // in-flight navigation). A forced reload is only correct when an
    // EXISTING controller is replaced via the user-approved SKIP_WAITING
    // update flow below.
    let hasController = !!navigator.serviceWorker.controller;
    const promoteWaiting = (registration: ServiceWorkerRegistration) => {
      // A worker is waiting only when one already controls the page (i.e. an
      // update, not the very first install).
      if (registration.waiting && navigator.serviceWorker.controller) {
        offerBanner(registration.waiting);
      }
    };

    const onControllerChange = () => {
      const isFirstClaim = !hasController;
      hasController = true;
      if (isFirstClaim) return;
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker
      .register(SW_URL)
      .then((registration) => {
        promoteWaiting(registration);
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              offerBanner(installing);
            }
          });
        });
      })
      .catch(() => {
        // Registration failures are non-fatal; the app runs without the SW.
      });

    // Free the banner ownership if this tab closes so another tab can show it.
    const onUnload = () => releaseBanner();
    window.addEventListener("pagehide", onUnload);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      window.removeEventListener("pagehide", onUnload);
      channel?.removeEventListener("message", onChannelMessage);
      releaseBanner();
      channel?.close();
    };
  }, []);

  const releaseOwnership = () => {
    try {
      if (window.localStorage.getItem(BANNER_KEY) === ownedVersion.current) {
        window.localStorage.removeItem(BANNER_KEY);
      }
    } catch {
      // ignore storage failures
    }
    ownedVersion.current = null;
    if ("BroadcastChannel" in window) {
      const c = new BroadcastChannel(CHANNEL_NAME);
      c.postMessage({ type: "banner-released" });
      c.close();
    }
  };

  const applyUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
    updateReadyRef.current = false;
    setUpdateReady(false);
    releaseOwnership();
  };

  const dismissUpdate = () => {
    updateReadyRef.current = false;
    setUpdateReady(false);
    releaseOwnership();
  };

  return (
    <AnimatePresence>
      {updateReady ? (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed inset-x-4 bottom-4 z-[1000] mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface-raised,var(--ds-card))] p-4 shadow-lg sm:left-auto sm:right-4 sm:mx-0"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ds-info-bg)] text-[var(--ds-primary-text)]">
            <AppIcon icon={RefreshCw} size="sm" className="text-current" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--ds-text)]">New version available</p>
            <p className="text-xs text-[var(--ds-muted)]">Refresh to get the latest InternAI.</p>
          </div>
          <button
            type="button"
            onClick={applyUpdate}
            className="shrink-0 rounded-lg bg-[var(--ds-primary)] px-3 py-1.5 text-sm font-semibold text-[var(--ds-on-primary)] transition-colors hover:bg-[var(--ds-primary-hover)]"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={dismissUpdate}
            aria-label="Dismiss update notice"
            className="shrink-0 rounded-lg p-1 text-[var(--ds-muted)] transition-colors hover:text-[var(--ds-text)]"
          >
            <AppIcon icon={X} size="xs" className="text-current" />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
