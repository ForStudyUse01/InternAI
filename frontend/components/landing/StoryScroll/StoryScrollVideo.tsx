"use client";

import { forwardRef } from "react";

type StoryScrollVideoProps = {
  src: string;
  className?: string;
};

/**
 * The brand video as a scroll-scrubbed timeline, never a playing background.
 *
 * Intentionally dumb: it renders the element and hands back the ref. Seeking
 * is owned by lib/landing/video-scrubber.ts, driven from the story
 * ScrollTrigger's single onUpdate — there is no second scroll system here.
 *
 * No `poster` attribute on purpose. The generated poster is the *final*
 * branded frame (used for the static mobile/reduced-motion fallback), so
 * setting it here would flash the logo before the first dark frame decodes,
 * which is the opposite of the intended cold open.
 */
export const StoryScrollVideo = forwardRef<HTMLVideoElement, StoryScrollVideoProps>(
  function StoryScrollVideo({ src, className }, ref) {
    return (
      <video
        ref={ref}
        className={className}
        src={src}
        // preload="auto" is required — scrubbing needs buffered frames, not
        // just metadata. The element is only mounted near the viewport so this
        // never competes with the Hero for bandwidth.
        preload="auto"
        muted
        playsInline
        disablePictureInPicture
        aria-hidden
        tabIndex={-1}
      />
    );
  }
);
