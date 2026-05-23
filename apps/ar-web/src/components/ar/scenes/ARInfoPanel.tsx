import { ArtworkConfig } from "@/types/ar";

interface Props {
  artwork: ArtworkConfig;
  showDetails: boolean;
  muted: boolean;
  onToggleDetails: () => void;
  onToggleMuted: () => void;
}

export function ARInfoPanel({
  artwork,
  showDetails,
  muted,
  onToggleDetails,
  onToggleMuted,
}: Props) {
  const body = showDetails ? artwork.historyText : artwork.shortSummary;

  return (
    <a-entity position="0 -0.66 0.1">
      <a-plane
        width="1.12"
        height="0.4"
        color="#101820"
        material="transparent: true; opacity: 0.76"
        position="0 0 0"
      />
      <a-plane
        width="1.12"
        height="0.015"
        color={artwork.colors.accent}
        position="0 0.2 0.006"
        material="transparent: true; opacity: 0.95"
      />
      <a-text
        value={artwork.title}
        color="#ffffff"
        align="center"
        width="1.05"
        position="0 0.135 0.012"
        scale="0.32 0.32 0.32"
      />
      <a-text
        value={`${artwork.artist} - ${artwork.year}`}
        color="#d9e2ec"
        align="center"
        width="1.05"
        position="0 0.075 0.012"
        scale="0.21 0.21 0.21"
      />
      <a-text
        value={body}
        color="#ffffff"
        align="center"
        width="1.02"
        wrap-count="42"
        position="0 -0.025 0.012"
        scale="0.18 0.18 0.18"
      />

      <a-entity position="-0.28 -0.155 0.018">
        <a-plane
          class="ar-clickable"
          width="0.32"
          height="0.075"
          color={artwork.colors.primary}
          material="transparent: true; opacity: 0.96"
          onClick={onToggleDetails}
        />
        <a-text
          value={showDetails ? "Summary" : "Details"}
          color="#ffffff"
          align="center"
          width="0.7"
          position="0 -0.012 0.006"
          scale="0.16 0.16 0.16"
        />
      </a-entity>

      <a-entity position="0.28 -0.155 0.018">
        <a-plane
          class="ar-clickable"
          width="0.32"
          height="0.075"
          color={muted ? "#6b7280" : artwork.colors.accent}
          material="transparent: true; opacity: 0.96"
          onClick={onToggleMuted}
        />
        <a-text
          value={muted ? "Audio Off" : "Audio On"}
          color="#101820"
          align="center"
          width="0.78"
          position="0 -0.012 0.006"
          scale="0.15 0.15 0.15"
        />
      </a-entity>
    </a-entity>
  );
}
