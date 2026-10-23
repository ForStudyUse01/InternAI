import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

/** Shared across every landing-page GSAP/ScrollTrigger consumer so the plugin
 * is registered exactly once regardless of mount order. */
export function ensureGsapRegistered() {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}
