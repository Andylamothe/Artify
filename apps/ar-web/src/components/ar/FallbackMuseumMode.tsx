import { ArtworkConfig } from "@/types/ar";

interface Props {
  activeArtwork: ArtworkConfig | null;
  artworks: ArtworkConfig[];
  onSelectArtwork: (artwork: ArtworkConfig) => void;
}

export function FallbackMuseumMode({ activeArtwork, artworks, onSelectArtwork }: Props) {
  const selected = activeArtwork ?? artworks[0];
  if (!selected) return null;

  return (
    <div className="fallback-root">
      <div className={`fallback-canvas fallback-${selected.arSceneType}`}>
        <div className="fallback-pulse" />
        <div className="fallback-label">Preview mode</div>
      </div>
      <div className="fallback-selector">
        {artworks.map((artwork) => (
          <button
            key={artwork.id}
            type="button"
            className={`chip ${selected.id === artwork.id ? "chip-active" : ""}`}
            onClick={() => onSelectArtwork(artwork)}
          >
            {artwork.title}
          </button>
        ))}
      </div>
    </div>
  );
}
