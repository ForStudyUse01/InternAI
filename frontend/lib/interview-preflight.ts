import { isSpeakerSelectionSupported } from "@/lib/interview-audio-utils";

export type CompatibilityCheck = {
  key: string;
  label: string;
  supported: boolean;
  critical: boolean;
};

export type CompatibilityReport = {
  checks: CompatibilityCheck[];
  blocking: CompatibilityCheck[];
  warnings: CompatibilityCheck[];
};

export function checkBrowserCompatibility(): CompatibilityReport {
  const checks: CompatibilityCheck[] = [
    {
      key: "webrtc",
      label: "Video calling (WebRTC)",
      supported: typeof window !== "undefined" && typeof window.RTCPeerConnection === "function",
      critical: true
    },
    {
      key: "camera-mic",
      label: "Camera and microphone access",
      supported: typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia),
      critical: true
    },
    {
      key: "screen-share",
      label: "Screen sharing",
      supported: typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getDisplayMedia),
      critical: false
    },
    {
      key: "speaker-selection",
      label: "Speaker selection",
      supported: isSpeakerSelectionSupported(),
      critical: false
    }
  ];

  return {
    checks,
    blocking: checks.filter((check) => check.critical && !check.supported),
    warnings: checks.filter((check) => !check.critical && !check.supported)
  };
}

export type NetworkCheckResult = {
  status: "good" | "fair" | "poor" | "offline" | "unknown";
  message: string;
  latencyMs: number | null;
};

async function measureLatency(): Promise<number | null> {
  if (typeof window === "undefined" || !window.fetch) return null;
  const started = performance.now();
  try {
    await fetch("/favicon.ico", { method: "HEAD", cache: "no-store" });
    return Math.round(performance.now() - started);
  } catch {
    return null;
  }
}

export async function checkNetworkQuality(): Promise<NetworkCheckResult> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { status: "offline", message: "No internet connection detected.", latencyMs: null };
  }

  const connection = (navigator as unknown as {
    connection?: { effectiveType?: string; downlink?: number; rtt?: number };
  })?.connection;

  const latencyMs = await measureLatency();

  if (connection?.effectiveType) {
    if (connection.effectiveType === "slow-2g" || connection.effectiveType === "2g") {
      return { status: "poor", message: "Your connection appears slow. Video quality may suffer.", latencyMs };
    }
    if (connection.effectiveType === "3g") {
      return { status: "fair", message: "Your connection is moderate. Video quality may be reduced.", latencyMs };
    }
  }

  if (latencyMs !== null) {
    if (latencyMs > 600) return { status: "poor", message: "High network latency detected. Video quality may suffer.", latencyMs };
    if (latencyMs > 250) return { status: "fair", message: "Moderate network latency detected.", latencyMs };
    return { status: "good", message: "Network connection looks good.", latencyMs };
  }

  return { status: "unknown", message: "Unable to measure network quality.", latencyMs: null };
}
