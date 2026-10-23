"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Check, Moon, Sun } from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import { useTheme } from "@/components/theme/theme-provider";
import type { Appearance, ThemePalette } from "@/lib/theme/theme-config";
import { cn } from "@/lib/utils";

type ThemeCardProps = {
  palette: ThemePalette;
  selected: boolean;
  onSelect: (id: ThemePalette["id"]) => void;
};

const ThemeCard = memo(function ThemeCard({ palette, selected, onSelect }: ThemeCardProps) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(palette.id)}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      aria-pressed={selected}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border p-3 text-left transition-colors duration-200",
        selected
          ? "border-[var(--ds-primary)] shadow-[0_0_0_2px_var(--ds-focus-ring)]"
          : "border-[var(--ds-border)] hover:border-[var(--ds-border-strong)]"
      )}
      style={{ background: "var(--ds-surface)" }}
    >
      {/* Mini dashboard mockup rendered in the CARD'S OWN palette, independent of the app's currently active theme */}
      <div
        aria-hidden
        className="relative flex h-24 w-full overflow-hidden rounded-lg border"
        style={{ borderColor: `${palette.text}1a`, background: palette.neutral }}
      >
        {/* mini sidebar */}
        <div className="flex w-6 flex-col items-center gap-1.5 py-2" style={{ background: palette.surface }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: palette.primary }} />
          <span className="h-1 w-3 rounded-full opacity-60" style={{ background: palette.text }} />
          <span className="h-1 w-3 rounded-full opacity-40" style={{ background: palette.text }} />
          <span className="h-1 w-3 rounded-full opacity-40" style={{ background: palette.text }} />
        </div>

        <div className="flex flex-1 flex-col">
          {/* mini navbar */}
          <div
            className="flex h-4 items-center justify-between px-1.5"
            style={{ background: palette.surface, borderBottom: `1px solid ${palette.text}14` }}
          >
            <span className="h-1 w-6 rounded-full opacity-70" style={{ background: palette.text }} />
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: palette.accent }} />
          </div>

          {/* mini card + button + tiny bar chart */}
          <div className="flex flex-1 gap-1.5 p-1.5">
            <div className="flex flex-1 flex-col justify-between rounded-md p-1.5" style={{ background: palette.surface }}>
              <span className="h-1 w-8 rounded-full opacity-60" style={{ background: palette.text }} />
              <div className="flex items-end gap-0.5">
                {[0.4, 0.7, 0.5, 0.9, 0.6].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-sm"
                    style={{ height: `${h * 14}px`, background: i % 2 === 0 ? palette.primary : palette.accent }}
                  />
                ))}
              </div>
              <span
                className="mt-1 inline-flex w-fit rounded px-1.5 py-0.5 text-[6px] font-semibold"
                style={{ background: palette.primary, color: palette.neutral }}
              >
                Button
              </span>
            </div>
          </div>
        </div>

        {selected ? (
          <motion.div
            layoutId="theme-card-selected-check"
            className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full ring-1 ring-black/10"
            style={{ background: palette.primary }}
          >
            <AppIcon
              icon={Check}
              size="xs"
              style={{ color: palette.neutral }}
              className="drop-shadow-[0_0_1.5px_rgba(0,0,0,0.7)]"
            />
          </motion.div>
        ) : null}
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <span aria-hidden className="text-sm leading-none">
          {palette.emoji}
        </span>
        <span className="truncate text-xs font-semibold text-[var(--ds-text)]">{palette.label}</span>
      </div>
    </motion.button>
  );
});

function AppearanceToggle({ appearance, onChange }: { appearance: Appearance; onChange: (mode: Appearance) => void }) {
  const options: { id: Appearance; label: string; icon: typeof Sun }[] = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon }
  ];

  return (
    <div className="inline-flex rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-1">
      {options.map((option) => {
        const active = appearance === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={active}
            className={cn(
              "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200",
              active ? "text-[var(--ds-on-primary)]" : "text-[var(--ds-muted)] hover:text-[var(--ds-text)]"
            )}
          >
            {active ? (
              <motion.span
                layoutId="appearance-toggle-pill"
                className="absolute inset-0 rounded-lg"
                style={{ background: "var(--ds-primary)" }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              />
            ) : null}
            <span className="relative flex items-center gap-1.5">
              <AppIcon icon={option.icon} size="xs" />
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ThemeSettingsPanel() {
  const { theme, appearance, setTheme, setAppearance, themes } = useTheme();

  return (
    <div className="ds-card rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="ds-h3 text-[var(--ds-text)]">Theme</h2>
          <p className="mt-1 text-sm text-[var(--ds-muted)]">
            Pick a color theme and an appearance mode. Changes apply instantly across the whole platform.
          </p>
        </div>
        <AppearanceToggle appearance={appearance} onChange={setAppearance} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {themes.map((palette) => (
          <ThemeCard key={palette.id} palette={palette} selected={palette.id === theme} onSelect={setTheme} />
        ))}
      </div>
    </div>
  );
}
