"use client";

import { Mic, MicOff, RefreshCw } from "lucide-react";
import type { AudioInputDevice, MediaAccessMode } from "@/lib/interview-audio-utils";
import { Button } from "@/components/ui/button";

type InterviewAudioControlsProps = {
  muted: boolean;
  mediaError: string | null;
  mediaMode: MediaAccessMode;
  audioInputDevices: AudioInputDevice[];
  videoInputDevices?: AudioInputDevice[];
  audioOutputDevices?: AudioInputDevice[];
  selectedAudioDeviceId: string;
  selectedVideoDeviceId?: string;
  selectedSpeakerDeviceId?: string;
  speakerSupported?: boolean;
  micReady: boolean;
  onRetryMedia: () => void;
  onSelectAudioDevice: (deviceId: string) => void;
  onSelectVideoDevice?: (deviceId: string) => void;
  onSelectSpeakerDevice?: (deviceId: string) => void;
};

export function InterviewAudioControls({
  muted,
  mediaError,
  mediaMode,
  audioInputDevices,
  videoInputDevices = [],
  audioOutputDevices = [],
  selectedAudioDeviceId,
  selectedVideoDeviceId = "",
  selectedSpeakerDeviceId = "",
  speakerSupported = false,
  micReady,
  onRetryMedia,
  onSelectAudioDevice,
  onSelectVideoDevice,
  onSelectSpeakerDevice
}: InterviewAudioControlsProps) {
  return (
    <div className="mx-auto mt-3 max-w-2xl space-y-2 px-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span
          role="status"
          aria-live="polite"
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            !micReady
              ? "bg-[var(--ds-warning-bg)] text-[var(--ds-warning)]"
              : muted
                ? "bg-[var(--ds-danger-bg)] text-[var(--ds-danger)]"
                : "bg-[var(--ds-success-bg)] text-[var(--ds-success)]"
          }`}
        >
          {!micReady ? <MicOff className="h-3 w-3" /> : muted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
          {!micReady ? "Microphone unavailable" : muted ? "You are muted" : "Microphone live"}
        </span>
        {mediaMode === "audio-only" ? (
          <span className="rounded-full bg-[var(--ds-info-bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--ds-info)]">Voice-only mode</span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {audioInputDevices.length > 0 ? (
          <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ds-muted)]">
              Microphone
            </span>
            <select
              className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-1.5 text-xs text-[var(--ds-text)]"
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

        {videoInputDevices.length > 0 && onSelectVideoDevice ? (
          <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ds-muted)]">
              Camera
            </span>
            <select
              className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-1.5 text-xs text-[var(--ds-text)]"
              value={selectedVideoDeviceId}
              onChange={(event) => onSelectVideoDevice(event.target.value)}
            >
              {videoInputDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {speakerSupported && audioOutputDevices.length > 0 && onSelectSpeakerDevice ? (
          <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ds-muted)]">
              Speaker
            </span>
            <select
              className="rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-1.5 text-xs text-[var(--ds-text)]"
              value={selectedSpeakerDeviceId}
              onChange={(event) => onSelectSpeakerDevice(event.target.value)}
            >
              {audioOutputDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </label>
        ) : !speakerSupported ? (
          <span className="text-[11px] text-[var(--ds-muted)]">Speaker selection not supported in this browser</span>
        ) : null}
      </div>

      {mediaError ? (
        <div
          role="alert"
          className="flex flex-col items-center gap-2 rounded-xl border border-[var(--ds-warning)] bg-[var(--ds-warning-bg)] px-3 py-2 text-center"
        >
          <p className="text-xs text-[var(--ds-warning)]">{mediaError}</p>
          <Button type="button" size="sm" variant="secondary" onClick={onRetryMedia}>
            <RefreshCw className="h-3.5 w-3.5" />
            Retry microphone
          </Button>
        </div>
      ) : null}
    </div>
  );
}
