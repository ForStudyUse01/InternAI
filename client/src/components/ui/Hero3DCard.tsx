import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import React, { ReactNode, useRef } from "react";

export function Hero3DCard({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0.5); // 0 to 1
  const y = useMotionValue(0.5);

  // Map 0 -> 1 directly to degrees of rotation
  const rotateX = useTransform(y, [0, 1], [15, -15]); 
  const rotateY = useTransform(x, [0, 1], [-15, 15]);

  // Spring physics for smooth return
  const springConfig = { damping: 20, stiffness: 150, mass: 1 };
  const springRotateX = useSpring(rotateX, springConfig);
  const springRotateY = useSpring(rotateY, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    x.set(mouseX / width);
    y.set(mouseY / height);
  };

  const handleMouseLeave = () => {
    x.set(0.5);
    y.set(0.5);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-10 w-full lg:max-w-[420px] mx-auto group cursor-pointer"
      style={{ perspective: "1200px" }}
    >
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
        className="relative w-full rounded-[32px] transition-shadow duration-300 group-hover:shadow-[0_45px_100px_rgba(0,255,136,0.25)]"
      >
        {/* Dynamic Glow Base beneath the card */}
        <motion.div 
          className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-[#00FF88]/30 to-[#00E0FF]/30 blur-3xl opacity-60 group-hover:opacity-100 group-hover:blur-[40px] transition-all duration-500"
          style={{
             x: useTransform(x, [0, 1], ["-10%", "10%"]),
             y: useTransform(y, [0, 1], ["-10%", "10%"]),
             transform: "translateZ(-20px)"
          }}
        />
        
        {/* Card Container */}
        <div 
          className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/6 p-6 backdrop-blur-2xl transition-colors duration-300 group-hover:border-white/25"
          style={{ transformStyle: "preserve-3d", transform: "translateZ(10px)" }}
        >
          {/* Holographic / Light Reflection Overlay */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#00E0FF]/20 to-[#00FF88]/30 mix-blend-screen opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-[32px]"
            style={{
               backgroundPosition: useTransform(x, [0, 1], ["0% 0%", "100% 100%"]),
               backgroundSize: "200% 200%",
               transform: "translateZ(1px)"
            }}
          />
          
          {/* Shine effect trailing the mouse slightly */}
          <motion.div
            className="absolute opacity-0 group-hover:opacity-60 pointer-events-none blur-3xl transition-opacity duration-300"
            style={{
               top: useTransform(y, [0, 1], ["-100%", "100%"]),
               left: useTransform(x, [0, 1], ["-100%", "100%"]),
               width: "200px",
               height: "200px",
               background: "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)",
               transform: "translate(-50%, -50%) translateZ(2px)"
            }}
          />

          {/* Children wrapped so they appear popped out (parallax depth) */}
          <div className="relative" style={{ transformStyle: "preserve-3d", transform: "translateZ(35px)" }}>
            {children}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
