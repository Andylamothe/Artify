import { ArtworkConfig } from "@/types/ar";

interface Props {
  artwork: ArtworkConfig;
  active: boolean;
  lowPower: boolean;
}

export function MonaLisaScene({ artwork, active, lowPower }: Props) {
  if (!active) return null;

  const count = lowPower ? artwork.effects.lowPowerParticleCount : artwork.effects.particleCount;

  return (
    <>
      <a-ring
        color={artwork.colors.primary}
        radius-inner="0.34"
        radius-outer="0.43"
        position="0 0 0.02"
        material="opacity: 0.55; transparent: true;"
        animation="property: rotation; to: 0 0 360; loop: true; dur: 16000; easing: linear"
      />
      <a-plane
        color={artwork.colors.secondary}
        width="1.08"
        height="0.74"
        position="0 0 0.01"
        material="transparent: true; opacity: 0.16"
        animation="property: material.opacity; dir: alternate; to: 0.28; loop: true; dur: 2200; easing: easeInOutSine"
      />
      {Array.from({ length: count }).map((_, i) => {
        const x = ((i % 10) - 5) * 0.08;
        const y = (Math.floor(i / 10) % 10) * 0.06 - 0.3;
        const z = 0.04 + (i % 5) * 0.003;
        return (
          <a-sphere
            key={`ml-particle-${i}`}
            position={`${x} ${y} ${z}`}
            radius="0.008"
            color={artwork.colors.accent}
            material="transparent: true; opacity: 0.5"
            animation={`property: position; to: ${x + 0.02} ${y + 0.12} ${z}; dur: ${2200 + (i % 8) * 200}; loop: true; dir: alternate`}
          />
        );
      })}
    </>
  );
}
