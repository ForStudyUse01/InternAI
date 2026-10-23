"use client";

import { SectionPanel } from "@/components/dashboard/shared/section-panel";
import { CertificationsModule } from "@/components/dashboard/intern/certifications-module";

export default function LearningCertificationsPage() {
  return (
    <SectionPanel
      title="Certifications"
      subtitle="Upload course completion proof. Only admin-approved certifications become Verified."
    >
      <CertificationsModule />
    </SectionPanel>
  );
}
