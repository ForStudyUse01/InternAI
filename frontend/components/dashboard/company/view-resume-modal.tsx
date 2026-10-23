"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Download, ExternalLink, FileText, X } from "lucide-react";
import { fetchCompanyApplicationResume } from "@/lib/company-portal";
import { Skeleton } from "@/components/ui/skeleton";
import { AppIcon } from "@/components/icons/app-icon";

type ViewResumeModalProps = {
  open: boolean;
  applicationId: string | null;
  candidateName?: string;
  role?: string;
  onClose: () => void;
};

export function ViewResumeModal({ open, applicationId, candidateName, role, onClose }: ViewResumeModalProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [objectUrl, setObjectUrl] = useState("");
  const [contentType, setContentType] = useState("");
  const objectUrlRef = useRef("");

  useEffect(() => {
    if (!open || !applicationId) return;

    let cancelled = false;
    setStatus("loading");
    setErrorMessage("");

    fetchCompanyApplicationResume(applicationId)
      .then(({ blob, contentType: type }) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setObjectUrl(url);
        setContentType(type);
        setStatus("ready");
      })
      .catch((e) => {
        if (cancelled) return;
        setErrorMessage((e as Error).message || "Resume not available.");
        setStatus("error");
      });

    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = "";
      }
      setObjectUrl("");
    };
  }, [open, applicationId]);

  const isPdf = contentType.includes("pdf");

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
            onClick={onClose}
            aria-label="Close resume dialog"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="view-resume-title"
            className="ds-card relative z-10 flex h-[92vh] w-full max-w-3xl flex-col overflow-hidden !p-0 shadow-2xl sm:h-[85vh] rounded-t-2xl sm:rounded-2xl"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--ds-border)] bg-gradient-to-r from-white/[0.03] via-transparent to-transparent px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="ds-stat-icon shrink-0">
                  <AppIcon icon={FileText} size="md" />
                </span>
                <div className="min-w-0">
                  <h2 id="view-resume-title" className="ds-h3">
                    Resume
                  </h2>
                  <p className="ds-caption mt-0.5 truncate">
                    {candidateName ? candidateName : "Candidate"}
                    {role ? ` · ${role}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {status === "ready" && objectUrl ? (
                  <>
                    <a
                      href={objectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ds-icon-btn"
                      aria-label="Open resume in new tab"
                      title="Open in new tab"
                    >
                      <AppIcon icon={ExternalLink} size="sm" />
                    </a>
                    <a
                      href={objectUrl}
                      download="resume"
                      className="ds-icon-btn"
                      aria-label="Download resume"
                      title="Download"
                    >
                      <AppIcon icon={Download} size="sm" />
                    </a>
                  </>
                ) : null}
                <button type="button" onClick={onClose} className="ds-icon-btn" aria-label="Close">
                  <AppIcon icon={X} size="sm" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 bg-[var(--ds-deep)]">
              {status === "loading" ? (
                <div role="status" aria-live="polite" className="flex h-full items-center justify-center p-8">
                  <span className="sr-only">Loading resume…</span>
                  <div className="w-full max-w-md space-y-3">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                    <Skeleton className="mt-6 h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                </div>
              ) : null}

              {status === "error" ? (
                <div role="alert" className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--ds-warning)]/25 bg-[var(--ds-warning)]/10">
                    <AppIcon icon={AlertTriangle} size="md" className="text-[var(--ds-warning)]" />
                  </span>
                  <p className="ds-h3">Resume unavailable</p>
                  <p className="ds-caption max-w-sm">{errorMessage}</p>
                </div>
              ) : null}

              {status === "ready" && objectUrl ? (
                isPdf ? (
                  <iframe src={objectUrl} title="Resume preview" className="h-full w-full border-0" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                    <span className="ds-stat-icon">
                      <AppIcon icon={FileText} size="md" />
                    </span>
                    <p className="ds-h3">
                      Preview isn&apos;t available for this file type.
                    </p>
                    <a
                      href={objectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--ds-gradient-from)] to-[var(--ds-gradient-to)] px-3.5 py-2 text-sm font-medium text-[var(--ds-on-primary)] transition"
                    >
                      <AppIcon icon={ExternalLink} size="sm" />
                      Open in new tab
                    </a>
                  </div>
                )
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
