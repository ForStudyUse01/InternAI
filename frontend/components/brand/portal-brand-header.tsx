import Image from "next/image";
import { BRAND_LOGO_PATH, BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

type PortalBrandHeaderProps = {
  portalLabel: string;
  /** Icon-only rail mode: drops the label/name text, keeps the logo centered. */
  collapsed?: boolean;
};

export function PortalBrandHeader({ portalLabel, collapsed = false }: PortalBrandHeaderProps) {
  return (
    <div className={cn("ds-card mb-6 p-4", collapsed && "px-2")}>
      <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
        {/* Explicit h-9 w-9 (36px) keeps both axes CSS-governed to match the width/height
            props — without it, Tailwind's preflight `img { height: auto }` only overrides
            height, leaving width attribute-governed, which Next.js flags as a size mismatch. */}
        <Image
          src={BRAND_LOGO_PATH}
          alt={collapsed ? `${BRAND_NAME} — ${portalLabel}` : ""}
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-lg object-contain"
          aria-hidden={collapsed ? undefined : true}
        />
        {!collapsed ? (
          <div className="min-w-0">
            <p className="ds-label">{portalLabel}</p>
            <h2 className="ds-h2 mt-1 truncate">{BRAND_NAME}</h2>
          </div>
        ) : null}
      </div>
    </div>
  );
}
