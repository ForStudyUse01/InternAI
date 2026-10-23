"use client";

import { Children } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type RevealVariant =
  | "fade-up"
  | "soft-scale"
  | "stagger-children"
  | "slide-left"
  | "slide-right"
  | "blur-up"
  | "zoom-in"
  | "clip-reveal"
  | "tilt-rise";

type ScrollRevealProps = {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  distance?: number;
  variant?: RevealVariant;
  threshold?: number;
  /** When false, animation replays each time the section enters the viewport */
  once?: boolean;
  staggerMs?: number;
};

type MotionState = {
  opacity: number;
  y?: number;
  x?: number;
  scale?: number;
  filter?: string;
  rotateX?: number;
  clipPath?: string;
};

const EASE = [0.22, 1, 0.36, 1] as const;

function buildStates(variant: Exclude<RevealVariant, "stagger-children">, distance: number, reducedMotion: boolean): { hidden: MotionState; visible: MotionState } {
  if (reducedMotion) return { hidden: { opacity: 0 }, visible: { opacity: 1 } };

  if (variant === "soft-scale") {
    return { hidden: { opacity: 0, y: 8, scale: 0.992 }, visible: { opacity: 1, y: 0, scale: 1 } };
  }
  if (variant === "slide-left") {
    return { hidden: { opacity: 0, x: -distance, scale: 0.998 }, visible: { opacity: 1, x: 0, scale: 1 } };
  }
  if (variant === "slide-right") {
    return { hidden: { opacity: 0, x: distance, scale: 0.998 }, visible: { opacity: 1, x: 0, scale: 1 } };
  }
  if (variant === "blur-up") {
    return { hidden: { opacity: 0, y: distance, scale: 0.992, filter: "blur(6px)" }, visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" } };
  }
  if (variant === "zoom-in") {
    return { hidden: { opacity: 0, y: 4, scale: 0.97 }, visible: { opacity: 1, y: 0, scale: 1 } };
  }
  if (variant === "clip-reveal") {
    return {
      hidden: { opacity: 0, y: Math.max(distance - 3, 8), scale: 0.996, clipPath: "inset(0% 100% 0% 0%)" },
      visible: { opacity: 1, y: 0, scale: 1, clipPath: "inset(0% 0% 0% 0%)" }
    };
  }
  if (variant === "tilt-rise") {
    return {
      hidden: { opacity: 0, y: distance, rotateX: 4 },
      visible: { opacity: 1, y: 0, rotateX: 0 }
    };
  }
  return { hidden: { opacity: 0, y: distance }, visible: { opacity: 1, y: 0 } };
}

const defaultViewport = {
  once: false as boolean,
  amount: 0.18,
  margin: "0px 0px 0px 0px" as const
};

export function ScrollReveal({
  children,
  className,
  delayMs = 0,
  distance = 14,
  variant = "fade-up",
  threshold = 0.18,
  once = false,
  staggerMs = 85
}: ScrollRevealProps) {
  const reducedMotion = useReducedMotion();
  const delay = delayMs / 1000;
  const stagger = staggerMs / 1000;
  const viewport = { ...defaultViewport, once, amount: threshold };

  if (variant === "stagger-children") {
    const items = Children.toArray(children);
    return (
      <motion.div
        className={cn("will-change-transform", className)}
        style={{ overflow: "visible" }}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
        variants={{
          hidden: {},
          visible: {
            transition: {
              delayChildren: delay,
              staggerChildren: reducedMotion ? 0 : stagger
            }
          }
        }}
      >
        {items.map((child, index) => (
          <motion.div
            key={index}
            className="hp-stagger-item"
            style={{ overflow: "visible" }}
            variants={{
              hidden: reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: Math.min(Math.max(distance - 4, 4), 10), scale: 0.996 },
              visible: {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { duration: 0.72, ease: EASE }
              }
            }}
          >
            {child}
          </motion.div>
        ))}
      </motion.div>
    );
  }

  const states = buildStates(variant, distance, !!reducedMotion);

  return (
    <motion.div
      className={cn("will-change-transform", className)}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      variants={{
        hidden: states.hidden,
        visible: {
          ...states.visible,
          transition: {
            delay,
            duration: 0.72,
            ease: EASE
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
}
