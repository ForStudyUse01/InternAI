"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CameraOff,
  ChevronLeft,
  ChevronRight,
  Hand,
  Maximize,
  Minimize,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  StickyNote,
  User,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getAuthSession } from "@/lib/session";
import { getDashboardPathForRole } from "@/lib/auth-routes";
import {
  endInterviewSession,
  joinInterviewRoom,
  saveInterviewNotes,
  setInterviewOutcome,
  type InterviewChatMessage,
  type InterviewOutcome,
  type InterviewRoomPayload
} from "@/lib/interview-portal";
import { useInterviewSocket, type WebRtcSignal } from "@/lib/use-interview-socket";
import { useInterviewMesh, type ConnectionQuality, type MeshPeer } from "@/lib/use-webrtc";
import { applySinkId } from "@/lib/interview-audio-utils";
import { FEATURE_FLAGS } from "@/constants/featureFlags";
import { InterviewAudioControls } from "@/components/interview/interview-audio-controls";
import { InterviewLobby } from "@/components/interview/interview-lobby";
import { getInterviewJoinErrorMessage } from "@/lib/interview-join";

type InterviewRoomShellProps = {
  roomId: string;
};

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function InterviewRoomShell({ roomId }: InterviewRoomShellProps) {
  const router = useRouter();
  const { pushToast } = useToast();
  const session = getAuthSession();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const sendSignalRef = useRef<(targetSocketId: string, signal: WebRtcSignal) => void>(() => {});
  const handleRemoteSignalRef = useRef<(payload: { fromSocketId: string; fromUserId: string; signal: WebRtcSignal }) => void>(
    () => {}
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<InterviewRoomPayload | null>(null);
  const [chatMessages, setChatMessages] = useState<InterviewChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSyncState, setNotesSyncState] = useState<"idle" | "pending" | "synced" | "offline">("idle");
  const notesFocusedRef = useRef(false);
  const notesDebounceRef = useRef<number | null>(null);
  const [outcome, setOutcome] = useState<InterviewOutcome>(null);
  const [ending, setEnding] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePanel, setActivePanel] = useState<"chat" | "profile" | "notes" | "people">("chat");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenSupported] = useState(
    () => typeof document !== "undefined" && Boolean(document.documentElement.requestFullscreen)
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lobbyDone, setLobbyDone] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);

  const interviewSocket = useInterviewSocket({
    onJoined: ({ room, participants }) => {
      setPayload((prev) =>
        prev ? { ...prev, room: { ...prev.room, startedAt: room.startedAt || prev.room.startedAt, status: room.status } } : prev
      );
      webrtc.syncRoster(participants);
      setSocketReady(true);
    },
    onSignal: (signalPayload) => handleRemoteSignalRef.current(signalPayload),
    onChat: (message) => {
      setChatMessages((prev) => {
        if (prev.some((item) => item._id === message._id)) return prev;
        return [...prev, message];
      });
    },
    onParticipantUpdate: (update) => {
      if (!update.socketId) return;
      if (update.joined === true && update.role) {
        webrtc.addParticipant({ socketId: update.socketId, userId: update.userId || "", role: update.role, name: update.name || "Participant" });
        return;
      }
      if (update.joined === false) {
        webrtc.removeParticipant(update.socketId);
        return;
      }
      const patch: Partial<MeshPeer> = {};
      if (update.muted !== undefined) patch.muted = update.muted;
      if (update.cameraOff !== undefined) patch.cameraOff = update.cameraOff;
      if (update.screenSharing !== undefined) patch.screenSharing = update.screenSharing;
      if (Object.keys(patch).length) webrtc.patchPeer(update.socketId, patch);
    },
    onHandRaise: (payload) => {
      webrtc.patchPeer(payload.socketId, { handRaised: payload.raised });
    },
    onNotesSync: (syncPayload) => {
      // Another HR viewer saved notes. Skip while this user is actively
      // typing so their in-progress edit isn't clobbered mid-keystroke;
      // it will pick up the latest value next time they focus the field.
      if (notesFocusedRef.current) return;
      setNotes(syncPayload.notes);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(`interview-notes-draft-${roomId}`);
      }
    },
    onEnd: () => {
      setSessionEnded(true);
      pushToast({ title: "Interview ended", message: "The session has been closed.", variant: "success" });
    },
    onKicked: () => {
      pushToast({ title: "Disconnected", message: "This room was opened in another tab or window.", variant: "error" });
      router.push(session.role ? getDashboardPathForRole(session.role) : "/");
    },
    onReconnect: () => {
      pushToast({ title: "Reconnected", variant: "success" });
    }
  });

  const webrtc = useInterviewMesh({
    enabled: Boolean(payload) && !sessionEnded,
    onSignal: (targetSocketId, signal) => sendSignalRef.current(targetSocketId, signal)
  });

  useEffect(() => {
    sendSignalRef.current = (targetSocketId, signal) => interviewSocket.sendSignal(roomId, targetSocketId, signal);
    handleRemoteSignalRef.current = webrtc.handleRemoteSignal;
  }, [interviewSocket, roomId, webrtc.handleRemoteSignal]);

  const isHr = payload?.participantRole === "company";
  const candidate = payload?.application?.intern;
  const jobTitle = payload?.application?.internship?.role || "Interview";
  const companyName = payload?.application?.company?.companyName || "Company";

  useEffect(() => {
    if (!FEATURE_FLAGS.ENABLE_INTERVIEW_ROOMS) {
      setError("Interview rooms are disabled.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      try {
        setLoading(true);
        setError(null);
        const joinedRest = await joinInterviewRoom(roomId);
        if (cancelled) return;

        setPayload({
          room: joinedRest.room,
          application: joinedRest.application,
          participantRole: joinedRest.participantRole
        });
        setChatMessages(joinedRest.room.chatMessages || []);
        const serverNotes = joinedRest.room.hrNotes || "";
        const draft = typeof window !== "undefined" ? window.localStorage.getItem(`interview-notes-draft-${roomId}`) : null;
        setNotes(draft !== null && draft !== serverNotes ? draft : serverNotes);
        setOutcome(joinedRest.room.outcome || null);
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message || "Unable to load interview room.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [roomId, bootstrapAttempt]);

  useEffect(() => {
    if (!lobbyDone) return;
    let cancelled = false;

    async function connectSocket() {
      const joined = await interviewSocket.joinRoom(roomId);
      if (cancelled) return;
      if (!joined.ok) {
        setError(joined.message || "Unable to connect to interview room");
      }
    }

    void connectSocket();

    return () => {
      cancelled = true;
      interviewSocket.leaveRoom(roomId);
      setSocketReady(false);
    };
    // payload is intentionally excluded: onJoined's setPayload() must not
    // re-trigger this effect, or every join response would immediately
    // leave + rejoin the socket room in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyDone, roomId, interviewSocket]);

  useEffect(() => {
    if (!payload?.room.startedAt || sessionEnded) return undefined;
    const startedAt = new Date(payload.room.startedAt).getTime();
    const tick = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [payload?.room.startedAt, sessionEnded]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  async function handleToggleFullscreen() {
    if (!fullscreenSupported) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await rootRef.current?.requestFullscreen();
      }
    } catch {
      pushToast({ title: "Fullscreen unavailable", message: "Your browser blocked fullscreen mode.", variant: "error" });
    }
  }

  async function handleSendChat() {
    const body = chatInput.trim();
    if (!body) return;
    const result = await interviewSocket.sendChat(roomId, body);
    if (!result.ok) {
      pushToast({ title: "Message failed", message: result.messageText, variant: "error" });
      return;
    }
    if (result.message) {
      setChatMessages((prev) => {
        if (prev.some((item) => item._id === result.message!._id)) return prev;
        return [...prev, result.message!];
      });
    }
    setChatInput("");
  }

  async function handleSaveNotes() {
    if (!isHr) return;
    try {
      setNotesSaving(true);
      const result = await saveInterviewNotes(roomId, notes);
      setPayload((prev) => (prev ? { ...prev, room: result.room } : prev));
      if (typeof window !== "undefined") window.localStorage.removeItem(`interview-notes-draft-${roomId}`);
      setNotesSyncState("synced");
      pushToast({ title: "Notes saved", variant: "success" });
    } catch (err) {
      pushToast({ title: "Save failed", message: (err as Error).message, variant: "error" });
    } finally {
      setNotesSaving(false);
    }
  }

  function handleNotesChange(value: string) {
    if (!isHr) return;
    setNotes(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`interview-notes-draft-${roomId}`, value);
    }
    setNotesSyncState("pending");

    if (notesDebounceRef.current) window.clearTimeout(notesDebounceRef.current);
    notesDebounceRef.current = window.setTimeout(() => {
      void (async () => {
        if (!socketReady) {
          setNotesSyncState("offline");
          return;
        }
        const result = await interviewSocket.sendNotesUpdate(roomId, value);
        if (result.ok) {
          if (typeof window !== "undefined") window.localStorage.removeItem(`interview-notes-draft-${roomId}`);
          setNotesSyncState("synced");
        } else {
          setNotesSyncState("offline");
        }
      })();
    }, 800);
  }

  useEffect(() => {
    return () => {
      if (notesDebounceRef.current) window.clearTimeout(notesDebounceRef.current);
    };
  }, []);

  async function handleOutcome(next: "selected" | "rejected" | "on_hold") {
    if (!isHr) return;
    try {
      const result = await setInterviewOutcome(roomId, next);
      setOutcome(result.room.outcome || next);
      setPayload((prev) => (prev ? { ...prev, room: result.room } : prev));
      pushToast({ title: "Outcome updated", message: `Marked as ${next.replace(/_/g, " ")}`, variant: "success" });
    } catch (err) {
      pushToast({ title: "Update failed", message: (err as Error).message, variant: "error" });
    }
  }

  async function handleEndInterview() {
    if (!isHr || ending) return;
    try {
      setEnding(true);
      await endInterviewSession(roomId);
      setSessionEnded(true);
      pushToast({ title: "Interview ended", message: "Session saved successfully.", variant: "success" });
    } catch (err) {
      pushToast({ title: "End failed", message: (err as Error).message, variant: "error" });
    } finally {
      setEnding(false);
    }
  }

  function handleToggleMute() {
    if (!webrtc.micReady) return;
    const next = webrtc.toggleMute();
    if (socketReady) interviewSocket.updateParticipantStatus(roomId, { muted: next });
  }

  function handleToggleCamera() {
    const next = webrtc.toggleCamera();
    if (socketReady) interviewSocket.updateParticipantStatus(roomId, { cameraOff: next });
  }

  async function handleToggleScreenShare() {
    const sharing = await webrtc.toggleScreenShare();
    if (socketReady) interviewSocket.updateParticipantStatus(roomId, { screenSharing: sharing });
  }

  function handleToggleHandRaise() {
    const next = !handRaised;
    setHandRaised(next);
    if (socketReady) interviewSocket.sendHandRaise(roomId, next);
  }

  const headerSubtitle = useMemo(() => {
    if (!payload?.room.scheduledTime) return companyName;
    return `${companyName} · ${new Date(payload.room.scheduledTime).toLocaleString()}`;
  }, [companyName, payload?.room.scheduledTime]);

  const connectedPeerCount = webrtc.peers.filter((peer) => peer.connectionState === "connected").length;
  const totalParticipants = webrtc.peers.length + 1;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--ds-bg)] text-sm text-[var(--ds-text-secondary)]">
        Preparing interview room and requesting microphone access...
      </div>
    );
  }

  if (error || !payload) {
    const joinError = getInterviewJoinErrorMessage(error || "Interview room unavailable.");
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--ds-bg)] px-4 text-center">
        <div className="max-w-md rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)] px-6 py-5">
          <p className="text-base font-semibold text-[var(--ds-text)]">{joinError.title}</p>
          <p className="mt-2 text-sm text-[var(--ds-muted)]">{joinError.description}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {joinError.kind === "network" || joinError.kind === "unknown" ? (
              <Button type="button" variant="secondary" onClick={() => setBootstrapAttempt((value) => value + 1)}>
                Retry join
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push(session.role ? getDashboardPathForRole(session.role) : "/dashboard/intern/interviews")}
            >
              {session.role === "intern" ? "Back to interviews" : "Back to dashboard"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!lobbyDone) {
    return (
      <InterviewLobby
        title={jobTitle}
        subtitle={`${payload.room.roundType || "Interview"} · ${companyName}`}
        localVideoRef={webrtc.localVideoRef}
        muted={webrtc.muted}
        cameraOff={webrtc.cameraOff}
        mediaError={webrtc.mediaError}
        mediaMode={webrtc.mediaMode}
        micReady={webrtc.micReady}
        audioInputDevices={webrtc.audioInputDevices}
        videoInputDevices={webrtc.videoInputDevices}
        selectedAudioDeviceId={webrtc.selectedAudioDeviceId}
        selectedVideoDeviceId={webrtc.selectedVideoDeviceId}
        onToggleMute={handleToggleMute}
        onToggleCamera={handleToggleCamera}
        onSelectAudioDevice={(deviceId) => void webrtc.switchAudioInput(deviceId)}
        onSelectVideoDevice={(deviceId) => void webrtc.switchVideoInput(deviceId)}
        onRetryMedia={() => void webrtc.retryMediaAccess()}
        onJoin={() => setLobbyDone(true)}
      />
    );
  }

  return (
    <div ref={rootRef} className="flex min-h-screen flex-col bg-[var(--ds-bg)] text-[var(--ds-text)]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ds-border)] px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--ds-muted)]">{payload.room.roundType || "Interview"}</p>
          <h1 className="text-lg font-semibold text-[var(--ds-text)]">{jobTitle}</h1>
          <p className="text-xs text-[var(--ds-muted)]">{headerSubtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1 text-xs text-[var(--ds-muted)] sm:flex">
            <Users className="h-3.5 w-3.5" />
            {connectedPeerCount + 1}/{totalParticipants} connected
          </div>
          <div className="rounded-full border border-[var(--ds-border)] px-3 py-1 font-mono text-sm text-[var(--ds-success)]">
            {formatDuration(elapsedSeconds)}
          </div>
          {fullscreenSupported ? (
            <button
              type="button"
              className="rounded-full border border-[var(--ds-border)] p-2 text-[var(--ds-text-secondary)] hover:bg-[var(--ds-hover)]"
              onClick={() => void handleToggleFullscreen()}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
          ) : null}
          {isHr ? (
            <Button
              type="button"
              size="sm"
              className="bg-[var(--ds-danger)] text-[var(--ds-on-danger)] hover:brightness-110"
              disabled={sessionEnded || ending}
              onClick={handleEndInterview}
            >
              <PhoneOff className="mr-1.5 h-4 w-4" />
              End Interview
            </Button>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main id="main-content" tabIndex={-1} className="flex min-w-0 flex-1 flex-col focus:outline-none">
          <div className="relative flex-1 p-4">
            <div
              className="grid h-full min-h-[420px] gap-3"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}
            >
              {webrtc.peers.length === 0 ? (
                <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)]">
                  <p className="text-sm text-[var(--ds-muted)]">Waiting for other participants to join...</p>
                </div>
              ) : (
                webrtc.peers.map((peer) => (
                  <RemoteVideoTile key={peer.socketId} peer={peer} speakerDeviceId={webrtc.selectedSpeakerDeviceId} />
                ))
              )}
              <VideoTile
                label={webrtc.screenSharing ? "You · Presenting" : "You"}
                videoRef={webrtc.localVideoRef}
                showPlaceholder={webrtc.cameraOff && !webrtc.screenSharing}
                placeholder={
                  webrtc.mediaMode === "audio-only"
                    ? "Voice-only mode"
                    : webrtc.cameraOff
                      ? "Camera off"
                      : "Starting camera..."
                }
                participantMuted={webrtc.muted}
                handRaised={handRaised}
                muted
              />
            </div>
            <InterviewAudioControls
              muted={webrtc.muted}
              mediaError={webrtc.mediaError}
              mediaMode={webrtc.mediaMode}
              audioInputDevices={webrtc.audioInputDevices}
              videoInputDevices={webrtc.videoInputDevices}
              audioOutputDevices={webrtc.audioOutputDevices}
              selectedAudioDeviceId={webrtc.selectedAudioDeviceId}
              selectedVideoDeviceId={webrtc.selectedVideoDeviceId}
              selectedSpeakerDeviceId={webrtc.selectedSpeakerDeviceId}
              speakerSupported={webrtc.speakerSupported}
              micReady={webrtc.micReady}
              onRetryMedia={() => void webrtc.retryMediaAccess()}
              onSelectAudioDevice={(deviceId) => void webrtc.switchAudioInput(deviceId)}
              onSelectVideoDevice={(deviceId) => void webrtc.switchVideoInput(deviceId)}
              onSelectSpeakerDevice={(deviceId) => webrtc.switchSpeaker(deviceId)}
            />
            {webrtc.screenShareError ? (
              <p className="mt-2 text-center text-xs text-[var(--ds-warning)]">{webrtc.screenShareError}</p>
            ) : null}
            {sessionEnded ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)] px-6 py-4 text-center">
                  <p className="text-sm font-medium text-[var(--ds-text)]">Interview completed</p>
                  <p className="mt-1 text-xs text-[var(--ds-muted)]">You can return to your dashboard.</p>
                  <Button
                    type="button"
                    className="mt-4"
                    variant="secondary"
                    onClick={() => {
                      const role = session.role;
                      router.push(role ? getDashboardPathForRole(role) : "/");
                    }}
                  >
                    Go to dashboard
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-[var(--ds-border)] px-4 py-3">
            <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-3">
              <ControlButton
                active={webrtc.muted || !webrtc.micReady}
                label={webrtc.muted ? "Unmute" : "Mute"}
                icon={webrtc.muted || !webrtc.micReady ? MicOff : Mic}
                onClick={handleToggleMute}
                disabled={!webrtc.micReady || sessionEnded}
              />
              <ControlButton
                active={webrtc.cameraOff}
                label={webrtc.cameraOff ? "Start video" : "Stop video"}
                icon={webrtc.cameraOff ? CameraOff : Camera}
                onClick={handleToggleCamera}
                disabled={sessionEnded}
              />
              <ControlButton
                active={webrtc.screenSharing}
                label={webrtc.screenSharing ? "Stop sharing" : "Share screen"}
                icon={MonitorUp}
                onClick={() => void handleToggleScreenShare()}
                disabled={sessionEnded}
              />
              <ControlButton
                active={handRaised}
                label={handRaised ? "Lower hand" : "Raise hand"}
                icon={Hand}
                onClick={handleToggleHandRaise}
                disabled={sessionEnded}
              />
              <button
                type="button"
                className="rounded-xl border border-[var(--ds-border)] px-3 py-2 text-xs text-[var(--ds-text-secondary)] lg:hidden"
                onClick={() => setSidebarOpen((value) => !value)}
              >
                {sidebarOpen ? "Hide panel" : "Show panel"}
              </button>
            </div>
          </div>

          {isHr ? (
            <div className="border-t border-[var(--ds-border)] px-4 py-3">
              <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[var(--ds-muted)]">Candidate decision</p>
              <div className="flex flex-wrap gap-2">
                <OutcomeButton active={outcome === "selected"} label="Selected" tone="success" onClick={() => handleOutcome("selected")} />
                <OutcomeButton active={outcome === "on_hold"} label="On Hold" tone="warning" onClick={() => handleOutcome("on_hold")} />
                <OutcomeButton active={outcome === "rejected"} label="Rejected" tone="danger" onClick={() => handleOutcome("rejected")} />
              </div>
            </div>
          ) : null}
        </main>

        <aside className={`border-l border-[var(--ds-border)] bg-[var(--ds-surface)] transition-all duration-200 ${sidebarOpen ? "w-full max-w-[85vw] sm:max-w-sm" : "w-12"}`}>
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-[var(--ds-border)] px-2 py-2">
              {sidebarOpen ? (
                <div className="flex gap-1">
                  <PanelTab active={activePanel === "chat"} icon={MessageSquare} label="Chat" onClick={() => setActivePanel("chat")} />
                  <PanelTab active={activePanel === "people"} icon={Users} label="People" onClick={() => setActivePanel("people")} />
                  <PanelTab active={activePanel === "profile"} icon={User} label="Profile" onClick={() => setActivePanel("profile")} />
                  {isHr ? (
                    <PanelTab active={activePanel === "notes"} icon={StickyNote} label="Notes" onClick={() => setActivePanel("notes")} />
                  ) : null}
                </div>
              ) : null}
              <button
                type="button"
                className="rounded-lg p-2 text-[var(--ds-muted)] hover:bg-[var(--ds-hover)]"
                onClick={() => setSidebarOpen((value) => !value)}
                aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              >
                {sidebarOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            </div>

            {sidebarOpen ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {activePanel === "chat" ? (
                  <>
                    <div className="flex-1 space-y-2 overflow-y-auto p-3">
                      {chatMessages.length === 0 ? (
                        <p className="text-xs text-[var(--ds-muted)]">No messages yet. Say hello to start the conversation.</p>
                      ) : (
                        chatMessages.map((message) => (
                          <div
                            key={message._id}
                            className={`rounded-xl px-3 py-2 text-sm ${
                              message.senderRole === payload.participantRole
                                ? "ml-8 bg-[var(--ds-primary)]/20 text-[var(--ds-text)]"
                                : "mr-8 bg-[var(--ds-surface-raised)] text-[var(--ds-text)]"
                            }`}
                          >
                            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--ds-muted)]">
                              {message.senderName || message.senderRole}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap">{message.body}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="border-t border-[var(--ds-border)] p-3">
                      <div className="flex gap-2">
                        <input
                          value={chatInput}
                          onChange={(event) => setChatInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") void handleSendChat();
                          }}
                          placeholder="Type a message"
                          className="flex-1 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-input)] px-3 py-2 text-sm text-[var(--ds-text)] outline-none focus:border-[var(--ds-primary)]"
                          disabled={sessionEnded}
                        />
                        <Button type="button" size="sm" onClick={() => void handleSendChat()} disabled={sessionEnded}>
                          Send
                        </Button>
                      </div>
                    </div>
                  </>
                ) : null}

                {activePanel === "people" ? (
                  <div className="space-y-2 overflow-y-auto p-3">
                    <ParticipantRow
                      name="You"
                      role={payload.participantRole}
                      muted={webrtc.muted || !webrtc.micReady}
                      cameraOff={webrtc.cameraOff}
                      handRaised={handRaised}
                      quality="good"
                      isSelf
                    />
                    {webrtc.peers.map((peer) => (
                      <ParticipantRow
                        key={peer.socketId}
                        name={peer.name}
                        role={peer.role}
                        muted={peer.muted}
                        cameraOff={peer.cameraOff}
                        handRaised={peer.handRaised}
                        quality={peer.quality}
                      />
                    ))}
                  </div>
                ) : null}

                {activePanel === "profile" ? (
                  <div className="space-y-3 overflow-y-auto p-4 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--ds-muted)]">Candidate</p>
                      <p className="mt-1 text-base font-semibold text-[var(--ds-text)]">{candidate?.fullName || "Candidate"}</p>
                      <p className="text-xs text-[var(--ds-muted)]">{candidate?.email}</p>
                    </div>
                    {candidate?.summary ? (
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-[var(--ds-muted)]">Summary</p>
                        <p className="mt-1 text-[var(--ds-text-secondary)]">{candidate.summary}</p>
                      </div>
                    ) : null}
                    {candidate?.skills?.length ? (
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-[var(--ds-muted)]">Skills</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {candidate.skills.slice(0, 12).map((skill) => (
                            <span key={skill} className="rounded-full bg-[var(--ds-surface-raised)] px-2 py-0.5 text-xs text-[var(--ds-text-secondary)]">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {candidate?.education?.length ? (
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-[var(--ds-muted)]">Education</p>
                        <ul className="mt-1 space-y-1 text-[var(--ds-text-secondary)]">
                          {candidate.education.slice(0, 4).map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {activePanel === "notes" && isHr ? (
                  <div className="flex min-h-0 flex-1 flex-col p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--ds-muted)]">Private HR notes</p>
                      <span
                        className={`text-[10px] uppercase tracking-[0.1em] ${
                          notesSyncState === "synced"
                            ? "text-[var(--ds-success)]"
                            : notesSyncState === "pending"
                              ? "text-[var(--ds-warning)]"
                              : notesSyncState === "offline"
                                ? "text-[var(--ds-danger)]"
                                : "text-[var(--ds-muted)]"
                        }`}
                      >
                        {notesSyncState === "synced"
                          ? "Synced"
                          : notesSyncState === "pending"
                            ? "Saving..."
                            : notesSyncState === "offline"
                              ? "Saved locally, will retry"
                              : ""}
                      </span>
                    </div>
                    <textarea
                      value={notes}
                      onChange={(event) => handleNotesChange(event.target.value)}
                      onFocus={() => {
                        notesFocusedRef.current = true;
                      }}
                      onBlur={() => {
                        notesFocusedRef.current = false;
                      }}
                      placeholder="Capture observations, strengths, and concerns... Synced live with other interviewers."
                      className="min-h-[220px] flex-1 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-input)] px-3 py-2 text-sm text-[var(--ds-text)] outline-none focus:border-[var(--ds-primary)]"
                      disabled={sessionEnded}
                    />
                    <Button
                      type="button"
                      className="mt-3"
                      variant="secondary"
                      disabled={notesSaving || sessionEnded}
                      onClick={() => void handleSaveNotes()}
                    >
                      {notesSaving ? "Saving..." : "Save now"}
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

const QUALITY_COLORS: Record<ConnectionQuality, string> = {
  good: "bg-[var(--ds-success)]",
  fair: "bg-[var(--ds-warning)]",
  poor: "bg-[var(--ds-danger)]",
  unknown: "bg-[var(--ds-muted)]"
};

const QUALITY_LABELS: Record<ConnectionQuality, string> = {
  good: "Good connection",
  fair: "Fair connection",
  poor: "Poor connection",
  unknown: "Connecting..."
};

function QualityDot({ quality }: { quality: ConnectionQuality }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${QUALITY_COLORS[quality]}`}
      title={QUALITY_LABELS[quality]}
      aria-label={QUALITY_LABELS[quality]}
    />
  );
}

function RemoteVideoTile({ peer, speakerDeviceId }: { peer: MeshPeer; speakerDeviceId?: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = peer.stream;
    if (audioRef.current) {
      audioRef.current.srcObject = peer.stream;
      void audioRef.current.play().catch(() => undefined);
    }
  }, [peer.stream]);

  useEffect(() => {
    if (speakerDeviceId) void applySinkId(audioRef.current, speakerDeviceId);
  }, [speakerDeviceId, peer.stream]);

  const connecting = peer.connectionState !== "connected";
  const showPlaceholder = connecting || (peer.cameraOff && !peer.screenSharing);

  return (
    <div className="relative min-h-[240px] overflow-hidden rounded-2xl border border-[var(--ds-primary)]/40 bg-black">
      <video ref={videoRef} autoPlay playsInline muted className="h-full min-h-[240px] w-full object-cover" />
      <audio ref={audioRef} autoPlay playsInline className="hidden" aria-hidden="true" />
      {showPlaceholder ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <p className="px-4 text-center text-sm text-white/70">
            {connecting
              ? peer.connectionState === "connecting" || peer.connectionState === "new"
                ? "Connecting..."
                : "Reconnecting..."
              : peer.screenSharing
                ? "Presenting"
                : "Camera off"}
          </p>
        </div>
      ) : null}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-lg bg-black/70 px-2 py-1 text-xs text-white">
          <QualityDot quality={peer.quality} />
          {peer.name}
          {peer.screenSharing ? " · Presenting" : ""}
        </div>
        {peer.muted ? (
          <div className="rounded-lg bg-[var(--ds-danger-bg)] px-2 py-1 text-[10px] text-[var(--ds-danger)]">
            <MicOff className="inline h-3 w-3" />
          </div>
        ) : null}
        {peer.handRaised ? (
          <div className="rounded-lg bg-[var(--ds-warning-bg)] px-2 py-1 text-[10px] text-[var(--ds-warning)]">
            <Hand className="inline h-3 w-3" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function VideoTile({
  label,
  videoRef,
  placeholder,
  showPlaceholder,
  muted,
  participantMuted,
  handRaised
}: {
  label: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  placeholder: string;
  showPlaceholder?: boolean;
  muted?: boolean;
  participantMuted?: boolean;
  handRaised?: boolean;
}) {
  return (
    <div className="relative min-h-[240px] overflow-hidden rounded-2xl border border-[var(--ds-border)] bg-black">
      <video ref={videoRef} autoPlay playsInline muted={muted} className="h-full min-h-[240px] w-full object-cover" />
      {showPlaceholder ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <p className="px-4 text-center text-sm text-white/70">{placeholder}</p>
        </div>
      ) : null}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <div className="rounded-lg bg-black/70 px-2 py-1 text-xs text-white">{label}</div>
        {participantMuted ? (
          <div className="rounded-lg bg-[var(--ds-danger-bg)] px-2 py-1 text-[10px] text-[var(--ds-danger)]">
            <MicOff className="inline h-3 w-3" />
          </div>
        ) : null}
        {handRaised ? (
          <div className="rounded-lg bg-[var(--ds-warning-bg)] px-2 py-1 text-[10px] text-[var(--ds-warning)]">
            <Hand className="inline h-3 w-3" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ParticipantRow({
  name,
  role,
  muted,
  cameraOff,
  handRaised,
  quality,
  isSelf
}: {
  name: string;
  role: "intern" | "company";
  muted: boolean;
  cameraOff: boolean;
  handRaised: boolean;
  quality: ConnectionQuality;
  isSelf?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-raised)] px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <QualityDot quality={quality} />
        <div>
          <p className="text-[var(--ds-text)]">
            {name}
            {isSelf ? " (You)" : ""}
          </p>
          <p className="text-[10px] uppercase tracking-[0.1em] text-[var(--ds-muted)]">{role === "intern" ? "Candidate" : "Interviewer"}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[var(--ds-muted)]">
        {handRaised ? <Hand className="h-3.5 w-3.5 text-[var(--ds-warning)]" /> : null}
        {muted ? <MicOff className="h-3.5 w-3.5 text-[var(--ds-danger)]" /> : <Mic className="h-3.5 w-3.5" />}
        {cameraOff ? <CameraOff className="h-3.5 w-3.5 text-[var(--ds-danger)]" /> : <Camera className="h-3.5 w-3.5" />}
      </div>
    </div>
  );
}

function ControlButton({
  label,
  icon: Icon,
  active,
  disabled,
  onClick
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1 rounded-2xl px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50 ${
        active ? "bg-[var(--ds-danger)] text-[var(--ds-on-danger)]" : "bg-[var(--ds-surface-raised)] text-[var(--ds-text-secondary)] hover:bg-[var(--ds-hover)]"
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}

function PanelTab({
  label,
  icon: Icon,
  active,
  onClick
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs ${
        active ? "bg-[var(--ds-primary)]/20 text-[var(--ds-accent)]" : "text-[var(--ds-muted)] hover:bg-[var(--ds-hover)]"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function OutcomeButton({
  label,
  tone,
  active,
  onClick
}: {
  label: string;
  tone: "success" | "warning" | "danger";
  active?: boolean;
  onClick: () => void;
}) {
  const tones = {
    success: active ? "bg-[var(--ds-success)] text-[var(--ds-on-success)]" : "border-[var(--ds-success)] text-[var(--ds-success)]",
    warning: active ? "bg-[var(--ds-warning)] text-[var(--ds-on-warning)]" : "border-[var(--ds-warning)] text-[var(--ds-warning)]",
    danger: active ? "bg-[var(--ds-danger)] text-[var(--ds-on-danger)]" : "border-[var(--ds-danger)] text-[var(--ds-danger)]"
  };

  return (
    <button type="button" onClick={onClick} className={`rounded-full border px-3 py-1.5 text-xs ${tones[tone]}`}>
      {label}
    </button>
  );
}
