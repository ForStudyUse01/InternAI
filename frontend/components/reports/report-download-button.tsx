"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/icons/app-icon";
import { useToast } from "@/components/ui/toast";
import { downloadEnterpriseReport, ReportDownloadKey } from "@/lib/reports-portal";

type ReportDownloadButtonProps = {
  reportKey: ReportDownloadKey;
  label?: string;
  applicationId?: string;
  companyId?: string;
  internshipId?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
};

export function ReportDownloadButton({
  reportKey,
  label = "Download PDF Report",
  applicationId,
  companyId,
  internshipId,
  variant = "secondary",
  size = "sm",
  disabled = false
}: ReportDownloadButtonProps) {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    try {
      setLoading(true);
      const result = await downloadEnterpriseReport(reportKey, { applicationId, companyId, internshipId });
      pushToast({
        title: "Report generated",
        message: `${result.reportNumber} downloaded successfully.`,
        variant: "success"
      });
    } catch (error) {
      pushToast({
        title: "Report failed",
        message: (error as Error).message || "Unable to generate report.",
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant={variant} size={size} className="gap-2" onClick={handleDownload} disabled={loading || disabled}>
      <AppIcon icon={Download} size="xs" className="text-current" />
      {loading ? "Generating..." : label}
    </Button>
  );
}
