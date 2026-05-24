import { ArtworkConfig } from "@/types/ar";
import { useEffect, useState } from "react";
import { registerStarryNightExperience } from "./starry-night/registerStarryNightExperience";

interface Props {
  artwork: ArtworkConfig;
  active: boolean;
  lowPower: boolean;
}

export function StarryNightScene({ artwork, active, lowPower }: Props) {
  const [experienceReady, setExperienceReady] = useState(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let retryId = 0;

    const register = () => {
      if (cancelled) return;
      const ready = registerStarryNightExperience();
      setExperienceReady(ready);
      if (!ready) {
        retryId = window.setTimeout(register, 100);
      }
    };

    register();
    return () => {
      cancelled = true;
      window.clearTimeout(retryId);
    };
  }, [active]);

  if (!active) return null;

  if (experienceReady) {
    return (
      <a-entity
        starry-night-experience={`active: ${active}; lowPower: ${lowPower}; targetAspect: 1.333`}
      />
    );
  }

  const count = lowPower ? artwork.effects.lowPowerParticleCount : artwork.effects.particleCount;

  return (
    <>
      <a-circle
        color={artwork.colors.primary}
        radius="0.54"
        position="0 0 0.01"
        material="transparent: true; opacity: 0.36"
        animation="property: rotation; to: 0 0 -360; loop: true; dur: 18000; easing: linear"
      />
      <a-ring
        color={artwork.colors.accent}
        radius-inner="0.24"
        radius-outer="0.27"
        position="0 0 0.02"
        material="transparent: true; opacity: 0.45"
        animation="property: rotation; to: 0 0 360; loop: true; dur: 7500; easing: linear"
      />
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / Math.max(count, 1)) * Math.PI * 2;
        const radius = 0.18 + (i % 7) * 0.05;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const z = 0.04 + (i % 4) * 0.005;
        const color = i % 3 === 0 ? artwork.colors.accent : artwork.colors.secondary;
        return (
          <a-sphere
            key={`sn-star-${i}`}
            position={`${x} ${y} ${z}`}
            radius="0.0065"
            color={color}
            material="transparent: true; opacity: 0.72"
            animation={`property: rotation; to: 0 0 360; loop: true; dur: ${2600 + (i % 10) * 240}; easing: linear`}
          />
        );
      })}
    </>
  );
}
