"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RosterMember, WebRtcSignal } from "@/lib/use-interview-socket";
import {
  acquireInterviewMedia,
  acquireScreenShareStream,
  isSpeakerSelectionSupported,
  listAudioInputDevices,
  listAudioOutputDevices,
  listVideoInputDevices,
  parseMediaError,
  stopMediaStream,
  type AudioInputDevice,
  type MediaAccessMode
} from "@/lib/interview-audio-utils";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" }
];

const QUALITY_POLL_MS = 3000;

export type ConnectionQuality = "unknown" | "good" | "fair" | "poor";

export type MeshPeer = {
  socketId: string;
  userId: string;
  role: "intern" | "company";
  name: string;
  stream: MediaStream | null;
  connectionState: RTCPeerConnectionState;
  muted: boolean;
  cameraOff: boolean;
  screenSharing: boolean;
  handRaised: boolean;
  quality: ConnectionQuality;
};

type PeerRuntime = {
  pc: RTCPeerConnection;
  isInitiator: boolean;
  makingOffer: boolean;
  iceQueue: RTCIceCandidateInit[];
  qualityTimer: number | null;
  lastStats: { bytesReceived: number; timestamp: number } | null;
};

type UseInterviewMeshOptions = {
  enabled: boolean;
  onSignal: (targetSocketId: string, signal: WebRtcSignal) => void;
  preferredAudioDeviceId?: string;
  preferredVideoDeviceId?: string;
};

export function useInterviewMesh({ enabled, onSignal, preferredAudioDeviceId, preferredVideoDeviceId }: UseInterviewMeshOptions) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerRuntimesRef = useRef<Map<string, PeerRuntime>>(new Map());
  const onSignalRef = useRef(onSignal);
  const selectedAudioDeviceIdRef = useRef("");
  const selectedVideoDeviceIdRef = useRef("");
  const mutedRef = useRef(false);
  const cameraOffRef = useRef(false);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    onSignalRef.current = onSignal;
  }, [onSignal]);

  const [peers, setPeers] = useState<MeshPeer[]>([]);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaMode, setMediaMode] = useState<MediaAccessMode>("none");
  const [micReady, setMicReady] = useState(false);
  const [audioInputDevices, setAudioInputDevices] = useState<AudioInputDevice[]>([]);
  const [videoInputDevices, setVideoInputDevices] = useState<AudioInputDevice[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<AudioInputDevice[]>([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState("");
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState("");
  const [selectedSpeakerDeviceId, setSelectedSpeakerDeviceId] = useState("");
  const speakerSupported = isSpeakerSelectionSupported();
  const [screenSharing, setScreenSharing] = useState(false);
  const [screenShareError, setScreenShareError] = useState<string | null>(null);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  useEffect(() => {
    cameraOffRef.current = cameraOff;
  }, [cameraOff]);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const attachLocalStream = useCallback((stream: MediaStream) => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  }, []);

  const patchPeer = useCallback((socketId: string, patch: Partial<MeshPeer>) => {
    setPeers((prev) => prev.map((peer) => (peer.socketId === socketId ? { ...peer, ...patch } : peer)));
  }, []);

  const refreshDevices = useCallback(async () => {
    const [audioDevices, videoDevices, outputDevices] = await Promise.all([
      listAudioInputDevices(),
      listVideoInputDevices(),
      speakerSupported ? listAudioOutputDevices() : Promise.resolve([])
    ]);
    setAudioInputDevices(audioDevices);
    setVideoInputDevices(videoDevices);
    setAudioOutputDevices(outputDevices);
    if (!selectedAudioDeviceIdRef.current && audioDevices[0]?.deviceId) {
      selectedAudioDeviceIdRef.current = audioDevices[0].deviceId;
      setSelectedAudioDeviceId(audioDevices[0].deviceId);
    }
    if (!selectedVideoDeviceIdRef.current && videoDevices[0]?.deviceId) {
      selectedVideoDeviceIdRef.current = videoDevices[0].deviceId;
      setSelectedVideoDeviceId(videoDevices[0].deviceId);
    }
    setSelectedSpeakerDeviceId((prev) => prev || outputDevices[0]?.deviceId || "");
  }, [speakerSupported]);

  const switchSpeaker = useCallback((deviceId: string) => {
    if (!deviceId) return;
    setSelectedSpeakerDeviceId(deviceId);
  }, []);

  const stopQualityPolling = useCallback((runtime: PeerRuntime) => {
    if (runtime.qualityTimer !== null) {
      window.clearInterval(runtime.qualityTimer);
      runtime.qualityTimer = null;
    }
  }, []);

  const pollQuality = useCallback(
    async (socketId: string, runtime: PeerRuntime) => {
      try {
        const stats = await runtime.pc.getStats();
        let rttSeconds: number | null = null;
        let packetsLost = 0;
        let packetsReceived = 0;
        stats.forEach((report) => {
          if (report.type === "candidate-pair" && (report.state === "succeeded" || report.nominated)) {
            if (typeof report.currentRoundTripTime === "number") rttSeconds = report.currentRoundTripTime;
          }
          if (report.type === "inbound-rtp" && !report.isRemote) {
            packetsLost += report.packetsLost || 0;
            packetsReceived += report.packetsReceived || 0;
          }
        });

        let quality: ConnectionQuality = "unknown";
        if (rttSeconds !== null || packetsReceived > 0) {
          const lossRatio = packetsReceived > 0 ? packetsLost / (packetsReceived + packetsLost) : 0;
          const rtt = rttSeconds ?? 0;
          if (rtt < 0.15 && lossRatio < 0.02) quality = "good";
          else if (rtt < 0.4 && lossRatio < 0.08) quality = "fair";
          else quality = "poor";
        }
        patchPeer(socketId, { quality });
      } catch {
        // getStats can throw on a closing connection; ignore.
      }
    },
    [patchPeer]
  );

  const getOutgoingVideoTrack = useCallback((): MediaStreamTrack | null => {
    if (screenStreamRef.current) {
      return screenStreamRef.current.getVideoTracks()[0] || null;
    }
    return localStreamRef.current?.getVideoTracks()[0] || null;
  }, []);

  const createPeerConnection = useCallback(
    (member: RosterMember, isInitiator: boolean) => {
      const existing = peerRuntimesRef.current.get(member.socketId);
      if (existing && existing.pc.connectionState !== "closed") {
        return existing;
      }

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const runtime: PeerRuntime = {
        pc,
        isInitiator,
        makingOffer: false,
        iceQueue: [],
        qualityTimer: null,
        lastStats: null
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          onSignalRef.current(member.socketId, { type: "ice-candidate", candidate: event.candidate.toJSON() });
        }
      };

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (!stream) return;
        patchPeer(member.socketId, { stream });
      };

      pc.onconnectionstatechange = () => {
        patchPeer(member.socketId, { connectionState: pc.connectionState });
        if (pc.connectionState === "failed" && runtime.isInitiator) {
          void (async () => {
            try {
              runtime.makingOffer = true;
              await pc.setLocalDescription(await pc.createOffer({ iceRestart: true }));
              onSignalRef.current(member.socketId, { type: "offer", sdp: pc.localDescription || undefined });
            } catch {
              // Recovery attempt failed; participant can rejoin.
            } finally {
              runtime.makingOffer = false;
            }
          })();
        }
      };

      const audioTrack = localStreamRef.current?.getAudioTracks()[0];
      if (audioTrack) pc.addTrack(audioTrack, localStreamRef.current!);
      const videoTrack = getOutgoingVideoTrack();
      if (videoTrack) pc.addTrack(videoTrack, localStreamRef.current || new MediaStream([videoTrack]));

      peerRuntimesRef.current.set(member.socketId, runtime);
      setPeers((prev) => {
        if (prev.some((p) => p.socketId === member.socketId)) return prev;
        return [
          ...prev,
          {
            socketId: member.socketId,
            userId: member.userId,
            role: member.role,
            name: member.name,
            stream: null,
            connectionState: "new",
            muted: false,
            cameraOff: false,
            screenSharing: false,
            handRaised: false,
            quality: "unknown"
          }
        ];
      });

      runtime.qualityTimer = window.setInterval(() => void pollQuality(member.socketId, runtime), QUALITY_POLL_MS);

      return runtime;
    },
    [getOutgoingVideoTrack, patchPeer, pollQuality]
  );

  const createOfferFor = useCallback(async (socketId: string) => {
    const runtime = peerRuntimesRef.current.get(socketId);
    if (!runtime) return;
    runtime.makingOffer = true;
    try {
      const offer = await runtime.pc.createOffer();
      await runtime.pc.setLocalDescription(offer);
      onSignalRef.current(socketId, { type: "offer", sdp: offer });
    } finally {
      runtime.makingOffer = false;
    }
  }, []);

  const removePeer = useCallback(
    (socketId: string) => {
      const runtime = peerRuntimesRef.current.get(socketId);
      if (!runtime) return;
      stopQualityPolling(runtime);
      runtime.pc.close();
      peerRuntimesRef.current.delete(socketId);
      setPeers((prev) => prev.filter((p) => p.socketId !== socketId));
    },
    [stopQualityPolling]
  );

  const resetMesh = useCallback(() => {
    peerRuntimesRef.current.forEach((runtime) => {
      stopQualityPolling(runtime);
      runtime.pc.close();
    });
    peerRuntimesRef.current.clear();
    setPeers([]);
  }, [stopQualityPolling]);

  const syncRoster = useCallback(
    (participants: RosterMember[]) => {
      resetMesh();
      participants.forEach((member) => {
        createPeerConnection(member, true);
      });
      participants.forEach((member) => {
        void createOfferFor(member.socketId);
      });
    },
    [createOfferFor, createPeerConnection, resetMesh]
  );

  const addParticipant = useCallback(
    (member: RosterMember) => {
      if (peerRuntimesRef.current.has(member.socketId)) return;
      createPeerConnection(member, false);
    },
    [createPeerConnection]
  );

  const removeParticipant = useCallback(
    (socketId: string) => {
      removePeer(socketId);
    },
    [removePeer]
  );

  const flushIceQueue = useCallback(async (runtime: PeerRuntime) => {
    if (!runtime.pc.remoteDescription) return;
    const queued = [...runtime.iceQueue];
    runtime.iceQueue = [];
    for (const candidate of queued) {
      try {
        await runtime.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Ignore stale ICE candidates.
      }
    }
  }, []);

  const handleRemoteSignal = useCallback(
    async ({ fromSocketId, signal }: { fromSocketId: string; fromUserId: string; signal: WebRtcSignal }) => {
      let runtime = peerRuntimesRef.current.get(fromSocketId);
      if (!runtime) {
        // Signal arrived before the roster event told us about this peer
        // (rare race on join) — bootstrap a placeholder connection now.
        runtime = createPeerConnection(
          { socketId: fromSocketId, userId: "", role: "company", name: "Participant" },
          false
        );
      }

      if (signal.type === "offer" && signal.sdp) {
        if (runtime.makingOffer) return;
        await runtime.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        await flushIceQueue(runtime);
        const answer = await runtime.pc.createAnswer();
        await runtime.pc.setLocalDescription(answer);
        onSignalRef.current(fromSocketId, { type: "answer", sdp: answer });
        return;
      }

      if (signal.type === "answer" && signal.sdp) {
        await runtime.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        await flushIceQueue(runtime);
        return;
      }

      if (signal.type === "ice-candidate" && signal.candidate) {
        if (!runtime.pc.remoteDescription) {
          runtime.iceQueue.push(signal.candidate);
          return;
        }
        try {
          await runtime.pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch {
          // Ignore stale ICE candidates.
        }
      }
    },
    [createPeerConnection, flushIceQueue]
  );

  const startLocalMedia = useCallback(
    async (preferredAudioDeviceId?: string, preferredVideoDeviceId?: string) => {
      stopMediaStream(localStreamRef.current);
      localStreamRef.current = null;

      const result = await acquireInterviewMedia(
        preferredAudioDeviceId || selectedAudioDeviceIdRef.current || undefined,
        preferredVideoDeviceId || selectedVideoDeviceIdRef.current || undefined
      );
      setMediaMode(result.mode);

      if (!result.stream) {
        setMediaError(result.warning);
        setMicReady(false);
        setCameraOff(true);
        return null;
      }

      localStreamRef.current = result.stream;
      attachLocalStream(result.stream);
      setMicReady(result.stream.getAudioTracks().length > 0);
      setMediaError(result.warning);
      setCameraOff(result.mode === "audio-only" || result.stream.getVideoTracks().length === 0);

      const audioTrack = result.stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !mutedRef.current;
        const deviceId = audioTrack.getSettings().deviceId;
        if (deviceId) {
          selectedAudioDeviceIdRef.current = deviceId;
          setSelectedAudioDeviceId(deviceId);
        }
      }
      const videoTrack = result.stream.getVideoTracks()[0];
      if (videoTrack) {
        const deviceId = videoTrack.getSettings().deviceId;
        if (deviceId) {
          selectedVideoDeviceIdRef.current = deviceId;
          setSelectedVideoDeviceId(deviceId);
        }
      }

      await refreshDevices();
      return result.stream;
    },
    [attachLocalStream, refreshDevices]
  );

  useEffect(() => {
    if (!enabled) {
      resetMesh();
      return undefined;
    }

    if (preferredAudioDeviceId) selectedAudioDeviceIdRef.current = preferredAudioDeviceId;
    if (preferredVideoDeviceId) selectedVideoDeviceIdRef.current = preferredVideoDeviceId;

    let cancelled = false;

    void (async () => {
      await startLocalMedia(preferredAudioDeviceId, preferredVideoDeviceId);
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
      resetMesh();
      stopMediaStream(localStreamRef.current);
      stopMediaStream(screenStreamRef.current);
      localStreamRef.current = null;
      screenStreamRef.current = null;
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      setScreenSharing(false);
      setMicReady(false);
      setMediaMode("none");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !navigator.mediaDevices?.addEventListener) return undefined;
    const handleDeviceChange = () => void refreshDevices();
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
  }, [enabled, refreshDevices]);

  function toggleMute() {
    const stream = localStreamRef.current;
    if (!stream || stream.getAudioTracks().length === 0) return muted;
    const next = !muted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
    return next;
  }

  function toggleCamera() {
    const stream = localStreamRef.current;
    if (!stream || stream.getVideoTracks().length === 0) {
      setCameraOff(true);
      return true;
    }
    const next = !cameraOff;
    if (!screenStreamRef.current) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !next;
      });
    }
    setCameraOff(next);
    return next;
  }

  const replaceOutgoingVideoTrack = useCallback((track: MediaStreamTrack | null) => {
    peerRuntimesRef.current.forEach((runtime, socketId) => {
      const sender = runtime.pc.getSenders().find((item) => item.track?.kind === "video");
      if (sender) {
        void sender.replaceTrack(track);
        return;
      }
      if (!track) return;
      // No existing video sender (peer connection was created before a camera
      // track existed, e.g. audio-only recovery) — adding a brand new sender
      // requires a fresh offer/answer, unlike replaceTrack which needs none.
      runtime.pc.addTrack(track, localStreamRef.current || new MediaStream([track]));
      if (runtime.isInitiator) void createOfferFor(socketId);
    });
  }, [createOfferFor]);

  const stopScreenShare = useCallback(async () => {
    const screenStream = screenStreamRef.current;
    if (!screenStream) return;
    stopMediaStream(screenStream);
    screenStreamRef.current = null;
    setScreenSharing(false);

    const cameraTrack = localStreamRef.current?.getVideoTracks()[0] || null;
    replaceOutgoingVideoTrack(cameraTrack);
    if (localStreamRef.current) attachLocalStream(localStreamRef.current);
    if (cameraTrack) cameraTrack.enabled = !cameraOffRef.current;
  }, [attachLocalStream, replaceOutgoingVideoTrack]);

  const startScreenShare = useCallback(async () => {
    const result = await acquireScreenShareStream();
    if (!result.stream) {
      setScreenShareError(result.warning);
      return false;
    }

    screenStreamRef.current = result.stream;
    setScreenSharing(true);
    setScreenShareError(null);
    replaceOutgoingVideoTrack(result.stream.getVideoTracks()[0] || null);
    attachLocalStream(result.stream);

    const [track] = result.stream.getVideoTracks();
    if (track) {
      track.onended = () => {
        void stopScreenShare();
      };
    }
    return true;
  }, [attachLocalStream, replaceOutgoingVideoTrack, stopScreenShare]);

  const toggleScreenShare = useCallback(async () => {
    if (screenStreamRef.current) {
      await stopScreenShare();
      return false;
    }
    return startScreenShare();
  }, [startScreenShare, stopScreenShare]);

  const retryMediaAccess = useCallback(async () => {
    const stream = await startLocalMedia(selectedAudioDeviceIdRef.current || undefined, selectedVideoDeviceIdRef.current || undefined);
    if (!stream) return false;
    const audioTrack = stream.getAudioTracks()[0];
    const videoTrack = stream.getVideoTracks()[0];
    peerRuntimesRef.current.forEach((runtime) => {
      const audioSender = runtime.pc.getSenders().find((item) => item.track?.kind === "audio");
      if (audioSender && audioTrack) void audioSender.replaceTrack(audioTrack);
      if (!screenStreamRef.current) {
        const videoSender = runtime.pc.getSenders().find((item) => item.track?.kind === "video");
        if (videoSender && videoTrack) void videoSender.replaceTrack(videoTrack);
      }
    });
    return true;
  }, [startLocalMedia]);

  const switchAudioInput = useCallback(
    async (deviceId: string) => {
      if (!deviceId) return false;
      try {
        const nextStream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId } } });
        const nextAudioTrack = nextStream.getAudioTracks()[0];
        if (!nextAudioTrack) {
          stopMediaStream(nextStream);
          setMediaError("Selected microphone did not produce an audio track.");
          return false;
        }
        nextAudioTrack.enabled = !mutedRef.current;

        peerRuntimesRef.current.forEach((runtime) => {
          const sender = runtime.pc.getSenders().find((item) => item.track?.kind === "audio");
          if (sender) void sender.replaceTrack(nextAudioTrack);
        });

        const previous = localStreamRef.current;
        previous?.getAudioTracks().forEach((track) => track.stop());
        const merged = new MediaStream();
        merged.addTrack(nextAudioTrack);
        previous?.getVideoTracks().forEach((track) => merged.addTrack(track));
        localStreamRef.current = merged;
        if (!screenStreamRef.current) attachLocalStream(merged);

        selectedAudioDeviceIdRef.current = deviceId;
        setSelectedAudioDeviceId(deviceId);
        setMicReady(true);
        setMediaError(null);
        await refreshDevices();
        return true;
      } catch (error) {
        setMediaError(parseMediaError(error));
        return false;
      }
    },
    [attachLocalStream, refreshDevices]
  );

  const switchVideoInput = useCallback(
    async (deviceId: string) => {
      if (!deviceId) return false;
      try {
        const nextStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId }, width: { ideal: 960, max: 960 }, height: { ideal: 540, max: 540 } }
        });
        const nextVideoTrack = nextStream.getVideoTracks()[0];
        if (!nextVideoTrack) {
          stopMediaStream(nextStream);
          setMediaError("Selected camera did not produce a video track.");
          return false;
        }
        nextVideoTrack.enabled = !cameraOffRef.current;

        const previous = localStreamRef.current;
        previous?.getVideoTracks().forEach((track) => track.stop());
        const merged = new MediaStream();
        previous?.getAudioTracks().forEach((track) => merged.addTrack(track));
        merged.addTrack(nextVideoTrack);
        localStreamRef.current = merged;

        if (!screenStreamRef.current) {
          replaceOutgoingVideoTrack(nextVideoTrack);
          attachLocalStream(merged);
        }

        selectedVideoDeviceIdRef.current = deviceId;
        setSelectedVideoDeviceId(deviceId);
        await refreshDevices();
        return true;
      } catch (error) {
        setMediaError(parseMediaError(error));
        return false;
      }
    },
    [attachLocalStream, refreshDevices, replaceOutgoingVideoTrack]
  );

  return {
    localVideoRef,
    peers,
    muted,
    cameraOff,
    mediaError,
    mediaMode,
    micReady,
    audioInputDevices,
    videoInputDevices,
    audioOutputDevices,
    selectedAudioDeviceId,
    selectedVideoDeviceId,
    selectedSpeakerDeviceId,
    speakerSupported,
    screenSharing,
    screenShareError,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    switchAudioInput,
    switchVideoInput,
    switchSpeaker,
    retryMediaAccess,
    refreshDevices,
    startLocalMedia,
    syncRoster,
    addParticipant,
    removeParticipant,
    handleRemoteSignal,
    patchPeer,
    resetMesh
  };
}
