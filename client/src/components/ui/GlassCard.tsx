import { forwardRef, type HTMLAttributes } from "react";

type GlassCardProps = HTMLAttributes<HTMLDivElement>;

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(function GlassCard(
  { className = "", children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`rounded-[24px] border border-white/10 bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
});
