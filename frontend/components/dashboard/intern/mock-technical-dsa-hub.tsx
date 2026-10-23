"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Search } from "lucide-react";
import { AppIcon } from "@/components/icons/app-icon";
import { EmptyState as SharedEmptyState } from "@/components/dashboard/shared/empty-state";
import { SkeletonList } from "@/components/ui/skeleton";
import {
  DSA_CATEGORIES,
  QUESTIONS_PER_CATEGORY,
  type DsaCategoryKey,
  type DsaDifficulty,
  type DsaQuestion
} from "@/lib/data/dsa-interview-meta";
import { loadDsaQuestionBank } from "@/lib/dsa-question-loader";
import { getAdaptiveTechnicalFocus } from "@/lib/ai-platform/learning-memory";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;
const ROW_HEIGHT_REM = 3.75;
const LIST_MIN_HEIGHT = `${PAGE_SIZE * ROW_HEIGHT_REM}rem`;

const DIFFICULTY_STYLES: Record<DsaDifficulty, string> = {
  Easy: "text-[var(--ds-success)] bg-[var(--ds-success-bg)]",
  Medium: "text-[var(--ds-warning)] bg-[var(--ds-warning-bg)]",
  Hard: "text-[var(--ds-danger)] bg-[var(--ds-danger-bg)]"
};

function isValidQuestion(value: unknown): value is DsaQuestion {
  if (!value || typeof value !== "object") return false;
  const item = value as DsaQuestion;
  return (
    typeof item.title === "string" &&
    item.title.trim().length > 0 &&
    (item.difficulty === "Easy" || item.difficulty === "Medium" || item.difficulty === "Hard")
  );
}

function isValidLeetCodeUrl(url: string | undefined): url is string {
  if (!url || typeof url !== "string") return false;
  return /^https:\/\/leetcode\.com\/problems\/[a-z0-9-]+\/?$/i.test(url.trim());
}

function getCategoryQuestions(
  bank: Record<DsaCategoryKey, DsaQuestion[]> | null,
  category: DsaCategoryKey
): DsaQuestion[] {
  if (!bank) return [];
  const raw = bank[category];
  if (!Array.isArray(raw)) return [];
  return raw.filter(isValidQuestion);
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[12rem] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--ds-border)] bg-[var(--ds-surface)] px-6 py-12 text-center">
      <p className="text-sm font-medium text-[var(--ds-text-secondary)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--ds-muted)]">{message}</p>
    </div>
  );
}

function QuestionCard({ question }: { question: DsaQuestion }) {
  const hasLink = isValidLeetCodeUrl(question.url);

  return (
    <article className="flex items-center gap-4 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-card)] px-4 py-3 transition-shadow hover:shadow-sm">
      <h4 className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--ds-text)]">
        {question.title}
      </h4>
      <span
        className={cn(
          "shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
          DIFFICULTY_STYLES[question.difficulty]
        )}
      >
        {question.difficulty}
      </span>
      {hasLink ? (
        <a
          href={question.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-card)] px-2.5 text-xs font-medium text-[var(--ds-text-secondary)] transition hover:border-[var(--ds-border-strong)] hover:text-[var(--ds-text)]"
        >
          Solve on LeetCode
          <AppIcon icon={ExternalLink} size="xs" />
        </a>
      ) : null}
    </article>
  );
}

function CategoryNav({
  activeCategory,
  onSelect
}: {
  activeCategory: DsaCategoryKey;
  onSelect: (key: DsaCategoryKey) => void;
}) {
  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0" aria-label="DSA categories">
      {DSA_CATEGORIES.map((category) => {
        const active = activeCategory === category.key;
        return (
          <button
            key={category.key}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => onSelect(category.key)}
            className={cn(
              "shrink-0 rounded-lg border-l-2 py-2.5 pl-3 pr-3 text-left text-sm font-medium transition-colors lg:w-full",
              active
                ? "border-[var(--ds-primary-text)] bg-[var(--ds-surface-hover)] text-[var(--ds-text)] dark:border-[var(--ds-primary)]"
                : "border-transparent text-[var(--ds-muted)] hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text)]"
            )}
          >
            {category.label}
          </button>
        );
      })}
    </nav>
  );
}

function SummaryBar({
  categoryLabel,
  total,
  easy,
  medium,
  hard,
  progress,
  search,
  onSearchChange
}: {
  categoryLabel: string;
  total: number;
  easy: number;
  medium: number;
  hard: number;
  progress: number;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <header className="shrink-0 space-y-4 border-b border-[var(--ds-border)] pb-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h3 className="text-lg font-semibold tracking-tight text-[var(--ds-text)]">{categoryLabel}</h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ds-muted)]">
            <span className="font-medium text-[var(--ds-text-secondary)]">{total} questions</span>
            <span className="hidden text-[var(--ds-muted)] sm:inline">·</span>
            <span>
              {easy}E · {medium}M · {hard}H
            </span>
          </div>
        </div>
        <div className="relative w-full sm:max-w-[220px]">
          <AppIcon
            icon={Search}
            size="xs"
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ds-muted)]"
          />
          <input
            type="search"
            placeholder="Search in topic..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="ds-input h-8 w-full pl-8 text-sm"
            aria-label="Search questions in category"
          />
        </div>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-[var(--ds-border)]">
        <div
          className="h-full rounded-full bg-[var(--ds-primary-text)] transition-[width] duration-300 ease-out dark:bg-[var(--ds-primary)]"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Browse progress in category"
        />
      </div>
    </header>
  );
}

function PaginationBar({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPrevious,
  onNext
}: {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const rangeStart = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalItems);

  return (
    <footer className="mt-6 flex shrink-0 items-center justify-between gap-4 border-t border-[var(--ds-border)] pt-4">
      <p className="text-xs text-[var(--ds-muted)]">
        {rangeStart}–{rangeEnd} of {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-sm font-medium text-[var(--ds-text-secondary)] transition hover:bg-[var(--ds-surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <AppIcon icon={ChevronLeft} size="xs" />
          Previous
        </button>
        <span className="min-w-[3.5rem] text-center text-xs tabular-nums text-[var(--ds-muted)]">
          {currentPage}/{totalPages}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-sm font-medium text-[var(--ds-text-secondary)] transition hover:bg-[var(--ds-surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <AppIcon icon={ChevronRight} size="xs" />
        </button>
      </div>
    </footer>
  );
}

export function MockTechnicalDsaHub() {
  const [selectedCategory, setSelectedCategory] = useState<DsaCategoryKey>("arrays");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [questionBank, setQuestionBank] = useState<Record<DsaCategoryKey, DsaQuestion[]> | null>(null);
  const [getDifficultyCounts, setGetDifficultyCounts] = useState<
    ((category: DsaCategoryKey) => Record<string, number>) | null
  >(null);
  const [bankLoading, setBankLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadDsaQuestionBank()
      .then((bank) => {
        if (!active) return;
        setQuestionBank(bank.dsaQuestions);
        setGetDifficultyCounts(() => bank.getCategoryDifficultyCounts);
      })
      .finally(() => {
        if (active) setBankLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const activeMeta = DSA_CATEGORIES.find((c) => c.key === selectedCategory) ?? DSA_CATEGORIES[0];
  const categoryQuestions = useMemo(
    () => getCategoryQuestions(questionBank, selectedCategory),
    [questionBank, selectedCategory]
  );
  const difficultyCounts = useMemo(() => {
    if (!getDifficultyCounts) return { Easy: 0, Medium: 0, Hard: 0 };
    return getDifficultyCounts(selectedCategory);
  }, [getDifficultyCounts, selectedCategory]);

  const filteredQuestions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return categoryQuestions;
    return categoryQuestions.filter(
      (q) =>
        q.title.toLowerCase().includes(query) ||
        q.difficulty.toLowerCase().includes(query) ||
        (q.tag || "").toLowerCase().includes(query)
    );
  }, [categoryQuestions, search]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedQuestions = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredQuestions.slice(start, start + PAGE_SIZE);
  }, [filteredQuestions, safePage]);

  const browseProgress =
    filteredQuestions.length === 0
      ? 0
      : Math.round((Math.min(safePage * PAGE_SIZE, filteredQuestions.length) / filteredQuestions.length) * 100);

  const handleCategorySelect = useCallback((key: DsaCategoryKey) => {
    setSearch("");
    setCurrentPage(1);
    setSelectedCategory(key);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  }, []);

  const handlePrevious = useCallback(() => {
    setCurrentPage((page) => Math.max(1, page - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  }, [totalPages]);

  const isCategoryEmpty = !bankLoading && categoryQuestions.length === 0;
  const isSearchEmpty = !isCategoryEmpty && filteredQuestions.length === 0;
  const summaryTotal = search.trim() ? filteredQuestions.length : categoryQuestions.length || QUESTIONS_PER_CATEGORY;
  const adaptiveFocus = getAdaptiveTechnicalFocus();

  return (
    <div className="space-y-4">
      {adaptiveFocus ? (
        <p className="rounded-lg border border-[var(--ds-info)] bg-[var(--ds-info-bg)] px-3 py-2 text-xs text-[var(--ds-info)]">
          AI learning focus: {adaptiveFocus.reason}
        </p>
      ) : null}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-8">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-2 hidden text-[11px] font-semibold uppercase tracking-wider text-[var(--ds-muted)] lg:block">
          Topics
        </p>
        <CategoryNav activeCategory={selectedCategory} onSelect={handleCategorySelect} />
      </aside>

      <section className="flex min-w-0 flex-col">
        <SummaryBar
          categoryLabel={activeMeta.label}
          total={summaryTotal}
          easy={difficultyCounts.Easy}
          medium={difficultyCounts.Medium}
          hard={difficultyCounts.Hard}
          progress={browseProgress}
          search={search}
          onSearchChange={handleSearchChange}
        />

        <div key={selectedCategory} className="mt-4 flex flex-1 flex-col">
          {bankLoading ? (
            <div style={{ minHeight: LIST_MIN_HEIGHT }} aria-busy="true" aria-live="polite">
              <SkeletonList rows={6} />
            </div>
          ) : isCategoryEmpty ? (
            <EmptyState
              title="No questions available"
              message="This category has no questions loaded yet. Please try another topic."
            />
          ) : isSearchEmpty ? (
            <SharedEmptyState
              presetKey="search"
              title="No Matches Found"
              description="Try a different search term within this topic."
              ctaLabel="Clear Search"
              onCtaClick={() => handleSearchChange("")}
              size="sm"
            />
          ) : (
            <>
              <div
                className="flex flex-col gap-2"
                style={{ minHeight: LIST_MIN_HEIGHT }}
                aria-live="polite"
                aria-busy={false}
              >
                {paginatedQuestions.map((question, index) => (
                  <QuestionCard
                    key={`${selectedCategory}-${safePage}-${index}-${question.url}`}
                    question={question}
                  />
                ))}
              </div>

              <PaginationBar
                currentPage={safePage}
                totalPages={totalPages}
                pageSize={PAGE_SIZE}
                totalItems={filteredQuestions.length}
                onPrevious={handlePrevious}
                onNext={handleNext}
              />
            </>
          )}
        </div>
      </section>
    </div>
    </div>
  );
}
