type PlatformLayoutProps = {
  children: React.ReactNode;
};

/** Lightweight static shell for dashboard/auth — no animated starfield. */
export function PlatformLayout({ children }: PlatformLayoutProps) {
  return (
    <div className="internai-platform min-h-screen bg-[var(--ds-bg)] transition-colors duration-300">
      <div className="internai-platform-content">{children}</div>
    </div>
  );
}
