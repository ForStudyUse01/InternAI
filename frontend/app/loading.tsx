import { InternAILoader } from "@/components/brand/internai-loader";

export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <InternAILoader message="Preparing your opportunities..." />
    </div>
  );
}
