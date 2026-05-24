import { ArtworkConfig } from "@/types/ar";

interface Props {
  artwork: ArtworkConfig;
  active: boolean;
  lowPower: boolean;
}

export function ScreamScene({ artwork, active, lowPower }: Props) {
  if (!active) return null;

  const count = lowPower ? artwork.effects.lowPowerParticleCount : artwork.effects.particleCount;
  const pulseDur = lowPower ? 1600 : 900;
  const jitterDur = lowPower ? 1800 : 900;

  return (
    <>
      <a-plane
        width="1.12"
        height="0.76"
        position="0 0 0.01"
        color={artwork.colors.primary}
        material="transparent: true; opacity: 0.34"
        animation={`property: scale; to: 1.06 1.06 1; loop: true; dir: alternate; dur: ${pulseDur}; easing: easeInOutSine`}
      />
      <a-ring
        color={artwork.colors.accent}
        radius-inner="0.33"
        radius-outer="0.37"
        position="0 0 0.02"
        material="transparent: true; opacity: 0.45"
        animation={`property: material.opacity; to: 0.15; loop: true; dir: alternate; dur: ${pulseDur}; easing: easeInOutSine`}
      />
      {Array.from({ length: count }).map((_, i) => {
        const x = ((i % 12) - 6) * 0.075;
        const y = (Math.floor(i / 12) % 10) * 0.06 - 0.3;
        const z = 0.035 + (i % 6) * 0.004;
        return (
          <a-box
            key={`sc-particle-${i}`}
            depth="0.005"
            height="0.01"
            width="0.01"
            color={i % 2 === 0 ? artwork.colors.secondary : artwork.colors.accent}
            material="transparent: true; opacity: 0.52"
            position={`${x} ${y} ${z}`}
            animation={`property: position; to: ${x + 0.02} ${y + 0.04} ${z}; loop: true; dir: alternate; dur: ${jitterDur + (i % 9) * 110}`}
          />
        );
      })}
    </>
  );
}
