import gsap from "gsap";
import { ensureGsapRegistered } from "./gsap";

type HeroScrollFxTargets = {
  heroSection: HTMLElement;
  card: HTMLElement;
  headline: HTMLElement;
  /** Optional — absent under reduced motion or before the ambient layer mounts. */
  glow?: HTMLElement | null;
  ambient?: HTMLElement | null;
};

/**
 * Hero-scoped GSAP wiring: as the hero scrolls past, the product-preview
 * card recedes into depth (sinks down, tilts back, shrinks, fades) while the
 * headline lifts away in the opposite direction — the contrast is what reads
 * as spatial separation rather than "the card leaving the page". Glow and
 * ambient particles get their own, faster fade so no bright halo lingers
 * once the card itself is mostly gone.
 *
 * Independent scrub tweens on one shared ScrollTrigger, not a timeline, so
 * each target keeps its own easing/range. Targets are plain DOM nodes
 * outside Framer Motion's control (card's own entrance animation owns
 * `.hp-hero-preview-wrap`, not `.hp-preview-3d-scene` or the ambient layer)
 * and outside the pointer-tilt loop's control (that owns `.hp-preview-3d-tilt`,
 * a child of the card node) — so nothing fights over the same inline transform.
 */
export function setupHeroScrollFx({ heroSection, card, headline, glow, ambient }: HeroScrollFxTargets): () => void {
  ensureGsapRegistered();

  const ctx = gsap.context(() => {
    const scrollTrigger = {
      trigger: heroSection,
      start: "top top",
      end: "bottom top",
      scrub: 0.6
    };

    gsap.to(card, {
      y: 40,
      scale: 0.9,
      rotateX: 10,
      opacity: 0.4,
      transformPerspective: 700,
      ease: "none",
      scrollTrigger
    });

    gsap.to(headline, {
      y: -56,
      opacity: 0.3,
      ease: "none",
      scrollTrigger
    });

    if (glow) {
      gsap.to(glow, {
        opacity: 0.1,
        ease: "none",
        scrollTrigger
      });
    }

    if (ambient) {
      gsap.to(ambient, {
        opacity: 0.15,
        ease: "none",
        scrollTrigger
      });
    }
  }, heroSection);

  return () => ctx.revert();
}
