"use client";

import Image from "next/image";
import Link from "next/link";
import { BrandTagline } from "@/components/brand/brand-tagline";
import { BRAND_LOGO_FULL_PATH, BRAND_NAME } from "@/lib/brand";

export function AuthBrandHeader() {
  return (
    <div className="mb-6 flex flex-col items-center gap-3">
      <Link href="/" aria-label={`${BRAND_NAME} home`} className="inline-flex items-center justify-center">
        <Image src={BRAND_LOGO_FULL_PATH} alt={`${BRAND_NAME} logo`} width={186} height={57} priority className="h-14 w-auto object-contain" />
      </Link>
      <BrandTagline />
    </div>
  );
}
