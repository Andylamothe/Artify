import { ArtworkConfig, TrackingStatus } from "@/types/ar";
import { useTrackingStatusLabel } from "@/hooks/ar/useTrackingStatus";
import { PerformanceControls } from "@/components/ar/PerformanceControls";

interface Props {
  activeArtwork: ArtworkConfig | null;
  trackingStatus: TrackingStatus;
  muted: boolean;
  onToggleMuted: () => void;
  lowPower: boolean;
  setLowPower: (value: boolean) => void;
  audioError: string | null;
  requiresManualPlay: boolean;
  onManualPlay: () => void;
  voiceAssistantEnabled: boolean;
  onToggleVoiceAssistant: () => void;
}

export function ArtworkOverlay({
  activeArtwork,
  trackingStatus,
  muted,
  onToggleMuted,
  lowPower,
  setLowPower,
  audioError,
  requiresManualPlay,
  onManualPlay,
  voiceAssistantEnabled,
  onToggleVoiceAssistant,
}: Props) {
  const statusLabel = useTrackingStatusLabel(trackingStatus);
  const scanHint =
    trackingStatus === "starting"
      ? "Waiting for camera permission and AR engine startup."
      : trackingStatus === "scanning"
        ? "Camera is active. Point it at a compiled MindAR target."
        : trackingStatus === "lost"
          ? "Target lost. Move the camera back to the artwork."
          : "Point the camera at an image compiled into artworks.mind.";

  return (
    <div className="overlay-minimal">
      <div className="overlay-minimal-top">
        <div className="status-badge">{statusLabel}</div>
        <div className="overlay-controls-row">
          <button type="button" className="chip" onClick={onToggleMuted}>
            {muted ? "Unmute" : "Mute"}
          </button>
          <button
            type="button"
            className={`chip ${voiceAssistantEnabled ? "chip-active" : ""}`}
            onClick={onToggleVoiceAssistant}
            aria-pressed={voiceAssistantEnabled}
          >
            Voice Assistant
          </button>
          <PerformanceControls lowPower={lowPower} setLowPower={setLowPower} />
          {requiresManualPlay ? (
            <button type="button" className="chip warning" onClick={onManualPlay}>
              Play audio
            </button>
          ) : null}
        </div>
      </div>

      {!activeArtwork ? (
        <div className="overlay-minimal-bottom">
          <p className="overlay-title">Scan artwork target</p>
          <p className="overlay-summary">{scanHint}</p>
        </div>
      ) : null}

      {audioError ? <p className="audio-error">{audioError}</p> : null}
    </div>
  );
}
