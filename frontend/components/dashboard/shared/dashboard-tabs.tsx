"use client";

import { useId, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import { useTablistKeyboard } from "@/lib/use-tablist-keyboard";
import { cn } from "@/lib/utils";

export type DashboardTabItem = {
  key: string;
  label: string;
  icon?: LucideIcon;
  content: React.ReactNode;
};

type DashboardTabsProps = {
  tabs: DashboardTabItem[];
  defaultKey?: string;
};

export function DashboardTabs({ tabs, defaultKey }: DashboardTabsProps) {
  const [activeKey, setActiveKey] = useState(defaultKey ?? tabs[0]?.key);
  const activeTab = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];
  const tablistRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  useTablistKeyboard(tablistRef);

  const tabId = (key: string) => `${baseId}-tab-${key}`;
  const panelId = (key: string) => `${baseId}-panel-${key}`;

  return (
    <div className="space-y-4">
      <div
        ref={tablistRef}
        role="tablist"
        aria-label="Dashboard sections"
        className="flex flex-wrap gap-1.5 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-raised)] p-1.5"
      >
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab?.key;
          return (
            <button
              key={tab.key}
              id={tabId(tab.key)}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={activeTab ? panelId(activeTab.key) : undefined}
              onClick={() => setActiveKey(tab.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]",
                isActive
                  ? "bg-[var(--ds-surface)] text-[var(--ds-text)] shadow-sm"
                  : "text-[var(--ds-muted)] hover:text-[var(--ds-text)]"
              )}
            >
              {tab.icon ? <AppIcon icon={tab.icon} size="sm" /> : null}
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={activeTab ? panelId(activeTab.key) : undefined}
        aria-labelledby={activeTab ? tabId(activeTab.key) : undefined}
        tabIndex={0}
        className="space-y-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]"
      >
        {activeTab?.content}
      </div>
    </div>
  );
}
