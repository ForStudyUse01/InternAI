import { motion, useMotionValue, useSpring, useTransform, useScroll } from "framer-motion";
import { ReactNode, useRef, useEffect, useState } from "react";

interface ReactiveGlowProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  intensity?: number;
}

export function ReactiveGlow({ children, className = "", glowColor = "#00FF88", intensity = 1 }: ReactiveGlowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const isHovering = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 200, mass: 0.5 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  const glowX = useTransform(springX, [0, 1], ["0%", "100%"]);
  const glowY = useTransform(springY, [0, 1], ["0%", "100%"]);
  const glowOpacity = useTransform(isHovering, [0, 1], [0, 0.6 * intensity]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
    isHovering.set(1);
  };

  const handleMouseLeave = () => {
    isHovering.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden ${className}`}
      style={{ borderRadius: "inherit" }}
    >
      {children}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          left: glowX,
          top: glowY,
          width: "200%",
          height: "200%",
          x: "-50%",
          y: "-50%",
          background: `radial-gradient(circle at center, ${glowColor}40 0%, transparent 50%)`,
          opacity: glowOpacity,
          mixBlendMode: "screen",
          transition: "opacity 0.3s ease",
        }}
      />
    </motion.div>
  );
}

interface GlowButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "outline";
  className?: string;
}

export function GlowButton({ children, href, onClick, variant = "primary", className = "" }: GlowButtonProps) {
  const ref = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 300, mass: 0.3 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const baseClasses = "relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer";

  const variantClasses = {
    primary: "bg-gradient-to-r from-[#00FF88] to-[#00E0FF] text-black shadow-[0_16px_40px_rgba(0,255,136,0.24)] hover:shadow-[0_24px_60px_rgba(0,255,136,0.35)]",
    secondary: "border border-white/15 bg-white/5 text-white/85 hover:border-white/25 hover:bg-white/10",
    outline: "border border-[#00FF88]/30 bg-transparent text-[#00FF88] hover:bg-[#00FF88]/10 hover:shadow-[0_0_30px_rgba(0,255,136,0.2)]",
  };

  const content = (
    <>
      <motion.span
        className="absolute inset-0 pointer-events-none"
        style={{
          background: useTransform(
            [springX, springY],
            ([x, y]) => `radial-gradient(150px circle at ${x}px ${y}px, rgba(0,255,136,0.15), transparent 50%)`
          ),
        }}
      />
      <span className="relative z-10">{children}</span>
    </>
  );

  if (href) {
    return (
      <motion.a
        ref={ref as React.RefObject<HTMLAnchorElement>}
        href={href}
        onMouseMove={handleMouseMove}
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      type="button"
    >
      {content}
    </motion.button>
  );
}

interface AnimatedCounterProps {
  value: string | number;
  label: string;
  className?: string;
  delay?: number;
}

export function AnimatedCounter({ value, label, className = "", delay = 0 }: AnimatedCounterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  const numericValue = typeof value === "string" ? parseFloat(value.replace(/[^\d.]/g, "")) || 0 : value;
  const suffix = typeof value === "string" ? value.replace(/[\d.]/g, "") : "";

  return (
    <div ref={ref} className={`rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all duration-500 hover:border-[#00FF88]/50 hover:bg-white/10 group ${className}`}>
      <motion.div
        className="text-2xl font-bold text-[#00FF88]"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={isVisible ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay }}
        style={{
          textShadow: isVisible ? "0 0 20px rgba(0,255,136,0.5)" : "none",
        }}
      >
        {isVisible ? value : "0" + suffix}
      </motion.div>
      <div className="mt-2 text-sm text-white/55 transition-colors group-hover:text-white/85">{label}</div>
    </div>
  );
}
