/**
 * Drives a <video>'s currentTime from normalized scroll progress.
 *
 * Deliberately framework-free and state-free: the story ScrollTrigger runs its
 * onUpdate at frame rate, so anything that triggered a React render per tick
 * would be a re-render storm. This just stores the latest value and reconciles
 * it against the decoder once per animation frame.
 */

/** Source is 24fps. Used to land progress 1 on the last real frame, not past it. */
const FRAME_DURATION = 1 / 24;

/** Below this the seek isn't visible, so it isn't worth waking the decoder. */
const MIN_SEEK_DELTA = 1 / 30;

export type VideoScrubber = {
  /** Safe to call at frame rate; coalesces to at most one seek per frame. */
  setProgress(progress: number): void;
  destroy(): void;
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export function createVideoScrubber(video: HTMLVideoElement): VideoScrubber {
  let pendingProgress: number | null = null;
  let lastApplied = -1;
  let frameId: number | null = null;
  let destroyed = false;

  const flush = () => {
    frameId = null;
    if (destroyed || pendingProgress === null) return;

    const duration = video.duration;
    // Metadata may not have arrived yet. Keep the value pending rather than
    // dropping it — loadedmetadata reschedules us.
    if (!Number.isFinite(duration) || duration <= 0) return;

    // Seeking while a previous seek is still in flight just queues work the
    // decoder can't retire, which is what makes scrubbing feel like it lags
    // behind the scroll. Hold the value and try again next frame.
    if (video.seeking) {
      schedule();
      return;
    }

    // Stop one frame short of the end: currentTime === duration can leave the
    // final frame unpainted or fire `ended`, and this video's last frame is
    // the branded moment that has to stay on screen at the end of the pin.
    const target = pendingProgress * Math.max(0, duration - FRAME_DURATION);
    pendingProgress = null;

    if (Math.abs(target - lastApplied) < MIN_SEEK_DELTA) return;

    lastApplied = target;
    video.currentTime = target;
  };

  const schedule = () => {
    if (destroyed || frameId !== null) return;
    frameId = window.requestAnimationFrame(flush);
  };

  const onLoadedMetadata = () => schedule();

  video.addEventListener("loadedmetadata", onLoadedMetadata);

  return {
    setProgress(progress: number) {
      if (destroyed) return;
      pendingProgress = clamp01(progress);
      schedule();
    },
    destroy() {
      destroyed = true;
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      frameId = null;
      pendingProgress = null;
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
    }
  };
}

/**
 * iPadOS Safari often refuses to paint frames from currentTime seeks until the
 * element has been touched by a real user gesture. A muted play() immediately
 * followed by pause() satisfies that without anything audible or visible.
 * No-ops everywhere else.
 */
export function primeVideoOnFirstGesture(video: HTMLVideoElement): () => void {
  let done = false;

  const prime = () => {
    if (done) return;
    done = true;
    cleanup();

    // Parking on the last frame leaves the element in the `ended` state, and
    // play() on an ended media element rewinds it to 0 — measured, not
    // theoretical. If the gesture arrives after the user has already scrolled
    // to the branded final frame, priming would visibly snap it back to the
    // opening frame, so restore wherever we were.
    const resumeAt = video.currentTime;

    void video
      .play()
      .then(() => {
        video.pause();
        if (Math.abs(video.currentTime - resumeAt) > 0.01) video.currentTime = resumeAt;
      })
      .catch(() => {
        /* Autoplay policy or an unsupported source — scrubbing may still work. */
      });
  };

  const cleanup = () => {
    window.removeEventListener("pointerdown", prime);
    window.removeEventListener("touchstart", prime);
  };

  window.addEventListener("pointerdown", prime, { passive: true, once: true });
  window.addEventListener("touchstart", prime, { passive: true, once: true });

  return cleanup;
}
