import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

// Business cat GIF - cat in suit with briefcase
const BUSINESS_CAT_GIF = "https://media.tenor.com/uPL3_r7gkg4AAAAM/funny-cat.gif";

export function BusinessCat() {
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
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle at 50% 60%, rgba(0,224,255,0.12) 0%, transparent 70%)",
        }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
      />

      {/* Floating office icons */}
      {["💼", "📊", "📈", "🤝"].map((icon, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute text-base select-none"
          style={{
            left: `${i < 2 ? -5 : 90}%`,
            top: `${10 + i * 22}%`,
          }}
          animate={{
            y: [0, -20, 0],
            x: [0, i % 2 === 0 ? 6 : -6, 0],
            opacity: [0.2, 0.9, 0.2],
          }}
          transition={{
            repeat: Infinity,
            duration: 2.2 + i * 0.4,
            ease: "easeInOut",
            delay: i * 0.5,
          }}
        >
          {icon}
        </motion.span>
      ))}

      {/* The business cat */}
      <motion.div
        className="relative z-10"
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
      >
        {/* Neon cyan glow border */}
        <motion.div
          className="absolute -inset-3 rounded-3xl pointer-events-none"
          animate={{
            boxShadow: [
              "0 0 20px rgba(0,224,255,0.3), 0 0 40px rgba(0,224,255,0.1)",
              "0 0 30px rgba(0,255,136,0.35), 0 0 60px rgba(0,255,136,0.12)",
              "0 0 20px rgba(0,224,255,0.3), 0 0 40px rgba(0,224,255,0.1)",
            ],
          }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
        />

        {/* Cat GIF — mix-blend-mode: screen removes white/light background on dark pages */}
        <img
          src={BUSINESS_CAT_GIF}
          alt="Business cat with suitcase"
          className="relative z-10 w-40 h-40 rounded-2xl object-contain"
          style={{ mixBlendMode: "screen" }}
        />

        {/* Shimmer floor under cat */}
        <motion.div
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-2 w-36 rounded-full blur-sm"
          animate={{
            background: [
              "rgba(0,224,255,0.5)",
              "rgba(0,255,136,0.5)",
              "rgba(0,224,255,0.5)",
            ],
            width: ["130px", "150px", "130px"],
          }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Sparkle particles */}
      {[
        { top: "8%",  left: "4%",  delay: 0,   color: "#00E0FF" },
        { top: "20%", left: "90%", delay: 0.4, color: "#00FF88" },
        { top: "55%", left: "2%",  delay: 0.8, color: "#00E0FF" },
        { top: "65%", left: "92%", delay: 1.2, color: "#00FF88" },
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
        <p className="text-sm font-bold bg-gradient-to-r from-[#00E0FF] to-[#00FF88] bg-clip-text text-transparent">
          Ready to hire the best talents! 😼
        </p>
        <p className="mt-1 text-xs text-white/40">Streamline your recruitment today</p>
      </motion.div>
    </motion.div>
  );
}
