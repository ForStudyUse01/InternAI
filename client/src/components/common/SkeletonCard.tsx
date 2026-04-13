import { SkeletonBlock } from "./SkeletonBlock";

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4" aria-busy aria-label="Loading">
      <SkeletonBlock className="h-5 w-1/3" />
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBlock key={index} className="h-4 w-full" />
      ))}
    </div>
  );
}
