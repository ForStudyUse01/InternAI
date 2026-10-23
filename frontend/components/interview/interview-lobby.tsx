"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, CameraOff, Mic, MicOff, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AudioInputDevice, MediaAccessMode } from "@/lib/interview-audio-utils";
import { checkBrowserCompatibility, checkNetworkQuality, type NetworkCheckResult } from "@/lib/interview-preflight";

type InterviewLobbyProps = {
  title: string;
  subtitle: string;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  muted: boolean;
  cameraOff: boolean;
  mediaError: string | null;
  mediaMode: MediaAccessMode;
  micReady: boolean;
  audioInputDevices: AudioInputDevice[];
  videoInputDevices: AudioInputDevice[];
  selectedAudioDeviceId: string;
  selectedVideoDeviceId: string;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onSelectAudioDevice: (deviceId: string) => void;
  onSelectVideoDevice: (deviceId: string) => void;
  onRetryMedia: () => void;
  onJoin: () => void;
};

function useMicLevel(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let currentStream: MediaStream | null = null;
    let rafId = 0;
    let cancelled = false;

    function tick() {
      if (cancelled) return;
      const stream = (videoRef.current?.srcObject as MediaStream | null) || null;
      if (stream !== currentStream) {
        source?.disconnect();
        source = null;
        currentStream = stream;
        if (stream && stream.getAudioTracks().length > 0) {
          try {
            audioCtx = audioCtx || new AudioContext();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
          } catch {
            analyser = null;
          }
        } else {
          analyser = null;
        }
      }

      if (analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((sum, value) => sum + value, 0) / data.length;
        setLevel(Math.min(1, avg / 110));
      } else {
        setLevel(0);
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      source?.disconnect();
      void audioCtx?.close().catch(() => undefined);
    };
  }, [videoRef]);

  return level;
}

export function InterviewLobby({
  title,
  subtitle,
  localVideoRef,
  muted,
  cameraOff,
  mediaError,
  mediaMode,
  micReady,
  audioInputDevices,
  videoInputDevices,
  selectedAudioDeviceId,
  selectedVideoDeviceId,
  onToggleMute,
  onToggleCamera,
  onSelectAudioDevice,
  onSelectVideoDevice,
  onRetryMedia,
  onJoin
}: InterviewLobbyProps) {
  const micLevel = useMicLevel(localVideoRef);
  const bars = useRef(Array.from({ length: 10 }, (_, index) => index)).current;
  const compatibility = useRef(checkBrowserCompatibility()).current;
  const [network, setNetwork] = useState<NetworkCheckResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    void checkNetworkQuality().then((result) => {
      if (!cancelled) setNetwork(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--ds-bg)] px-4 py-8 text-[var(--ds-text)]">
      <div className="w-full max-w-3xl rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)] p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--ds-muted)]">Device check</p>
        <h1 className="mt-1 text-xl font-semibold text-[var(--ds-text)]">{title}</h1>
        <p className="mt-1 text-sm text-[var(--ds-muted)]">{subtitle}</p>

        {compatibility.blocking.length > 0 ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[var(--ds-danger)] bg-[var(--ds-danger-bg)] px-3 py-2 text-xs text-[var(--ds-danger)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Your browser does not support: {compatibility.blocking.map((c) => c.label).join(", ")}. Video calling may not
              work. Try Chrome, Edge, or Firefox.
            </p>
          </div>
        ) : null}
        {compatibility.warnings.length > 0 ? (
          <div className="mt-2 flex items-start gap-2 rounded-xl border border-[var(--ds-warning)] bg-[var(--ds-warning-bg)] px-3 py-2 text-xs text-[var(--ds-warning)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Not supported in this browser: {compatibility.warnings.map((c) => c.label).join(", ")}.</p>
          </div>
        ) : null}
        {network && network.status !== "good" && network.status !== "unknown" ? (
          <div
            className={`mt-2 flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${
              network.status === "offline"
                ? "border-[var(--ds-danger)] bg-[var(--ds-danger-bg)] text-[var(--ds-danger)]"
                : "border-[var(--ds-warning)] bg-[var(--ds-warning-bg)] text-[var(--ds-warning)]"
            }`}
          >
            {network.status === "offline" ? (
              <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <Wifi className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <p>{network.message} You can continue anyway.</p>
          </div>
        ) : null}

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="relative overflow-hidden rounded-2xl border border-[var(--ds-border)] bg-black">
            <video ref={localVideoRef} autoPlay playsInline muted className="aspect-video w-full object-cover" />
            {cameraOff || mediaMode === "audio-only" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/85">
                <p className="text-sm text-white/70">{mediaMode === "audio-only" ? "Voice-only mode" : "Camera off"}</p>
              </div>
            ) : null}
            <div className="absolute bottom-3 left-3 flex gap-2">
              <button
                type="button"
                onClick={onToggleMute}
                disabled={!micReady}
                aria-label={muted ? "Unmute microphone" : "Mute microphone"}
                className={`flex h-10 w-10 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-50 ${
                  muted ? "bg-[var(--ds-danger)] text-[var(--ds-on-danger)]" : "bg-black/60 text-white"
                }`}
              >
                {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={onToggleCamera}
                aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  cameraOff ? "bg-[var(--ds-danger)] text-[var(--ds-on-danger)]" : "bg-black/60 text-white"
                }`}
              >
                {cameraOff ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ds-muted)]">Microphone level</p>
              <div className="flex h-6 items-end gap-1">
                {bars.map((index) => {
                  const active = micLevel * bars.length > index;
                  return (
                    <span
                      key={index}
                      className={`w-full rounded-sm transition-colors ${active ? "bg-[var(--ds-success)]" : "bg-[var(--ds-surface-raised)]"}`}
                      style={{ height: `${20 + index * 6}%` }}
                    />
                  );
                })}
              </div>
            </div>

            {audioInputDevices.length > 0 ? (
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-semibold uppercase tracking-[0.1em] text-[var(--ds-muted)]">Microphone</span>
                <select
                  className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-input)] px-3 py-2 text-sm text-[var(--ds-text)]"
                  value={selectedAudioDeviceId}
                  onChange={(event) => onSelectAudioDevice(event.target.value)}
                  disabled={!micReady}
                >
                  {audioInputDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {videoInputDevices.length > 0 ? (
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-semibold uppercase tracking-[0.1em] text-[var(--ds-muted)]">Camera</span>
                <select
                  className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-input)] px-3 py-2 text-sm text-[var(--ds-text)]"
                  value={selectedVideoDeviceId}
                  onChange={(event) => onSelectVideoDevice(event.target.value)}
                  disabled={cameraOff && mediaMode === "audio-only"}
                >
                  {videoInputDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {mediaError ? (
              <div className="rounded-xl border border-[var(--ds-warning)] bg-[var(--ds-warning-bg)] px-3 py-2 text-xs text-[var(--ds-warning)]">
                <p>{mediaError}</p>
                <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={onRetryMedia}>
                  Retry
                </Button>
              </div>
            ) : null}

            <Button type="button" className="mt-auto" onClick={onJoin}>
              Join interview
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
