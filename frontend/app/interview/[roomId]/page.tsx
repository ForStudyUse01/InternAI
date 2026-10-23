"use client";

import { use } from "react";
import { InterviewRoomGuard } from "@/components/interview/interview-room-guard";
import { InterviewRoomShell } from "@/components/interview/interview-room-shell";

type InterviewRoomPageProps = {
  params: Promise<{ roomId: string }>;
};

export default function InterviewRoomPage({ params }: InterviewRoomPageProps) {
  const { roomId } = use(params);

  return (
    <InterviewRoomGuard>
      <InterviewRoomShell roomId={roomId} />
    </InterviewRoomGuard>
  );
}
