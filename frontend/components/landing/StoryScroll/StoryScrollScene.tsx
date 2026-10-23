"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useInView } from "framer-motion";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { StoryScrollVideo } from "@/components/landing/StoryScroll/StoryScrollVideo";
import { setupStoryScrollFx, type StoryProgress } from "@/lib/landing/story-scroll-timeline";
import { createVideoScrubber, primeVideoOnFirstGesture, type VideoScrubber } from "@/lib/landing/video-scrubber";
import { useMediaQuery } from "@/lib/use-media-query";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const VIDEO_SRC = "/story/internai-brand-intro.mp4";
const POSTER_SRC = "/story/internai-brand-intro-poster.jpg";

type StoryScrollSceneProps = {
  id?: string;
  label: string;
  title: string;
  children: ReactNode;
};

/** Beat boundaries for the step rail. */
function stepFromProgress(progress: number): 0 | 1 | 2 {
  if (progress < 0.2) return 0;
  if (progress < 0.45) return 1;
  return 2;
}

/**
 * Sticky scroll-driven host for the story section, and the single owner of its
 * scroll progress.
 *
 * The 3D scene that used to sit in front of the video was removed; the brand
 * video is now the section's visual, scrubbed frame-by-frame from scroll
 * position. It never plays on its own — scrolling down advances it, scrolling
 * up rewinds it, and stopping freezes the frame. That is the whole effect.
 *
 * One ScrollTrigger, one normalized progress value, two consumers: the video's
 * currentTime and the active step card. Anything added back later should read
 * the same `progressRef` rather than introducing a second scroll system.
 *
 * Desktop/tablet get the pin and the scrubbed video; mobile and
 * prefers-reduced-motion get the same content in normal document flow behind a
 * static poster frame — no pin, and no video download at all.
 */
export function StoryScrollScene({ id, label, title, children }: StoryScrollSceneProps) {
  // The section node is needed both as state (so its arrival re-renders and
  // attaches the ScrollTrigger) and as a ref (so useInView can observe it).
  // Reading a ref's .current during render is unsafe — its mutations don't
  // schedule updates — hence the pair rather than a lone useRef.
  const sectionRef = useRef<HTMLElement | null>(null);
  const [sectionEl, setSectionEl] = useState<HTMLElement | null>(null);
  const setSection = useCallback((el: HTMLElement | null) => {
    sectionRef.current = el;
    setSectionEl(el);
  }, []);

  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [mounted, setMounted] = useState(false);

  const progressRef = useRef<StoryProgress>({ overall: 0, stageIndex: 0, stageProgress: 0 });
  const scrubberRef = useRef<VideoScrubber | null>(null);

  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
  const reducedMotion = useReducedMotion();

  // preload="auto" fetches the whole file, so the element must not exist until
  // the section is close. Generous margin so frames are buffered before the
  // first scrub, never so early that it competes with the Hero.
  const nearViewport = useInView(sectionRef, { margin: "600px 0px" });

  useEffect(() => setMounted(true), []);

  const animated = mounted && !reducedMotion && (isDesktop || isTablet);
  const showVideo = animated && nearViewport;
  const showPoster = mounted && !animated;

  useEffect(() => {
    if (!animated || !sectionEl) return;

    // Set here rather than in JSX so a re-render can never reset it to its
    // initial value mid-scroll.
    sectionEl.dataset.activeStep = "0";

    return setupStoryScrollFx({
      storySection: sectionEl,
      progress: progressRef.current,
      onUpdate: () => {
        const { overall } = progressRef.current;

        scrubberRef.current?.setProgress(overall);

        // Direct DOM write, guarded: scrub runs at frame rate, so a setState
        // here would be a re-render storm. Guarding on the current value means
        // this touches the DOM three times across the whole scroll instead of
        // every tick, and the CSS transition smooths the switch.
        const step = String(stepFromProgress(overall));
        if (sectionEl.dataset.activeStep !== step) sectionEl.dataset.activeStep = step;
      }
    });
  }, [animated, sectionEl]);

  useEffect(() => {
    if (!videoEl) return;

    const scrubber = createVideoScrubber(videoEl);
    scrubberRef.current = scrubber;
    const stopPriming = primeVideoOnFirstGesture(videoEl);

    // The video mounts on approach, which can be mid-pin if the user jumped
    // via an anchor link — seek straight to wherever the story already is.
    scrubber.setProgress(progressRef.current.overall);

    return () => {
      scrubberRef.current = null;
      scrubber.destroy();
      stopPriming();
    };
  }, [videoEl]);

  return (
    <section id={id} className="hp-section hp-story" ref={setSection}>
      {mounted && (
        <div className="hp-story-media" aria-hidden>
          {showVideo && <StoryScrollVideo ref={setVideoEl} src={VIDEO_SRC} className="hp-story-video" />}
          {showPoster && <img src={POSTER_SRC} alt="" className="hp-story-poster" />}
          <div className="hp-story-scrim" />
        </div>
      )}

      <div className="hp-story-content">
        <div className="hp-story-head">
          <ScrollReveal variant="fade-up" distance={10} once={false}>
            <p className="hp-label">{label}</p>
            <h2 className="hp-title mt-2">{title}</h2>
          </ScrollReveal>
        </div>

        <div className="hp-story-body">
          {animated ? (
            children
          ) : (
            <ScrollReveal variant="stagger-children" distance={8} staggerMs={120} threshold={0.12} once={false}>
              {children}
            </ScrollReveal>
          )}
        </div>
      </div>
    </section>
  );
}
