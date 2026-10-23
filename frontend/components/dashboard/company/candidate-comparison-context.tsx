"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export const MAX_COMPARE_CANDIDATES = 4;

type CandidateCompareContextValue = {
  selectedIds: string[];
  isSelected: (applicationId: string) => boolean;
  toggle: (applicationId: string) => void;
  remove: (applicationId: string) => void;
  clear: () => void;
  canSelectMore: boolean;
  workspaceOpen: boolean;
  openWorkspace: () => void;
  closeWorkspace: () => void;
};

const CandidateCompareContext = createContext<CandidateCompareContextValue | null>(null);

export function CandidateCompareProvider({ children }: { children: React.ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  const toggle = useCallback((applicationId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(applicationId)) return prev.filter((id) => id !== applicationId);
      if (prev.length >= MAX_COMPARE_CANDIDATES) return prev;
      return [...prev, applicationId];
    });
  }, []);

  const remove = useCallback((applicationId: string) => {
    setSelectedIds((prev) => prev.filter((id) => id !== applicationId));
  }, []);

  const clear = useCallback(() => {
    setSelectedIds([]);
    setWorkspaceOpen(false);
  }, []);

  const value = useMemo<CandidateCompareContextValue>(
    () => ({
      selectedIds,
      isSelected: (applicationId: string) => selectedIds.includes(applicationId),
      toggle,
      remove,
      clear,
      canSelectMore: selectedIds.length < MAX_COMPARE_CANDIDATES,
      workspaceOpen,
      openWorkspace: () => setWorkspaceOpen(true),
      closeWorkspace: () => setWorkspaceOpen(false)
    }),
    [selectedIds, toggle, remove, clear, workspaceOpen]
  );

  return <CandidateCompareContext.Provider value={value}>{children}</CandidateCompareContext.Provider>;
}

export function useCandidateCompare() {
  const ctx = useContext(CandidateCompareContext);
  if (!ctx) throw new Error("useCandidateCompare must be used within a CandidateCompareProvider");
  return ctx;
}
