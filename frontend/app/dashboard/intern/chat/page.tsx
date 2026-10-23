"use client";

import { Suspense } from "react";
import { MessagePage } from "@/components/dashboard/chat/message-page";
import { SkeletonChat } from "@/components/ui/skeleton";

export default function InternChatPage() {
  return (
    <Suspense fallback={<div className="surface-muted p-4"><SkeletonChat rows={6} /></div>}>
      <MessagePage role="intern" />
    </Suspense>
  );
}
