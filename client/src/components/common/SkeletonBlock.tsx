export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-700/80 ${className}`} aria-hidden />;
}
