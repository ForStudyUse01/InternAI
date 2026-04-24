/**
 * Lightweight full-viewport background: CSS gradient + blurred blobs (no canvas/WebGL).
 */
export function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#000000]" />
      <div className="absolute inset-[-20%] bg-gradient-to-br from-[#00FF88]/15 via-[#00E0FF]/10 to-[#000000] opacity-90 animate-gradient-sweep will-change-transform" />
      <div className="absolute -left-24 top-1/4 h-[min(28rem,55vw)] w-[min(28rem,55vw)] rounded-full bg-[#00FF88]/10 blur-[100px] animate-blob-a will-change-transform" />
      <div className="absolute bottom-0 right-[-10%] h-[min(24rem,50vw)] w-[min(24rem,50vw)] rounded-full bg-[#00E0FF]/10 blur-[100px] animate-blob-b will-change-transform" />
    </div>
  );
}
