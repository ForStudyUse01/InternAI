export type AudioInputDevice = {
  deviceId: string;
  label: string;
};

export type MediaAccessMode = "av" | "audio-only" | "none";

export function parseMediaError(error: unknown): string {
  const err = error as DOMException & { name?: string; message?: string };
  const name = err?.name || "";

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Microphone access was denied. Allow microphone permission in your browser settings, then retry.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No microphone was found. Connect a microphone or choose another input device.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Microphone is in use by another application. Close other apps using the mic and retry.";
  }
  if (name === "OverconstrainedError") {
    return "Selected microphone is unavailable. Choose a different input device.";
  }
  if (name === "SecurityError") {
    return "Microphone access requires a secure connection (HTTPS or localhost).";
  }

  return err?.message || "Unable to access microphone.";
}

export async function listAudioInputDevices(): Promise<AudioInputDevice[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];

  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((device) => device.kind === "audioinput" && device.deviceId)
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `Microphone ${index + 1}`
    }));
}

export async function listVideoInputDevices(): Promise<AudioInputDevice[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];

  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((device) => device.kind === "videoinput" && device.deviceId)
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `Camera ${index + 1}`
    }));
}

export async function listAudioOutputDevices(): Promise<AudioInputDevice[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];

  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((device) => device.kind === "audiooutput" && device.deviceId)
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `Speaker ${index + 1}`
    }));
}

// setSinkId is missing on Firefox and Safari — feature-detect on the prototype
// rather than assuming Chromium-only support silently breaks those browsers.
export function isSpeakerSelectionSupported(): boolean {
  return typeof window !== "undefined" && typeof (HTMLMediaElement.prototype as unknown as { setSinkId?: unknown }).setSinkId === "function";
}

export async function applySinkId(element: HTMLMediaElement | null, deviceId: string): Promise<boolean> {
  if (!element || !deviceId || !isSpeakerSelectionSupported()) return false;
  try {
    await (element as unknown as { setSinkId: (id: string) => Promise<void> }).setSinkId(deviceId);
    return true;
  } catch {
    return false;
  }
}

// Caps resolution rather than requesting the camera's max — a mesh call with
// up to 4 participants means each peer uploads up to 3 outbound streams, so
// keeping the source resolution modest matters more here than in a 1:1 call.
const MESH_VIDEO_CONSTRAINTS: MediaTrackConstraints = { width: { ideal: 960, max: 960 }, height: { ideal: 540, max: 540 } };

export async function acquireInterviewMedia(preferredAudioDeviceId?: string, preferredVideoDeviceId?: string) {
  const audio: boolean | MediaTrackConstraints = preferredAudioDeviceId
    ? { deviceId: { exact: preferredAudioDeviceId } }
    : true;
  const video: MediaTrackConstraints = preferredVideoDeviceId
    ? { ...MESH_VIDEO_CONSTRAINTS, deviceId: { exact: preferredVideoDeviceId } }
    : MESH_VIDEO_CONSTRAINTS;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
    return { stream, mode: "av" as MediaAccessMode, warning: null as string | null };
  } catch (videoError) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio });
      return {
        stream,
        mode: "audio-only" as MediaAccessMode,
        warning: `${parseMediaError(videoError)} Voice-only mode is active.`
      };
    } catch (audioError) {
      return {
        stream: null,
        mode: "none" as MediaAccessMode,
        warning: parseMediaError(audioError)
      };
    }
  }
}

export function stopMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function parseScreenShareError(error: unknown): string {
  const err = error as DOMException & { name?: string; message?: string };
  const name = err?.name || "";

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Screen share permission was denied.";
  }
  if (name === "NotFoundError") {
    return "No screen or window was available to share.";
  }
  return err?.message || "Unable to start screen share.";
}

export async function acquireScreenShareStream(): Promise<{ stream: MediaStream | null; warning: string | null }> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    return { stream: null, warning: "Screen sharing is not supported in this browser." };
  }
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false
    });
    return { stream, warning: null };
  } catch (error) {
    return { stream: null, warning: parseScreenShareError(error) };
  }
}
