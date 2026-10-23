"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const LazyCustomCursor = dynamic(() => import("@/components/CustomCursor").then((mod) => mod.CustomCursor), {
  ssr: false
});

export function CursorMount() {
  const pathname = usePathname();
  if (pathname !== "/") return null;
  return <LazyCustomCursor />;
}
