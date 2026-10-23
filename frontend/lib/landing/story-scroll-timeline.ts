import gsap from "gsap";
import { ensureGsapRegistered } from "./gsap";

export type StoryProgress = {
  /** 0-1 across the whole pinned story timeline (all stages combined). */
  overall: number;
  /** Index of the currently-dominant stage. */
  stageIndex: number;
  /** 0-1 progress within the dominant stage's own window. */
  stageProgress: number;
};

/**
 * Ordered stage ids. Phase 1 ships only "ai-matching" — later phases append
 * to this list and nothing else in this module needs to change, since each
 * stage automatically gets an equal share of the pinned scroll distance.
 */
export const STORY_STAGE_IDS = ["ai-matching"] as const;

const VH_PER_STAGE = 140;

function deriveStageState(overall: number): Pick<StoryProgress, "stageIndex" | "stageProgress"> {
  const stageCount = STORY_STAGE_IDS.length;
  const scaled = overall * stageCount;
  const stageIndex = Math.min(stageCount - 1, Math.max(0, Math.floor(scaled)));
  const stageProgress = Math.min(1, Math.max(0, scaled - stageIndex));
  return { stageIndex, stageProgress };
}

type StoryScrollFxTargets = {
  storySection: HTMLElement;
  /** Mutable object this module writes into on every scroll-linked update —
   * the caller owns it and reads it back (e.g. from an R3F useFrame). */
  progress: StoryProgress;
  /** Fired after progress is mutated — used to invalidate a frameloop="demand" canvas. */
  onUpdate?: () => void;
};

/**
 * Pins the story section under the sticky navbar (effective z-index 50; the
 * navbar's own h-16 gives a fixed 64px offset at every breakpoint) for one
 * scroll-distance "slot" per stage, and drives a single scrubbed progress
 * value that both the pinning ScrollTrigger and the 3D scene read from.
 *
 * One pinning tween on a plain object (not DOM styles) — same "shared
 * scrollTrigger config, independent gsap.to targets" idea as the Hero's own
 * scroll fx, just with a single target here since Phase 1 only drives one
 * progress value.
 */
export function setupStoryScrollFx({ storySection, progress, onUpdate }: StoryScrollFxTargets): () => void {
  ensureGsapRegistered();

  const ctx = gsap.context(() => {
    gsap.to(progress, {
      overall: 1,
      ease: "none",
      onUpdate: () => {
        const { stageIndex, stageProgress } = deriveStageState(progress.overall);
        progress.stageIndex = stageIndex;
        progress.stageProgress = stageProgress;
        onUpdate?.();
      },
      scrollTrigger: {
        trigger: storySection,
        start: "top 64px",
        end: `+=${STORY_STAGE_IDS.length * VH_PER_STAGE}%`,
        scrub: 0.6,
        pin: true
      }
    });
  }, storySection);

  return () => ctx.revert();
}
