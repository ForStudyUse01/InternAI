"use client";

import Image from "next/image";
import Link from "next/link";
import { BRAND_LOGO_PATH, BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

type InternAILogoProps = {
  href?: string | null;
  showWordmark?: boolean;
  className?: string;
  interactive?: boolean;
};

export function InternAILogo({
  href = "/",
  showWordmark = true,
  className,
  interactive = true
}: InternAILogoProps) {
  const content = (
    <span
      className={cn(
        "inline-flex items-center gap-2.5",
        interactive && "transition duration-200 hover:scale-[1.02]",
        className
      )}
    >
      <Image
        src={BRAND_LOGO_PATH}
        alt={`${BRAND_NAME} logo`}
        width={34}
        height={34}
        priority
        className="shrink-0 object-contain"
      />
      {showWordmark && (
        <span className="text-lg font-extrabold tracking-tight text-ink dark:text-slate-100">{BRAND_NAME}</span>
      )}
    </span>
  );

  if (href === null) return content;
  return (
    <Link href={href || "/"} className="inline-flex items-center" aria-label={`${BRAND_NAME} home`}>
      {content}
    </Link>
  );
}
