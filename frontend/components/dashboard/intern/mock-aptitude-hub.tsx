"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Maximize2, Shield } from "lucide-react";
import { AptitudeExamInsights } from "@/components/dashboard/intern/aptitude-exam-insights";
import { AptitudeExamView, type ExamStateSnapshot } from "@/components/dashboard/intern/aptitude-exam-view";
import { AptitudeResultView } from "@/components/dashboard/intern/aptitude-result-view";
import { AptitudeTestNav, AptitudeTestNavDropdown } from "@/components/dashboard/intern/aptitude-test-nav";
import { AptitudeProgressCharts } from "@/components/dashboard/intern/aptitude-progress-charts";
import { AppIcon } from "@/components/icons/app-icon";
import {
  exitElementFullscreen,
  isFullscreenActive,
  onFullscreenChange,
  requestElementFullscreen
} from "@/lib/aptitude-fullscreen";
import { computeCheatingReport } from "@/lib/aptitude-proctor";
import { getTestMeta } from "@/lib/data/aptitude-test-meta";
import {
  buildProgressData,
  canStartAttempt,
  clearExamSession,
  clearPendingAutoSubmit,
  createExamSession,
  getAptitudeHistory,
  getAttemptCount,
  loadExamSession,
  loadPendingAutoSubmit,
  saveAptitudeResult,
  saveExamSession,
  savePendingAutoSubmit,
  type AptitudeExamSession,
  type PendingAutoSubmit
} from "@/lib/aptitude-progress";
import { loadTestSetQuestions } from "@/lib/aptitude-test-loader";
import { recordAptitudeLearning } from "@/lib/ai-platform/learning-memory";
import {
  submitTest,
  type AptitudeSectionKey,
  type AptitudeTestResult
} from "@/lib/aptitude-test-engine";
import type { AptitudeTestSet } from "@/lib/data/aptitude-tests";
import { cn } from "@/lib/utils";

type View = "idle" | "entering_fullscreen" | "exam" | "result";

function IdlePanel() {
  return (
    <div className="flex h-[min(680px,calc(100dvh-14rem))] min-h-[480px] items-center justify-center rounded-xl border border-dashed border-[var(--ds-border)] bg-[var(--ds-surface)] px-6">
      <div className="max-w-sm text-center">
        <p className="text-base font-semibold text-[var(--ds-text)]">Select a test set to begin</p>
        <p className="mt-2 text-sm text-[var(--ds-muted)]">
          Fullscreen is required. Exiting fullscreen auto-submits and uses your attempt.
        </p>
      </div>
    </div>
  );
}

function markFullscreenExit(session: AptitudeExamSession): AptitudeExamSession {
  const exitAt = new Date().toISOString();
  return {
    ...session,
    testActive: false,
    isFullscreenLocked: false,
    proctorLog: {
      ...session.proctorLog,
      fullscreenExit: true,
      fullscreenExitAt: exitAt
    }
  };
}

export function MockAptitudeHub() {
  const [view, setView] = useState<View>("idle");
  const [selectedTestSet, setSelectedTestSet] = useState<number | null>(null);
  const [activeTest, setActiveTest] = useState<AptitudeTestSet | null>(null);
  const [result, setResult] = useState<AptitudeTestResult | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [examSnapshot, setExamSnapshot] = useState<ExamStateSnapshot | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);
  const [fullscreenActive, setFullscreenActive] = useState(false);

  const fullscreenRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef(view);
  const activeTestRef = useRef(activeTest);
  const submittingRef = useRef(false);
  const sessionRef = useRef<AptitudeExamSession | null>(null);
  const examStartedRef = useRef(false);
  const intentionalFullscreenExitRef = useRef(false);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    activeTestRef.current = activeTest;
  }, [activeTest]);

  const refreshHistory = useCallback(() => {
    setHistoryVersion((v) => v + 1);
  }, []);

  const finalizeResult = useCallback(
    (
      test: AptitudeTestSet,
      answers: Record<string, number | null>,
      timeSpentSeconds: number,
      sectionTimeSpent: Record<AptitudeSectionKey, number>,
      session: AptitudeExamSession | PendingAutoSubmit,
      options?: { autoSubmitted?: boolean; fullscreenExit?: boolean }
    ) => {
      if (submittingRef.current) return null;
      submittingRef.current = true;

      const fullscreenExit = options?.fullscreenExit ?? session.proctorLog.fullscreenExit ?? false;
      const cheatingReport = computeCheatingReport(session.proctorLog, { fullscreenExit });
      const evaluated = submitTest(test, answers, timeSpentSeconds, sectionTimeSpent);
      evaluated.attemptNumber = session.attemptNumber;
      evaluated.cheatingReport = cheatingReport;
      evaluated.autoSubmitted = options?.autoSubmitted ?? false;

      recordAptitudeLearning(evaluated, evaluated.prioritizedConcepts);
      saveAptitudeResult(evaluated, {
        attemptNumber: session.attemptNumber,
        cheatingReport,
        autoSubmitted: options?.autoSubmitted,
        dedupeKey: `${session.testId}:${session.startTime}:${session.attemptNumber}`
      });

      intentionalFullscreenExitRef.current = true;
      void exitElementFullscreen();

      examStartedRef.current = false;
      sessionRef.current = null;
      setActiveTest(null);
      setExamSnapshot(null);
      setFullscreenActive(false);
      setResult(evaluated);
      setView("result");
      refreshHistory();
      submittingRef.current = false;
      return evaluated;
    },
    [refreshHistory]
  );

  const submitFromStoredSession = useCallback(
    async (
      session: AptitudeExamSession | PendingAutoSubmit,
      options?: { autoSubmitted?: boolean; fullscreenExit?: boolean }
    ) => {
      const test = await loadTestSetQuestions(session.testId);
      if (!test) return;
      const shouldMarkFullscreenExit = options?.fullscreenExit ?? ("trigger" in session && session.trigger === "fullscreen_exit");
      const payload = shouldMarkFullscreenExit ? markFullscreenExit(session) : session;
      const timeSpent = Math.max(1, test.durationMinutes * 60 - payload.remainingSeconds);
      finalizeResult(
        test,
        payload.answers,
        timeSpent,
        payload.sectionTimeSpentSeconds,
        payload,
        {
          autoSubmitted: options?.autoSubmitted ?? true,
          fullscreenExit: shouldMarkFullscreenExit
        }
      );
    },
    [finalizeResult]
  );

  const handleFullscreenExitSubmit = useCallback(async () => {
    if (submittingRef.current || intentionalFullscreenExitRef.current) return;
    if (viewRef.current !== "exam" || !examStartedRef.current) return;

    const session = sessionRef.current ?? loadExamSession();
    if (!session?.testActive) return;

    const marked = markFullscreenExit(session);
    sessionRef.current = marked;
    saveExamSession(marked);

    const test = activeTestRef.current ?? (await loadTestSetQuestions(marked.testId));
    if (!test) return;

    const timeSpent = Math.max(1, test.durationMinutes * 60 - marked.remainingSeconds);
    finalizeResult(test, marked.answers, timeSpent, marked.sectionTimeSpentSeconds, marked, {
      autoSubmitted: true,
      fullscreenExit: true
    });
  }, [finalizeResult]);

  const autoSubmitActiveExam = useCallback((trigger: PendingAutoSubmit["trigger"]) => {
    if (viewRef.current !== "exam" || submittingRef.current || !examStartedRef.current) return;
    const session = sessionRef.current ?? loadExamSession();
    if (!session?.testActive) return;

    if (trigger === "fullscreen_exit") {
      void handleFullscreenExitSubmit();
      return;
    }

    savePendingAutoSubmit(session, trigger);
  }, [handleFullscreenExitSubmit]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const pending = loadPendingAutoSubmit();
      const activeSession = loadExamSession();

      if (pending || activeSession?.testActive) {
        const payload = pending ?? {
          ...activeSession!,
          trigger: "refresh" as const,
          savedAt: new Date().toISOString()
        };

        clearPendingAutoSubmit();
        clearExamSession();

        if (!cancelled) {
          setSelectedTestSet(payload.testId);
          setBlockMessage("Previous exam session was recovered and auto-submitted.");
          await submitFromStoredSession(payload, {
            autoSubmitted: true,
            fullscreenExit: payload.trigger === "fullscreen_exit"
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [submitFromStoredSession]);

  useEffect(() => {
    return onFullscreenChange(() => {
      const active = isFullscreenActive();
      setFullscreenActive(active);

      if (!active && viewRef.current === "exam" && examStartedRef.current && !intentionalFullscreenExitRef.current) {
        void handleFullscreenExitSubmit();
      }
    });
  }, [handleFullscreenExitSubmit]);

  useEffect(() => {
    if (view !== "entering_fullscreen" || !selectedTestSet) return;

    let cancelled = false;

    (async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const element = fullscreenRef.current;
      if (!element || cancelled) return;

      const granted = await requestElementFullscreen(element);
      if (cancelled) return;

      if (!granted) {
        setView("idle");
        setSelectedTestSet(null);
        setBlockMessage("Fullscreen required to begin the exam");
        return;
      }

      const meta = getTestMeta(selectedTestSet);
      if (!meta) {
        setView("idle");
        return;
      }

      const test = await loadTestSetQuestions(selectedTestSet);
      if (!test || cancelled) {
        setView("idle");
        setBlockMessage("Unable to load exam. Fullscreen required to begin the exam");
        await exitElementFullscreen();
        return;
      }

      clearExamSession();
      const session = createExamSession(selectedTestSet, meta, getAttemptCount(selectedTestSet) + 1);
      saveExamSession(session);
      sessionRef.current = session;
      examStartedRef.current = true;
      intentionalFullscreenExitRef.current = false;

      setActiveTest(test);
      setFullscreenActive(true);
      setView("exam");
    })();

    return () => {
      cancelled = true;
    };
  }, [view, selectedTestSet]);

  useEffect(() => {
    if (view !== "exam") return;

    history.pushState({ aptitudeExam: true }, "", window.location.href);
    const onPopState = () => {
      history.pushState({ aptitudeExam: true }, "", window.location.href);
      void handleFullscreenExitSubmit();
    };

    const onBeforeUnload = () => autoSubmitActiveExam("unload");
    const onPageHide = () => autoSubmitActiveExam("unload");

    window.addEventListener("popstate", onPopState);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
      if (viewRef.current === "exam" && examStartedRef.current) {
        void handleFullscreenExitSubmit();
      }
    };
  }, [view, autoSubmitActiveExam, handleFullscreenExitSubmit]);

  const progressData = useMemo(() => {
    void historyVersion;
    return buildProgressData(getAptitudeHistory());
  }, [historyVersion, result]);

  const startTest = useCallback(
    (testId: number) => {
      if (!canStartAttempt(testId)) {
        const meta = getTestMeta(testId);
        setBlockMessage(`All 3 attempts used for ${meta?.title ?? `Set ${testId}`}.`);
        return;
      }

      if (loadExamSession()?.testActive) {
        setBlockMessage("An exam is already in progress. Resume it or wait for auto-submit before starting a new attempt.");
        return;
      }

      setBlockMessage(null);
      setResult(null);
      setExamSnapshot(null);
      setSelectedTestSet(testId);
      setView("entering_fullscreen");
    },
    []
  );

  const handleSubmit = (
    answers: Record<string, number | null>,
    timeSpentSeconds: number,
    sectionTimeSpent: Record<AptitudeSectionKey, number>,
    options?: { autoSubmitted?: boolean; fullscreenExit?: boolean }
  ) => {
    if (!activeTest) return;
    const session = sessionRef.current ?? loadExamSession();
    if (!session) return;
    intentionalFullscreenExitRef.current = true;
    finalizeResult(activeTest, answers, timeSpentSeconds, sectionTimeSpent, session, options);
  };

  const navProps = {
    activeTestId: view === "exam" || view === "result" ? selectedTestSet : null,
    inExam: view === "exam" || view === "entering_fullscreen",
    onStart: startTest,
    canStart: canStartAttempt
  };

  const showDashboard = view === "idle" || view === "result";

  return (
    <>
      {showDashboard ? (
        <div className="space-y-6">
          <div className="flex items-start gap-2 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-2 text-xs text-[var(--ds-text-secondary)]">
            <AppIcon icon={Shield} size="xs" className="mt-0.5 shrink-0" />
            <span>
              Fullscreen locked exam: you must enter fullscreen to start. Pressing Esc or leaving fullscreen
              auto-submits and consumes your attempt.
            </span>
          </div>

          {blockMessage ? (
            <p role="alert" className="rounded-lg border border-[var(--ds-warning)]/40 bg-[var(--ds-warning-bg)] px-3 py-2 text-sm text-[var(--ds-warning)]">
              {blockMessage}
            </p>
          ) : null}

          <AptitudeTestNavDropdown {...navProps} />

          <div
            className={cn(
              "grid min-h-[520px] grid-cols-1 gap-4",
              "lg:grid-cols-[220px_minmax(0,1fr)_180px] lg:gap-5"
            )}
          >
            <aside className="hidden lg:block">
              <div className="sticky top-4 max-h-[calc(100dvh-10rem)] overflow-y-auto pr-1">
                <AptitudeTestNav {...navProps} />
              </div>
            </aside>

            <main className="min-w-0">
              {view === "result" && result ? (
                <AptitudeResultView
                  result={result}
                  onBack={() => {
                    setView("idle");
                    setResult(null);
                    setSelectedTestSet(null);
                  }}
                  onRetake={() => {
                    if (selectedTestSet && canStartAttempt(selectedTestSet)) startTest(selectedTestSet);
                    else if (selectedTestSet) {
                      setBlockMessage("All 3 attempts used for this set.");
                    }
                  }}
                  canRetake={selectedTestSet ? canStartAttempt(selectedTestSet) : false}
                />
              ) : (
                <IdlePanel />
              )}
            </main>

            <aside className="hidden rounded-xl border border-dashed border-[var(--ds-border)] px-3 py-6 text-center text-xs text-[var(--ds-muted)] lg:block">
              Insights appear during an active test
            </aside>
          </div>

          {view === "idle" && progressData.length > 0 ? (
            <div>
              <h4 className="mb-3 text-sm font-semibold text-[var(--ds-text)]">Your Progress</h4>
              <AptitudeProgressCharts data={progressData} />
            </div>
          ) : null}
        </div>
      ) : null}

      {(view === "entering_fullscreen" || view === "exam") && (
        <div
          ref={fullscreenRef}
          className="fixed inset-0 z-[200] flex flex-col bg-[var(--ds-bg)]"
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen aptitude exam"
        >
          {view === "entering_fullscreen" ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
              <AppIcon icon={Maximize2} size="lg" className="text-[var(--ds-primary-text)]" />
              <p className="text-lg font-semibold text-[var(--ds-text)]">Entering fullscreen exam mode</p>
              <p className="max-w-md text-sm text-[var(--ds-muted)]">
                Allow fullscreen in your browser to begin. Questions load only after fullscreen is active.
              </p>
              <AppIcon icon={Loader2} size="md" className="animate-spin text-[var(--ds-muted)]" />
            </div>
          ) : activeTest ? (
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              <div className="min-h-0 flex-1">
                <AptitudeExamView
                  key={`exam-${activeTest.id}-${sessionRef.current?.startTime ?? "new"}`}
                  test={activeTest}
                  initialSession={loadExamSession()}
                  fullscreenMode
                  examEnabled={fullscreenActive}
                  onSubmit={handleSubmit}
                  onStateChange={setExamSnapshot}
                  onSessionPersist={(session) => {
                    sessionRef.current = session;
                  }}
                />
              </div>
              <aside className="shrink-0 border-t border-[var(--ds-border)] p-3 lg:w-52 lg:border-l lg:border-t-0">
                <AptitudeExamInsights
                  test={activeTest}
                  answers={examSnapshot?.answers ?? {}}
                  sectionSpent={
                    examSnapshot?.sectionSpent ?? {
                      quantitative: 0,
                      logical: 0,
                      verbal: 0,
                      dataInterpretation: 0
                    }
                  }
                  currentSection={examSnapshot?.currentSection ?? "quantitative"}
                  remainingSeconds={examSnapshot?.remainingSeconds ?? activeTest.durationMinutes * 60}
                  collapsed={!insightsOpen}
                  onToggle={() => setInsightsOpen((v) => !v)}
                />
              </aside>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
