import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

// Dancing cat GIFs (multiple options, using a lively dancing cat)
const DANCING_CAT_GIF = "https://media.tenor.com/cnC-YVSXNeAAAAAm/frugitofficial-frugit.webp";

export function DancingStudent() {
  return (
    <motion.div
      className="relative flex flex-col items-center justify-center gap-6"
      initial={{ opacity: 0, x: 60, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.8 }}
      transition={{ duration: 0.5, ease }}
    >
      {/* Glow ring behind the cat */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle at 50% 60%, rgba(0,255,136,0.12) 0%, transparent 70%)",
        }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
      />

      {/* Floating music notes */}
      {["♪", "♫", "♩", "♬"].map((note, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute text-xl font-bold select-none"
          style={{
            color: i % 2 === 0 ? "#00FF88" : "#00E0FF",
            left: `${i < 2 ? 0 : 85}%`,
            top: `${10 + i * 20}%`,
          }}
          animate={{
            y: [0, -25, 0],
            x: [0, (i % 2 === 0 ? 8 : -8), 0],
            opacity: [0.2, 0.8, 0.2],
            rotate: [0, 15, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 2 + i * 0.4,
            ease: "easeInOut",
            delay: i * 0.5,
          }}
        >
          {note}
        </motion.span>
      ))}

      {/* The dancing cat */}
      <motion.div
        className="relative z-10"
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut" }}
      >
        {/* Outer neon glow border */}
        <motion.div
          className="absolute -inset-3 rounded-3xl"
          animate={{
            boxShadow: [
              "0 0 20px rgba(0,255,136,0.3), 0 0 40px rgba(0,255,136,0.1)",
              "0 0 30px rgba(0,224,255,0.4), 0 0 60px rgba(0,224,255,0.15)",
              "0 0 20px rgba(0,255,136,0.3), 0 0 40px rgba(0,255,136,0.1)",
            ],
          }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        />

        <img
          src={DANCING_CAT_GIF}
          alt="Dancing cat"
          className="relative z-10 w-40 h-40 rounded-2xl object-cover"
          style={{ imageRendering: "auto" }}
        />

        {/* Disco floor shimmer below */}
        <motion.div
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-2 w-40 rounded-full blur-sm"
          animate={{
            background: [
              "rgba(0,255,136,0.5)",
              "rgba(0,224,255,0.5)",
              "rgba(0,255,136,0.5)",
            ],
            width: ["140px", "160px", "140px"],
          }}
          transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Sparkle particles */}
      {[
        { top: "10%", left: "5%", delay: 0, color: "#00FF88" },
        { top: "25%", left: "92%", delay: 0.4, color: "#00E0FF" },
        { top: "65%", left: "2%", delay: 0.8, color: "#00FF88" },
        { top: "70%", left: "90%", delay: 1.2, color: "#00E0FF" },
        { top: "45%", left: "95%", delay: 0.2, color: "#00FF88" },
      ].map((spark, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute h-2 w-2 rounded-full"
          style={{ top: spark.top, left: spark.left, background: spark.color }}
          animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            ease: "easeInOut",
            delay: spark.delay,
          }}
        />
      ))}

      {/* Caption */}
      <motion.div
        className="relative z-10 text-center"
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        <p className="text-sm font-bold bg-gradient-to-r from-[#00FF88] to-[#00E0FF] bg-clip-text text-transparent">
          Your intern journey starts here! 😺
        </p>
        <p className="mt-1 text-xs text-white/40">Join thousands of students already on board</p>
      </motion.div>
    </motion.div>
  );
}
