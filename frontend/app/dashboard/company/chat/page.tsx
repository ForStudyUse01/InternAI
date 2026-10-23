"use client";

import { Suspense, useEffect, useState } from "react";
import { MessagePage } from "@/components/dashboard/chat/message-page";
import { AccessDenied } from "@/components/dashboard/shared/access-denied";
import { SkeletonChat } from "@/components/ui/skeleton";
import {
  fetchCompanyProfile,
  peekCompanyProfile,
  hasSidebarModule,
  SIDEBAR_MODULE_KEYS,
  type CompanyCurrentUser
} from "@/lib/company-portal";

export default function CompanyChatPage() {
  const [currentUser, setCurrentUser] = useState<CompanyCurrentUser | null>(() => peekCompanyProfile()?.currentUser || null);

  useEffect(() => {
    let cancelled = false;
    fetchCompanyProfile()
      .then((companyContext) => {
        if (!cancelled) setCurrentUser(companyContext.currentUser);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (currentUser && !hasSidebarModule(currentUser, SIDEBAR_MODULE_KEYS.MESSAGES)) {
    return <AccessDenied hint="Your Company Admin hasn't enabled Messages for your account. Ask them to update your permissions." />;
  }

  return (
    <Suspense fallback={<div className="surface-muted p-4"><SkeletonChat rows={6} /></div>}>
      <MessagePage role="company" />
    </Suspense>
  );
}
