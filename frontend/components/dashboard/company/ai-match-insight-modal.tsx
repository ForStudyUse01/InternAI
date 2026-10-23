"use client";

import { Brain } from "lucide-react";
import type { CandidateEvaluation, MatchExplanation } from "@/lib/ai-hiring";
import { Modal } from "@/components/ui/modal";
import { AiMatchInsightPanel } from "./ai-match-insight-panel";

type AiMatchInsightModalProps = {
  open: boolean;
  candidateName?: string;
  role?: string;
  explanation: MatchExplanation;
  evaluation?: CandidateEvaluation;
  onClose: () => void;
};

export function AiMatchInsightModal({ open, candidateName, role, explanation, evaluation, onClose }: AiMatchInsightModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="AI Insight"
      subtitle={`${candidateName || "Candidate"}${role ? ` · ${role}` : ""}`}
      icon={Brain}
      size="md"
    >
      <AiMatchInsightPanel explanation={explanation} evaluation={evaluation} />
    </Modal>
  );
}
